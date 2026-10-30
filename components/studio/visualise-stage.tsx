'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Check, Image as ImageIcon } from 'lucide-react'
import { Eyebrow, Notice, iconButton, iconCoralButton, inkButton, panelClass, quietButton } from '@/components/studio/studio-ui'
import type { ImageSetResult } from '@/lib/providers/types'
import { withBasePath } from '@/lib/paths'
import { acceptConsidered, applyImageResult, draftFor, draftIsCurrent, questionPlace, rejectCandidate, restoreCandidate, selectCandidate } from '@/lib/questions/workspace'
import type { QuestionRecord, Workspace } from '@/lib/questions/types'

export function VisualiseStage({ workspace, curiosityId, onChange }: { workspace: Workspace; curiosityId: string; onChange: (next: Workspace | ((current: Workspace) => Workspace)) => void }) {
  const choices = workspace.questions.filter((item) => !item.mergedIntoId && (item.disposition === 'retained' || item.disposition === 'gathered'))
  const selected = choices.find((item) => item.id === workspace.focusQuestionId) ?? null

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="font-serif text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">One question, four interpretations.</h2>
      </header>
      <div className="grid items-start gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <ul className="flex gap-3 overflow-x-auto xl:flex-col xl:overflow-visible">
          {choices.length === 0 && <li className={`${panelClass} text-sm text-studio-body`}>Gather or retain a question before asking for an image.</li>}
          {choices.map((item) => {
            const current = item.id === selected?.id
            return (
              <li key={item.id} className="min-w-[240px] xl:min-w-0">
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
        {selected ? <QuestionImages key={selected.id} question={selected} curiosityId={curiosityId} workspace={workspace} onChange={onChange} /> : (
          <div className={panelClass}><p className="text-studio-body">Choose a question. The comparison stays with that question.</p></div>
        )}
      </div>
    </div>
  )
}

function QuestionImages({
  question,
  curiosityId,
  workspace,
  onChange,
}: {
  question: QuestionRecord
  curiosityId: string
  workspace: Workspace
  onChange: (next: Workspace | ((current: Workspace) => Workspace)) => void
}) {
  const [wording, setWording] = useState(question.consideredText ?? '')
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

  return (
    <div className="flex flex-col gap-6">
      {error && <p role="alert" className="rounded-2xl bg-studio-coral/20 px-4 py-3 text-sm">{error}</p>}
      <section className={panelClass}>
        <Eyebrow>Original wording</Eyebrow>
        <blockquote className="mt-3 font-serif text-3xl leading-snug">{question.originalText}</blockquote>
      </section>
      <section className={panelClass}>
        <Eyebrow>Image prompt</Eyebrow>
        {question.consideredText && !generated && <p className="mt-3 text-xl leading-snug">{question.consideredText}</p>}
        <label htmlFor="considered-draft" className="mt-4 block text-sm text-studio-body">Write a visual prompt, or edit the one that comes back.</label>
        <textarea
          id="considered-draft"
          value={wording}
          onChange={(event) => setWording(event.target.value)}
          className="mt-2 min-h-28 w-full rounded-2xl border border-studio-line bg-studio-cream p-4 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-studio-coral"
        />
        {busy === 'consider' ? <p className="mt-3 text-sm text-studio-body">Writing an image prompt…</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={askForProposal}
            disabled={busy === 'consider'}
            className={iconButton}
            aria-label={busy === 'consider' ? 'Writing an image prompt' : generated ? 'Ask for another image prompt' : 'Ask for an image prompt'}
            title={busy === 'consider' ? 'Writing an image prompt' : generated ? 'Ask for another image prompt' : 'Ask for an image prompt'}
          >
            <Bot size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => { setError(null); onChange(acceptConsidered(workspace, question.id, wording)) }}
            className={iconCoralButton}
            aria-label="Accept this prompt"
            title="Accept this prompt"
          >
            <Check size={18} aria-hidden="true" />
          </button>
        </div>
      </section>
      <section className={panelClass}>
        <div className="flex items-center gap-2 text-studio-ink">
          <ImageIcon size={18} aria-hidden="true" />
          <h3 className="font-serif text-2xl">Images</h3>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={askForImages} disabled={!question.consideredText || !wordingSaved || busy === 'images'} className={inkButton}>
            {busy === 'images' ? 'Preparing four views…' : 'Make four images'}
          </button>
          <button
            type="button"
            className={inkButton}
            disabled={!current || !selected}
            onClick={() => onChange({
              ...workspace,
              stage: 'distil',
              focusQuestionId: question.id,
              focusConceptId: null,
            })}
          >
            Name this image
          </button>
        </div>
        {!question.consideredText && <p className="mt-3 text-sm text-studio-muted">Accept an image prompt first.</p>}
        {question.consideredText && !wordingSaved && <p className="mt-3 text-sm text-studio-muted">Accept the prompt before asking for images.</p>}
        {draft && !current && (
          <div className="mt-4">
            <Notice>These images were made for “{draft.forConsideredText}”. The considered question is now different, so they are not a reading of the new wording.</Notice>
          </div>
        )}
        {draft?.notice && current && <div className="mt-4"><Notice>{draft.notice}{draft.reportedCostUsd != null ? ` Reported cost for this set: $${draft.reportedCostUsd.toFixed(5)}.` : ''}</Notice></div>}
        {visible.length > 0 && (
          <ul className="mt-5 grid gap-4 lg:grid-cols-2">
            {visible.map((candidate) => {
              const chosen = current && candidate.id === draft?.selectedId
              return (
                <li key={candidate.id} className={`overflow-hidden rounded-[24px] border ${chosen ? 'border-studio-coral shadow-studio-stamp-coral' : 'border-studio-line'}`}>
                  <button type="button" onClick={() => onChange(selectCandidate(workspace, question.id, candidate.id))} aria-pressed={chosen} disabled={!current} className="block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral disabled:cursor-not-allowed">
                    <img src={candidate.src} alt="" className="aspect-square w-full bg-studio-ink object-contain" />
                    <span className="block p-4">
                      <Eyebrow>{candidate.label}{candidate.source === 'demo' ? ' · Demo fixture' : ` · ${candidate.source}`}</Eyebrow>
                      <span className="mt-1 block text-sm text-studio-body">{candidate.metaphor}</span>
                    </span>
                  </button>
                  <div className="flex flex-wrap items-center gap-3 px-4 pb-4">
                    <button
                      type="button"
                      className={chosen ? iconCoralButton : iconButton}
                      aria-label={chosen ? 'Using this image' : 'Use this image'}
                      title={chosen ? 'Using this image' : 'Use this image'}
                      aria-pressed={chosen}
                      disabled={!current}
                      onClick={() => onChange(selectCandidate(workspace, question.id, candidate.id))}
                    >
                      <Check size={16} aria-hidden="true" />
                    </button>
                    <button type="button" className="text-sm font-semibold text-studio-muted underline-offset-2 hover:underline" onClick={() => onChange(rejectCandidate(workspace, question.id, candidate.id))}>Hide from this comparison</button>
                  </div>
                </li>
              )
            })}
          </ul>
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
      </section>
    </div>
  )
}
