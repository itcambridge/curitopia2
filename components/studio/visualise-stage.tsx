'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Bot, Check, ChevronLeft, ChevronRight, ImagePlus, Save } from 'lucide-react'
import { StageMark } from '@/components/studio/stage-mark'
import { Eyebrow, Notice, iconButton, iconCoralButton, panelClass, questionListClass, questionListItemClass, quietButton } from '@/components/studio/studio-ui'
import type { ImageSetResult } from '@/lib/providers/types'
import { withBasePath } from '@/lib/paths'
import { titleProblem } from '@/lib/questions/title'
import { acceptConsidered, applyImageResult, draftFor, draftIsCurrent, questionPlace, rejectCandidate, restoreCandidate, saveConcept, selectCandidate } from '@/lib/questions/workspace'
import type { QuestionRecord, StoredCandidate, Workspace } from '@/lib/questions/types'

export function VisualiseStage({ workspace, curiosityId, saving, onChange }: { workspace: Workspace; curiosityId: string; saving: boolean; onChange: (next: Workspace | ((current: Workspace) => Workspace)) => void }) {
  const choices = workspace.questions.filter((item) => !item.mergedIntoId && (item.disposition === 'retained' || item.disposition === 'gathered'))
  const selected = choices.find((item) => item.id === workspace.focusQuestionId) ?? null
  const listRef = useRef<HTMLUListElement>(null)
  const selectedId = selected?.id ?? null

  useEffect(() => {
    const list = listRef.current
    if (!list || !selectedId) return
    const item = list.querySelector<HTMLElement>(`[data-question-id="${CSS.escape(selectedId)}"]`)
    if (!item) return
    const listRect = list.getBoundingClientRect()
    const itemRect = item.getBoundingClientRect()
    let deltaX = 0
    let deltaY = 0
    if (itemRect.left < listRect.left - 1) deltaX = itemRect.left - listRect.left
    else if (itemRect.right > listRect.right + 1) deltaX = itemRect.right - listRect.right
    if (itemRect.top < listRect.top - 1) deltaY = itemRect.top - listRect.top
    else if (itemRect.bottom > listRect.bottom + 1) deltaY = itemRect.bottom - listRect.bottom
    if (deltaX !== 0 || deltaY !== 0) list.scrollBy({ left: deltaX, top: deltaY, behavior: 'smooth' })
  }, [selectedId])

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header>
        <h2 className="font-serif text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">One question, four interpretations.</h2>
        <StageMark stage="visualise" placement="content" />
      </header>
      <div className="grid min-h-0 min-w-0 items-start gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <ul
          ref={listRef}
          aria-label="Questions to visualise"
          className={`${questionListClass} xl:sticky xl:top-10`}
        >
          {choices.length === 0 && <li className={`${panelClass} w-full shrink-0 text-sm text-studio-body`}>Gather or retain a question before asking for an image.</li>}
          {choices.map((item) => {
            const current = item.id === selected?.id
            return (
              <li key={item.id} data-question-id={item.id} className={questionListItemClass}>
                <button
                  type="button"
                  onClick={() => onChange({ ...workspace, focusQuestionId: item.id, focusConceptId: null })}
                  aria-pressed={current}
                  className={`w-full rounded-[24px] border p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral ${current ? 'border-studio-coral bg-studio-paper shadow-studio-stamp-coral' : 'border-studio-line bg-studio-paper'}`}
                >
                  <Eyebrow>{questionPlace(workspace, item)}</Eyebrow>
                  <span className="mt-2 block font-serif text-xl leading-snug">{item.originalText}</span>
                </button>
              </li>
            )
          })}
        </ul>
        {selected ? <QuestionImages key={selected.id} question={selected} curiosityId={curiosityId} saving={saving} workspace={workspace} onChange={onChange} /> : null}
      </div>
    </div>
  )
}

function QuestionImages({
  question,
  curiosityId,
  saving,
  workspace,
  onChange,
}: {
  question: QuestionRecord
  curiosityId: string
  saving: boolean
  workspace: Workspace
  onChange: (next: Workspace | ((current: Workspace) => Workspace)) => void
}) {
  const [wording, setWording] = useState(question.consideredText ?? '')
  const [title, setTitle] = useState('')
  const [generated, setGenerated] = useState(false)
  const [busy, setBusy] = useState<'consider' | 'images' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const request = useRef(0)
  const imageAbort = useRef<AbortController | null>(null)
  const draft = draftFor(workspace, question.id)
  const current = draftIsCurrent(question, draft)
  const visible = draft?.candidates.filter((candidate) => !draft.rejectedIds.includes(candidate.id)) ?? []
  const hidden = draft?.candidates.filter((candidate) => draft.rejectedIds.includes(candidate.id)) ?? []
  const wordingSaved = wording.trim() === (question.consideredText ?? '')
  const selected = draft?.candidates.find((candidate) => candidate.id === draft.selectedId && !draft.rejectedIds.includes(candidate.id)) ?? null
  const titleIssue = title.trim() ? titleProblem(title) : null
  const canSave = Boolean(current && selected && !titleProblem(title) && selected.source !== 'demo' && !saving && busy === null)

  useEffect(() => () => { imageAbort.current?.abort() }, [])

  async function askForProposal() {
    const id = request.current + 1
    request.current = id
    setBusy('consider')
    setError(null)
    try {
      const response = await fetch(withBasePath('/api/consider'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ questionId: question.id, curiosityId }),
      })
      const body = await response.json() as { proposal?: string; error?: string }
      if (id !== request.current) return
      if (!response.ok || !body.proposal) {
        setError(body.error ?? 'An image prompt did not come back. You can try again. The prompt already in the field was left unchanged.')
        return
      }
      setGenerated(true)
      setWording(body.proposal)
    } catch {
      if (id === request.current) setError('An image prompt did not come back. You can try again. The prompt already in the field was left unchanged.')
    } finally {
      if (id === request.current) setBusy(null)
    }
  }

  async function askForImages() {
    if (!question.consideredText) return
    imageAbort.current?.abort()
    const controller = new AbortController()
    imageAbort.current = controller
    const id = request.current + 1
    request.current = id
    setBusy('images')
    setError(null)
    try {
      const sentText = question.consideredText
      const response = await fetch(withBasePath('/api/images'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ consideredText: question.consideredText }),
        signal: controller.signal,
      })
      const body = await response.json() as ImageSetResult & { error?: string }
      if (id !== request.current) return
      if (!response.ok) {
        setError(body.error ?? 'The images did not come back. You can try again.')
        return
      }
      onChange((current) => applyImageResult(current, question.id, body, sentText))
      if (body.candidates.length === 0) setError(body.notice)
    } catch (caught) {
      if (controller.signal.aborted || id !== request.current) return
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      setError('The images did not come back. You can try again.')
    } finally {
      if (id === request.current) setBusy(null)
    }
  }

  function saveSelected() {
    if (!canSave) return
    onChange(saveConcept(workspace, question.id, title, []))
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <p role="alert" className="rounded-2xl bg-studio-coral/20 px-4 py-3 text-sm">{error}</p>}
      <section className={panelClass}>
        <h3 className="font-serif text-2xl">Image prompt</h3>
        <label htmlFor="considered-draft" className="mt-3 block text-sm text-studio-body">Write a visual prompt, or edit the one that comes back.</label>
        <textarea
          id="considered-draft"
          value={wording}
          onChange={(event) => setWording(event.target.value)}
          className="mt-2 min-h-36 w-full rounded-2xl border border-studio-line bg-studio-cream p-4 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-studio-coral"
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={askForProposal}
            disabled={busy !== null}
            className={iconButton}
            aria-label={busy === 'consider' ? 'Writing an image prompt' : generated ? 'Ask for another image prompt' : 'Ask for an image prompt'}
            title={busy === 'consider' ? 'Writing an image prompt' : generated ? 'Ask for another image prompt' : 'Ask for an image prompt'}
          >
            <Bot size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => { setError(null); onChange(acceptConsidered(workspace, question.id, wording)) }}
            disabled={busy !== null}
            className={iconCoralButton}
            aria-label="Accept this prompt"
            title="Accept this prompt"
          >
            <Check size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={askForImages}
            disabled={!question.consideredText || !wordingSaved || busy !== null}
            className={iconButton}
            aria-label={busy === 'images' ? 'Preparing four images' : 'Generate four images'}
            title={busy === 'images' ? 'Preparing four images' : 'Generate four images'}
          >
            <ImagePlus size={18} aria-hidden="true" />
          </button>
        </div>
        {busy === 'consider' ? <p className="mt-3 text-sm text-studio-body">Writing an image prompt…</p> : null}
        {busy === 'images' ? <p className="mt-3 text-sm text-studio-body">Preparing four images…</p> : null}
        {!question.consideredText && <p className="mt-3 text-sm text-studio-muted">Accept an image prompt first.</p>}
        {question.consideredText && !wordingSaved && <p className="mt-3 text-sm text-studio-muted">Accept the prompt before asking for images.</p>}
      </section>
      <section className={panelClass}>
        <h3 className="font-serif text-2xl">Images</h3>
        {draft && !current && (
          <div className="mt-4">
            <Notice>These images were made for “{draft.forConsideredText}”. The considered question is now different, so they are not a reading of the new wording.</Notice>
          </div>
        )}
        {draft?.notice && current && <div className="mt-4"><Notice>{draft.notice}{draft.reportedCostUsd != null ? ` Reported cost for this set: $${draft.reportedCostUsd.toFixed(5)}.` : ''}</Notice></div>}
        {visible.length > 0 && (
          <ImageCarousel
            candidates={visible}
            selectedId={selected?.id ?? null}
            selectable={current}
            onSelect={(candidateId) => onChange(selectCandidate(workspace, question.id, candidateId))}
            onHide={(candidateId) => onChange(rejectCandidate(workspace, question.id, candidateId))}
          />
        )}
        {hidden.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-studio-body">{hidden.length} hidden from this comparison. Hidden images are not saved.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {hidden.map((candidate) => (
                <button key={candidate.id} type="button" className={quietButton} onClick={() => onChange(restoreCandidate(workspace, question.id, candidate.id))}>
                  Restore {candidate.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-6 border-t border-studio-line pt-5">
          <h3 className="font-serif text-2xl">Save concept</h3>
          <label htmlFor="visualise-concept-title" className="mt-3 block text-sm font-semibold">One- or two-word title</label>
          <div className="mt-2 flex items-center gap-2">
            <input
              id="visualise-concept-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Name the metaphor"
              maxLength={40}
              className="min-w-0 flex-1 rounded-2xl border border-studio-line bg-studio-cream px-4 py-3 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-studio-coral"
            />
            <button
              type="button"
              onClick={saveSelected}
              disabled={!canSave}
              className={iconButton}
              aria-label="Save concept"
              title="Save concept"
            >
              <Save size={18} aria-hidden="true" />
            </button>
          </div>
          {titleIssue ? <p className="mt-2 text-sm text-studio-coral">{titleIssue}</p> : null}
          {selected?.source === 'demo' ? <p className="mt-2 text-sm text-studio-body">This is a demo fixture. It was not generated, and it cannot be stored in the account.</p> : null}
          {saving ? <p className="mt-2 text-sm text-studio-body">Saving the image and its source-question links to this account…</p> : null}
        </div>
      </section>
    </div>
  )
}

const carouselNav = 'grid size-11 shrink-0 place-items-center rounded-full border border-studio-line bg-studio-paper text-studio-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral disabled:opacity-40'
const carouselSelect = 'grid size-11 shrink-0 place-items-center rounded-xl border border-studio-line text-studio-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral disabled:opacity-40'
const carouselSelectOn = 'grid size-11 shrink-0 place-items-center rounded-xl bg-studio-coral text-studio-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral disabled:opacity-40'

function ImageCarousel({
  candidates,
  selectedId,
  selectable,
  onSelect,
  onHide,
}: {
  candidates: StoredCandidate[]
  selectedId: string | null
  selectable: boolean
  onSelect: (candidateId: string) => void
  onHide: (candidateId: string) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const items = useRef(candidates)
  const shownId = useRef(selectedId)
  const viewIndex = useRef(0)
  const destination = useRef(0)
  items.current = candidates
  const [shown, setShown] = useState(() => {
    const found = candidates.findIndex((candidate) => candidate.id === selectedId)
    return found >= 0 ? found : 0
  })
  const candidateKey = candidates.map((candidate) => candidate.id).join('|')
  const candidate = candidates[Math.min(shown, candidates.length - 1)] ?? null
  const selected = candidates.find((item) => item.id === selectedId) ?? null
  const chosen = Boolean(candidate && candidate.id === selectedId)

  useLayoutEffect(() => {
    const currentItems = items.current
    const found = currentItems.findIndex((item) => item.id === shownId.current)
    const index = found >= 0 ? found : 0
    const el = scroller.current
    shownId.current = currentItems[index]?.id ?? null
    viewIndex.current = index
    destination.current = index
    setShown(index)
    if (el && el.clientWidth > 0) el.scrollTo({ left: index * el.clientWidth })
  }, [candidateKey])

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    let width = el.clientWidth
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width || el.clientWidth <= 0) return
      width = el.clientWidth
      el.scrollTo({ left: viewIndex.current * width })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [candidateKey])

  function reveal(index: number) {
    const el = scroller.current
    if (!el || el.clientWidth <= 0) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: index * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' })
  }

  function go(direction: -1 | 1) {
    const next = destination.current + direction
    if (next < 0 || next >= items.current.length) return
    destination.current = next
    reveal(next)
  }

  function onScroll() {
    const el = scroller.current
    if (!el || el.clientWidth <= 0) return
    const index = Math.max(0, Math.min(items.current.length - 1, Math.round(el.scrollLeft / el.clientWidth)))
    const arrived = Math.abs(el.scrollLeft - destination.current * el.clientWidth) < 2
    if (arrived) destination.current = index
    if (index === viewIndex.current) return
    viewIndex.current = index
    shownId.current = items.current[index]?.id ?? null
    setShown(index)
  }

  if (!candidate) return null

  return (
    <div
      className="mt-5 min-w-0 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-studio-coral"
      role="region"
      aria-roledescription="carousel"
      aria-label="Image interpretations"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          go(-1)
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          go(1)
        }
      }}
    >
      <div className="min-w-0 overflow-hidden">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth overscroll-x-contain motion-reduce:scroll-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {candidates.map((item, index) => {
            const active = index === shown
            const saved = item.id === selectedId
            return (
              <div key={item.id} className="w-full shrink-0 grow-0 basis-full snap-start" aria-hidden={active ? undefined : true}>
                <div className={`relative mx-auto w-full max-w-[28rem] overflow-hidden rounded-[24px] border bg-studio-ink xl:max-w-[32rem] ${saved ? 'border-studio-coral shadow-studio-stamp-coral' : 'border-studio-line'}`}>
                  {saved ? <span className="absolute left-3 top-3 z-10 rounded-full bg-studio-coral px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-studio-ink">Selected</span> : null}
                  <button
                    type="button"
                    className="block w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral disabled:cursor-not-allowed"
                    aria-pressed={saved}
                    aria-label={saved ? `Selected image: ${item.label}` : `Select ${item.label}`}
                    disabled={!selectable}
                    tabIndex={active ? 0 : -1}
                    onClick={() => onSelect(item.id)}
                  >
                    <img
                      src={item.src}
                      alt={`${item.label}. ${item.metaphor}`}
                      className="mx-auto h-[min(74vw,18rem)] w-full object-contain sm:h-[22rem] xl:h-[min(42vh,26rem)]"
                    />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-4 flex max-w-full flex-wrap items-center justify-center gap-2 sm:gap-3">
        <button type="button" className={carouselNav} aria-label="Show the previous image" disabled={shown <= 0} onClick={() => go(-1)}>
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <p aria-live="polite" className="min-w-12 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-studio-eyebrow">{shown + 1} of {candidates.length}</p>
        <button type="button" className={carouselNav} aria-label="Show the next image" disabled={shown >= candidates.length - 1} onClick={() => go(1)}>
          <ChevronRight size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={chosen ? carouselSelectOn : carouselSelect}
          aria-pressed={chosen}
          aria-label={chosen ? 'Using this image' : 'Use this image'}
          title={chosen ? 'Using this image' : 'Use this image'}
          disabled={!selectable}
          onClick={() => onSelect(candidate.id)}
        >
          <Check size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 text-center">
        <Eyebrow>
          {candidate.label}
          {candidate.source === 'demo' ? ' · Demo fixture' : ''}
        </Eyebrow>
        <p className="mt-1 text-sm text-studio-body">{candidate.metaphor}</p>
        {!selected ? <p className="mt-2 text-sm text-studio-muted">Select the image you want to keep.</p> : null}
        {selected && !chosen ? <p className="mt-2 text-sm text-studio-muted">Selected image: {selected.label}.</p> : null}
        <button type="button" className="mt-3 text-sm font-semibold text-studio-muted underline-offset-2 hover:underline" onClick={() => onHide(candidate.id)}>Hide from this comparison</button>
      </div>
    </div>
  )
}
