'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Bookmark, Bot, Check, ChevronLeft, ChevronRight, ImagePlus, RefreshCw, RotateCcw, Sparkles } from 'lucide-react'
import { StageMark } from '@/components/studio/stage-mark'
import { useScreenDraft } from '@/components/studio/leave-guard'
import { Eyebrow, IconAction, Notice, coralButton, panelClass, questionListClass, questionListItemClass, quietButton } from '@/components/studio/studio-ui'
import { directionsForCount, imageCountdownCopy, imageCountdownSeconds, imageCountdownShowsNumber, imageCounts, initialSlots, markSlot, nextImageCountdown, readImageCount, writeImageCount, type ImageCount, type ImageSlot } from '@/lib/providers/image-count'
import { shouldApplyReturnedImage, shouldStartNextImage } from '@/lib/providers/image-run'
import type { ImageSetResult, MetaphorId } from '@/lib/providers/types'
import { withBasePath } from '@/lib/paths'
import { cleanTitle, titleProblem } from '@/lib/questions/title'
import { acceptConsidered, addImageCandidate, beginImageSet, draftFor, draftIsCurrent, foldedQuestions, questionPlace, rejectCandidate, restoreCandidate, saveConcept, selectCandidate, visualiseQuestions } from '@/lib/questions/workspace'
import type { QuestionRecord, StoredCandidate, Workspace } from '@/lib/questions/types'

export function VisualiseStage({ workspace, curiosityId, saving, savedConceptId, onChange }: { workspace: Workspace; curiosityId: string; saving: boolean; savedConceptId: string | null; onChange: (next: Workspace | ((current: Workspace) => Workspace)) => void }) {
  const choices = visualiseQuestions(workspace)
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
        <h2 className="font-serif text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">Give this question a visual form.</h2>
        <StageMark stage="visualise" placement="content" />
      </header>
      <div className="grid min-h-0 min-w-0 items-start gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <ul
          ref={listRef}
          aria-label="Questions to visualise"
          className={`${questionListClass} xl:sticky xl:top-10`}
        >
          {choices.length === 0 && <li className={`${panelClass} w-full shrink-0 text-sm text-studio-body`}>Plant a question before asking for an image.</li>}
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
        {selected ? <QuestionImages key={selected.id} question={selected} curiosityId={curiosityId} saving={saving} savedConceptId={savedConceptId} workspace={workspace} onChange={onChange} /> : null}
      </div>
    </div>
  )
}

function QuestionImages({
  question,
  curiosityId,
  saving,
  savedConceptId,
  workspace,
  onChange,
}: {
  question: QuestionRecord
  curiosityId: string
  saving: boolean
  savedConceptId: string | null
  workspace: Workspace
  onChange: (next: Workspace | ((current: Workspace) => Workspace)) => void
}) {
  const [wording, setWording] = useState(question.consideredText ?? '')
  const [title, setTitle] = useState('')
  const [related, setRelated] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [suggestNotice, setSuggestNotice] = useState<string | null>(null)
  const [suggestError, setSuggestError] = useState<string | null>(null)
  const [justSavedId, setJustSavedId] = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)
  const [busy, setBusy] = useState<'consider' | 'images' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [imageCount, setImageCount] = useState<ImageCount>(1)
  const [slots, setSlots] = useState<ImageSlot[] | null>(null)
  const [imageAttempt, setImageAttempt] = useState(0)
  const countLabelId = useId()
  const request = useRef(0)
  const suggestRequest = useRef(0)
  const imageRun = useRef(0)
  const imageRunId = useRef('')
  const imageAbort = useRef<AbortController | null>(null)
  const draft = draftFor(workspace, question.id)
  const current = draftIsCurrent(question, draft)
  const visible = draft?.candidates.filter((candidate) => !draft.rejectedIds.includes(candidate.id)) ?? []
  const hidden = draft?.candidates.filter((candidate) => draft.rejectedIds.includes(candidate.id)) ?? []
  const wordingSaved = wording.trim() === (question.consideredText ?? '')
  const selected = draft?.candidates.find((candidate) => candidate.id === draft.selectedId && !draft.rejectedIds.includes(candidate.id)) ?? null
  const titleIssue = title.trim() ? titleProblem(title) : null
  const canSave = Boolean(current && selected && !titleProblem(title) && selected.source !== 'demo' && !saving)
  const justSaved = workspace.concepts.find((item) => item.id === justSavedId) ?? null
  const relatedChoices = visualiseQuestions(workspace).filter((item) => item.id !== question.id)
  const folded = foldedQuestions(workspace, question.id)
  useScreenDraft(!wordingSaved || busy !== null || (!justSaved && (title.trim() !== '' || related.length > 0)))

  useEffect(() => {
    setImageCount(readImageCount(window.localStorage))
  }, [])

  useEffect(() => {
    setSlots(null)
    setBusy((state) => state === 'images' ? null : state)
    return () => {
      imageRun.current += 1
      imageAbort.current?.abort()
    }
  }, [question.consideredText])

  useEffect(() => {
    if (justSavedId && !workspace.concepts.some((item) => item.id === justSavedId)) setJustSavedId(null)
  }, [workspace.concepts, justSavedId])

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

  function closeImageRun() {
    imageRun.current += 1
    setBusy((state) => state === 'images' ? null : state)
  }

  async function requestImage(direction: MetaphorId, sentText: string, run: number) {
    setImageAttempt((current) => current + 1)
    const controller = new AbortController()
    imageAbort.current = controller
    try {
      const response = await fetch(withBasePath('/api/images'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ consideredText: sentText, direction, runId: imageRunId.current }),
        signal: controller.signal,
      })
      const body = await response.json() as ImageSetResult & { error?: string }
      const runOpen = run === imageRun.current
      if (!shouldApplyReturnedImage(runOpen)) return { kind: 'discarded' as const }
      if (!response.ok || body.candidates.length === 0) {
        return { kind: 'failed' as const, error: body.error || body.notice || 'This image did not come back. You can try it again.' }
      }
      onChange((currentWorkspace) => {
        if (!shouldApplyReturnedImage(run === imageRun.current)) return currentWorkspace
        return addImageCandidate(currentWorkspace, question.id, body, sentText)
      })
      return { kind: 'ready' as const }
    } catch (caught) {
      if (controller.signal.aborted || run !== imageRun.current) return { kind: 'discarded' as const }
      if (caught instanceof DOMException && caught.name === 'AbortError') return { kind: 'discarded' as const }
      return { kind: 'failed' as const, error: 'This image did not come back. You can try it again.' }
    }
  }

  async function askForImages() {
    if (!question.consideredText || !wordingSaved || busy !== null) return
    const sentText = question.consideredText
    const count = imageCount
    writeImageCount(window.localStorage, count)
    const run = imageRun.current + 1
    imageRun.current = run
    imageRunId.current = crypto.randomUUID()
    imageAbort.current?.abort()
    const plan = initialSlots(count)
    setSlots(plan)
    setBusy('images')
    setError(null)
    setJustSavedId(null)
    setTitle('')
    setRelated([])
    setSuggestions([])
    setSuggestError(null)
    setSuggestNotice(null)
    onChange((currentWorkspace) => beginImageSet(currentWorkspace, question.id, sentText))
    let currentSlots = plan
    for (const direction of directionsForCount(count)) {
      if (!shouldStartNextImage(run === imageRun.current)) return
      currentSlots = markSlot(currentSlots, direction.id, 'generating')
      setSlots(currentSlots)
      const outcome = await requestImage(direction.id, sentText, run)
      if (!shouldStartNextImage(run === imageRun.current) || outcome.kind === 'discarded') return
      if (outcome.kind === 'failed') {
        currentSlots = markSlot(currentSlots, direction.id, 'failed', outcome.error)
        setSlots(currentSlots)
        continue
      }
      currentSlots = markSlot(currentSlots, direction.id, 'ready')
      setSlots(currentSlots)
    }
    if (run === imageRun.current) setBusy(null)
  }

  async function retryImage(direction: MetaphorId) {
    if (!question.consideredText || busy !== null) return
    const sentText = question.consideredText
    const run = imageRun.current
    if (!shouldStartNextImage(run === imageRun.current)) return
    setBusy('images')
    setSlots((current) => current ? markSlot(current, direction, 'generating') : current)
    const outcome = await requestImage(direction, sentText, run)
    if (!shouldStartNextImage(run === imageRun.current) || outcome.kind === 'discarded') return
    setSlots((current) => current ? markSlot(current, direction, outcome.kind === 'ready' ? 'ready' : 'failed', outcome.kind === 'failed' ? outcome.error : null) : current)
    if (run === imageRun.current) setBusy(null)
  }

  function suggestionQuestions() {
    return [question.id, ...related].flatMap((id) => {
      const item = workspace.questions.find((candidate) => candidate.id === id)
      if (!item?.originalText.trim()) return []
      return [{ originalText: item.originalText, consideredText: item.consideredText }]
    })
  }

  async function askForTitles() {
    if (suggesting || saving || !selected || !draft?.forConsideredText.trim()) return
    const id = suggestRequest.current + 1
    suggestRequest.current = id
    setSuggesting(true)
    setSuggestError(null)
    try {
      const response = await fetch(withBasePath('/api/titles'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          consideredText: draft.forConsideredText,
          metaphor: selected.metaphor,
          imageSrc: selected.src,
          questions: suggestionQuestions(),
        }),
      })
      const body = await response.json() as { titles?: unknown; notice?: unknown; error?: unknown }
      if (id !== suggestRequest.current) return
      const titles = Array.isArray(body.titles) ? body.titles.filter((item): item is string => typeof item === 'string') : []
      if (!response.ok || typeof body.error === 'string' || titles.length !== 3) {
        setSuggestNotice(null)
        setSuggestError(typeof body.error === 'string' ? body.error : 'Titles could not be suggested. Your title was left unchanged.')
        return
      }
      setSuggestError(null)
      setSuggestions(titles)
      setSuggestNotice(typeof body.notice === 'string' ? body.notice : 'Suggestions only. Nothing is saved until you save the concept.')
    } catch {
      if (id === suggestRequest.current) setSuggestError('Titles could not be suggested. Your title was left unchanged.')
    } finally {
      if (id === suggestRequest.current) setSuggesting(false)
    }
  }

  function saveSelected() {
    if (!canSave) return
    let savedId: string | null = null
    onChange((currentWorkspace) => {
      const next = saveConcept(currentWorkspace, question.id, title, related)
      if (next === currentWorkspace) return currentWorkspace
      savedId = next.focusConceptId
      return next
    })
    if (!savedId) return
    closeImageRun()
    setSlots(null)
    setJustSavedId(savedId)
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <p role="alert" className="rounded-2xl bg-studio-coral/20 px-4 py-3 text-sm">{error}</p>}
      <section className={panelClass}>
        <h3 className="font-serif text-2xl">Image prompt</h3>
        <label htmlFor="considered-draft" className="mt-3 block text-sm leading-relaxed text-studio-body">Write a visual prompt, or edit the one that comes back.</label>
        <textarea
          id="considered-draft"
          value={wording}
          onChange={(event) => setWording(event.target.value)}
          className="mt-2 min-h-36 w-full rounded-2xl border border-studio-line bg-studio-cream p-4 text-base outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-studio-coral"
        />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <IconAction
              label={busy === 'consider' ? 'Writing an image prompt' : generated ? 'Ask for another image prompt' : 'Ask for an image prompt'}
              treatment="quiet"
              tipAlign="start"
              disabled={busy !== null}
              onClick={askForProposal}
            >
              <Bot aria-hidden="true" />
            </IconAction>
            <IconAction
              label="Accept this prompt"
              treatment="ink"
              disabled={busy !== null}
              onClick={() => { setError(null); onChange(acceptConsidered(workspace, question.id, wording)) }}
            >
              <Check aria-hidden="true" />
            </IconAction>
            <IconAction
              label={busy === 'images' ? 'Creating images' : imageCount === 1 ? 'Generate 1 image' : `Generate ${imageCount} images`}
              treatment="quiet"
              disabled={!question.consideredText || !wordingSaved || busy !== null}
              onClick={() => { void askForImages() }}
            >
              <ImagePlus aria-hidden="true" />
            </IconAction>
          </div>
          <div className="flex items-center gap-3">
            <span id={countLabelId} className="text-sm font-semibold">Images</span>
            <div role="radiogroup" aria-labelledby={countLabelId} className="inline-flex rounded-full border border-studio-line bg-studio-cream p-0.5">
              {imageCounts.map((count) => {
                const chosen = imageCount === count
                return (
                  <button
                    key={count}
                    type="button"
                    role="radio"
                    aria-checked={chosen}
                    disabled={busy !== null}
                    onClick={() => {
                      setImageCount(count)
                      writeImageCount(window.localStorage, count)
                    }}
                    className={`min-h-11 min-w-11 rounded-full px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral disabled:opacity-40 ${chosen ? 'bg-studio-coral text-studio-ink' : 'text-studio-ink'}`}
                  >
                    {count}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-studio-muted">1 image is the quickest look. 4 explores a wider range.</p>
        {busy === 'consider' ? <p className="mt-3 text-sm text-studio-body">Writing an image prompt…</p> : null}
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
        {slots && slots.some((slot) => slot.status !== 'ready') ? <ImageProgress slots={slots} attempt={imageAttempt} busy={busy === 'images'} onRetry={(direction) => { void retryImage(direction) }} /> : null}
        {visible.length === 0 && hidden.length === 0 && !(slots && slots.some((slot) => slot.status !== 'ready')) ? (
          <div className="mt-4 rounded-2xl border border-dashed border-studio-line bg-studio-cream px-4 py-5">
            <p className="font-serif text-lg">Images will appear here</p>
            <p className="mt-1 text-sm leading-relaxed text-studio-body">Each finished image shows as soon as it is ready. You can then choose the one to keep.</p>
          </div>
        ) : null}
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
            <ul className="mt-2 flex flex-col gap-2">
              {hidden.map((candidate) => (
                <li key={candidate.id} className="flex items-center gap-2">
                  <IconAction label={`Restore ${candidate.label}`} treatment="quiet" tipAlign="start" onClick={() => onChange(restoreCandidate(workspace, question.id, candidate.id))}>
                    <RotateCcw aria-hidden="true" />
                  </IconAction>
                  <span className="min-w-0 text-sm text-studio-body">{candidate.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-6 border-t border-studio-line pt-5">
          {justSaved ? (
            <div>
              <h3 className="font-serif text-2xl">Saved</h3>
              <img src={justSaved.imageSrc} alt="" className="mt-4 max-h-56 w-full rounded-2xl bg-studio-ink object-contain sm:max-h-72" />
              <p className="mt-3 font-serif text-3xl leading-none">{justSaved.title}</p>
              <p role="status" className="mt-3 text-sm text-studio-body">
                {saving
                  ? 'Saving the image and its source-question links to this account…'
                  : savedConceptId === justSaved.id
                    ? 'Saved to your library. This account has the image and its source-question links.'
                    : `${justSaved.title} is in your library.`}
              </p>
              <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:gap-6">
                <button type="button" className={textLinkClass} onClick={() => onChange({ ...workspace, stage: 'library', focusConceptId: justSaved.id, focusQuestionId: question.id })}>View in the library</button>
                <button type="button" className={textLinkClass} onClick={() => onChange({ ...workspace, stage: 'gather', focusQuestionId: question.id })}>Return to the garden</button>
              </div>
              <p className="mt-3 text-sm text-studio-muted">You can generate another image for this question, or leave this one as it is.</p>
            </div>
          ) : (
            <>
              <h3 className="font-serif text-2xl">Save concept</h3>
              {selected && current ? (
                <img src={selected.src} alt="" className="mt-4 max-h-56 w-full rounded-2xl bg-studio-ink object-contain sm:max-h-72" />
              ) : (
                <p className="mt-3 text-sm text-studio-muted">Select an image to save it as a concept.</p>
              )}
              <div className="mt-4">
                <p className="text-sm font-semibold">Question</p>
                <p className="mt-1 break-words font-serif text-xl leading-snug">{question.originalText}</p>
                {folded.length > 0 && (
                  <ul className="mt-2 text-sm text-studio-muted">
                    {folded.map((source) => <li key={source.id}>Merged wording kept: {source.originalText}</li>)}
                  </ul>
                )}
                <p className="mt-2 text-sm text-studio-muted">The library card shows this question. The image prompt is kept with the concept and is not the card question.</p>
              </div>
              {relatedChoices.length > 0 && (
                <details className="mt-4 rounded-2xl border border-studio-line bg-studio-cream px-4 py-3">
                  <summary className="cursor-pointer text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral">
                    Add a related question
                    <span className="mt-1 block font-normal text-studio-muted">Optional. The concept is saved with this question either way.</span>
                  </summary>
                  <div className="mt-3 flex flex-col gap-2">
                    {relatedChoices.map((item) => (
                      <label key={item.id} className="flex min-h-11 items-start gap-3 py-2 text-sm text-studio-body">
                        <input
                          type="checkbox"
                          className="mt-1 size-4 shrink-0"
                          checked={related.includes(item.id)}
                          onChange={() => setRelated((currentIds) => currentIds.includes(item.id) ? currentIds.filter((id) => id !== item.id) : [...currentIds, item.id])}
                        />
                        <span className="min-w-0 break-words">{item.originalText}</span>
                      </label>
                    ))}
                  </div>
                </details>
              )}
              <label htmlFor="visualise-concept-title" className="mt-4 block text-sm font-semibold">One- or two-word title</label>
              <input
                id="visualise-concept-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Name the metaphor"
                maxLength={40}
                aria-describedby={titleIssue || (selected && current && !title.trim()) ? 'visualise-title-issue' : undefined}
                className="mt-2 w-full rounded-2xl border border-studio-line bg-studio-cream px-4 py-3 text-base outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-studio-coral"
              />
              {selected && current && !title.trim() ? <p id="visualise-title-issue" className="mt-2 text-sm text-studio-coral">Add a one- or two-word title.</p> : null}
              {titleIssue ? <p id="visualise-title-issue" className="mt-2 text-sm text-studio-coral">{titleIssue}</p> : null}
              <div className="mt-3">
                <div className="flex items-center gap-3">
                  <IconAction
                    label={suggesting ? 'Suggesting titles' : suggestions.length > 0 ? 'Suggest different titles' : 'Suggest titles'}
                    treatment="quiet"
                    tipAlign="start"
                    disabled={suggesting || saving || busy === 'consider' || !selected || !current || !draft?.forConsideredText.trim()}
                    onClick={() => { void askForTitles() }}
                  >
                    <Sparkles aria-hidden="true" />
                  </IconAction>
                  {suggesting ? <p className="text-sm text-studio-body">Suggesting titles…</p> : null}
                </div>
                {suggestError && <p role="alert" className="mt-2 text-sm text-studio-coral">{suggestError}</p>}
                {suggestNotice && !suggestError && <p role="status" className="mt-2 text-sm text-studio-body">{suggestNotice}</p>}
                {suggestions.length > 0 && (
                  <div role="group" aria-label="Title suggestions" className="mt-3 flex flex-wrap gap-2">
                    {suggestions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={title.trim() ? cleanTitle(title) === item : false}
                        className={title.trim() && cleanTitle(title) === item ? coralButton : quietButton}
                        onClick={() => setTitle(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selected?.source === 'demo' ? <p className="mt-2 text-sm text-studio-body">This is a demo fixture. It was not generated, and it cannot be stored in the account.</p> : null}
              {saving ? <p className="mt-2 text-sm text-studio-body">Saving the image and its source-question links to this account…</p> : null}
              {busy === 'images' && selected && current ? <p className="mt-3 text-sm text-studio-body">Saving keeps this image and stops any further images from being requested. An image already being created may still finish.</p> : null}
              <div className="mt-4 flex items-center gap-3">
                <IconAction label="Save concept" treatment="coral" tipAlign="start" disabled={!canSave} onClick={saveSelected}>
                  <Bookmark aria-hidden="true" />
                </IconAction>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function useImageCountdown(activeKey: string) {
  const [clock, setClock] = useState({ key: activeKey, remaining: imageCountdownSeconds })
  if (clock.key !== activeKey) setClock({ key: activeKey, remaining: imageCountdownSeconds })
  useEffect(() => {
    const startedAt = Date.now()
    let timer = 0
    let stopped = false
    const publish = (now: number) => {
      if (stopped) return true
      const next = nextImageCountdown(startedAt, now)
      setClock({ key: activeKey, remaining: next.remaining })
      return next.waitMs === 0
    }
    const schedule = (now: number) => {
      const waitMs = nextImageCountdown(startedAt, now).waitMs
      if (waitMs === 0) return
      timer = window.setTimeout(() => {
        const nowTick = Date.now()
        if (!publish(nowTick)) schedule(nowTick)
      }, waitMs)
    }
    if (!publish(Date.now())) schedule(Date.now())
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      window.clearTimeout(timer)
      const now = Date.now()
      if (!publish(now)) schedule(now)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped = true
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [activeKey])
  return clock.key === activeKey ? clock.remaining : imageCountdownSeconds
}

function ImageCountdownCard({ activeKey, place, total }: { activeKey: string; place: number; total: number }) {
  const remaining = useImageCountdown(activeKey)
  const showNumber = imageCountdownShowsNumber(remaining)
  const copy = imageCountdownCopy(remaining)
  return (
    <section aria-busy="true" aria-label="Creating your image" className="rounded-[24px] border border-studio-line bg-studio-ink px-4 py-4 text-studio-cream sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-serif text-xl leading-none">Creating your image</h4>
        <span className="rounded-full border border-studio-mint/50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-studio-mint">Generating</span>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <CountdownRing remaining={remaining} showNumber={showNumber} />
        <div className="min-w-0">
          <p className="text-balance text-sm">We're giving your question a visual form…</p>
          <p role="status" className="mt-1 text-balance text-sm text-studio-note-on">{copy}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/15 pt-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em]">Image {place} of {total}</p>
        <p className="text-sm text-studio-mint">{showNumber ? 'Coming along nicely' : 'Still creating…'}</p>
      </div>
    </section>
  )
}

function CountdownRing({ remaining, showNumber }: { remaining: number; showNumber: boolean }) {
  const size = 72
  const stroke = 3
  const radius = 32
  const circ = 2 * Math.PI * radius
  const fraction = Math.min(1, Math.max(0, remaining / imageCountdownSeconds))
  const offset = circ * (1 - fraction)
  return (
    <div className="relative grid size-16 shrink-0 place-items-center sm:size-[4.5rem]" aria-hidden="true">
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-white/20" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="text-studio-coral" />
      </svg>
      {showNumber ? <span className="absolute text-2xl font-semibold tabular-nums leading-none">{remaining}</span> : <span className="absolute size-2 rounded-full bg-studio-coral" />}
    </div>
  )
}

function ImageProgress({ slots, attempt, busy, onRetry }: { slots: ImageSlot[]; attempt: number; busy: boolean; onRetry: (direction: MetaphorId) => void }) {
  const active = slots.findIndex((slot) => slot.status === 'generating')
  return (
    <div className="mt-4">
      {active >= 0 ? <ImageCountdownCard activeKey={`${slots[active].id}:${attempt}`} place={active + 1} total={slots.length} /> : null}
      <ul className="mt-3 grid gap-2" aria-live="polite">
        {slots.map((slot, index) => (
          <li key={slot.id} className="min-w-0 rounded-2xl border border-studio-line px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Image {index + 1} of {slots.length}</p>
                <p className="text-sm text-studio-body">{slot.status === 'ready' ? 'Ready' : slot.status === 'generating' ? 'Creating this image…' : slot.status === 'waiting' ? 'Waiting' : 'Did not come back'}</p>
              </div>
              {slot.status === 'failed' ? (
                <IconAction label="Try this image again" treatment="quiet" tipAlign="end" disabled={busy} onClick={() => onRetry(slot.id)}>
                  <RefreshCw aria-hidden="true" />
                </IconAction>
              ) : null}
            </div>
            {slot.error ? <p role="alert" className="mt-2 text-sm text-studio-coral">{slot.error}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

const textLinkClass = 'text-sm font-semibold text-studio-ink underline decoration-studio-line underline-offset-4 hover:decoration-studio-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral'

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
                <div className={`relative mx-auto w-full max-w-[28rem] overflow-hidden rounded-[24px] border-2 bg-studio-ink xl:max-w-[32rem] ${saved ? 'border-studio-coral shadow-studio-stamp-coral' : 'border-studio-line'}`}>
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
      <div className="mt-4 flex items-center justify-center gap-2">
        <IconAction label="Show the previous image" treatment="quiet" tipAlign="start" disabled={shown <= 0} onClick={() => go(-1)}>
          <ChevronLeft aria-hidden="true" />
        </IconAction>
        <p aria-live="polite" className="min-w-12 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-studio-eyebrow">{shown + 1} of {candidates.length}</p>
        <IconAction label="Show the next image" treatment="quiet" disabled={shown >= candidates.length - 1} onClick={() => go(1)}>
          <ChevronRight aria-hidden="true" />
        </IconAction>
        <IconAction label={chosen ? 'Using this image' : 'Use this image'} treatment={chosen ? 'coral' : 'quiet'} aria-pressed={chosen} disabled={!selectable} onClick={() => onSelect(candidate.id)}>
          <Check aria-hidden="true" />
        </IconAction>
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
