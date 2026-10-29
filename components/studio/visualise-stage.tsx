'use client'

import { useEffect, useRef, useState } from 'react'
import { Eyebrow, Notice, coralButton, inkButton, panelClass, quietButton } from '@/components/studio/studio-ui'
import type { ConsiderResult } from '@/lib/providers/types'
import type { ImageSetResult } from '@/lib/providers/types'
import { withBasePath } from '@/lib/paths'
import { acceptConsidered, applyImageResult, draftFor, draftIsCurrent, questionPlace, rejectCandidate, restoreCandidate, selectCandidate } from '@/lib/questions/workspace'
import type { QuestionRecord, Workspace } from '@/lib/questions/types'

export function VisualiseStage({ workspace, onChange }: { workspace: Workspace; onChange: (next: Workspace | ((current: Workspace) => Workspace)) => void }) {
  const choices = workspace.questions.filter((item) => !item.mergedIntoId && (item.disposition === 'retained' || item.disposition === 'gathered'))
  const selected = choices.find((item) => item.id === workspace.focusQuestionId) ?? null

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Eyebrow>3 · Visualise</Eyebrow>
        <h2 className="mt-2 font-serif text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">One question, four interpretations.</h2>
        <p className="mt-3 max-w-2xl text-sm text-studio-body">Images are requested only for the question you choose, and only from the button. Accepting a considered question does not generate them.</p>
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
        {selected ? <QuestionImages key={selected.id} question={selected} workspace={workspace} onChange={onChange} /> : (
          <div className={panelClass}><p className="text-studio-body">Choose a question. The comparison stays with that question.</p></div>
        )}
      </div>
    </div>
  )
}

function QuestionImages({
  question,
  workspace,
  onChange,
}: {
  question: QuestionRecord
  workspace: Workspace
  onChange: (next: Workspace | ((current: Workspace) => Workspace)) => void
}) {
  const [wording, setWording] = useState(question.consideredText ?? '')
  const [proposal, setProposal] = useState<ConsiderResult | null>(null)
  const [attempt, setAttempt] = useState(0)
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
        body: JSON.stringify({ originalText: question.originalText, attempt }),
      })
      const body = await response.json() as ConsiderResult & { error?: string }
      if (id !== request.current) return
      if (!response.ok || !body.proposal) {
        setError(body.error ?? 'A proposal did not come back. You can try again.')
        return
      }
      setProposal(body)
      setWording(body.proposal)
      setAttempt((value) => value + 1)
    } catch {
      if (id === request.current) setError('A proposal did not come back. You can try again.')
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
        <Eyebrow>Considered question</Eyebrow>
        {question.consideredText && !proposal && <p className="mt-3 text-xl leading-snug">{question.consideredText}</p>}
        <label htmlFor="considered-draft" className="mt-4 block text-sm text-studio-body">Write it yourself, or edit a proposal.</label>
        <textarea
          id="considered-draft"
          value={wording}
          onChange={(event) => setWording(event.target.value)}
          className="mt-2 min-h-28 w-full rounded-2xl border border-studio-line bg-studio-cream p-4 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-studio-coral"
        />
        {proposal && <div className="mt-3"><Notice>{proposal.notice}</Notice></div>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={askForProposal} disabled={busy === 'consider'} className={quietButton}>
            {busy === 'consider' ? 'Asking…' : proposal ? 'Ask for another proposal' : 'Ask for one proposal'}
          </button>
          <button type="button" onClick={() => { setError(null); setProposal(null); onChange(acceptConsidered(workspace, question.id, wording)) }} className={coralButton}>
            Accept this wording
          </button>
        </div>
      </section>
      <section className={panelClass}>
        <Eyebrow>Images</Eyebrow>
        <p className="mt-3 max-w-2xl text-sm text-studio-body">Four interpretations are requested only when you ask. They stay in this browser until you save a concept in Distil.</p>
        <p className="mt-2 max-w-2xl text-sm text-studio-body">Use this image only chooses the current draft. It is not saved to your account yet.</p>
        <button type="button" onClick={askForImages} disabled={!question.consideredText || !wordingSaved || busy === 'images'} className={`${inkButton} mt-4`}>
          {busy === 'images' ? 'Preparing four views…' : 'Make four images'}
        </button>
        {!question.consideredText && <p className="mt-3 text-sm text-studio-muted">Accept a considered question first.</p>}
        {question.consideredText && !wordingSaved && <p className="mt-3 text-sm text-studio-muted">Accept the wording before asking for images.</p>}
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
                      className={chosen ? coralButton : quietButton}
                      aria-pressed={chosen}
                      disabled={!current}
                      onClick={() => onChange(selectCandidate(workspace, question.id, candidate.id))}
                    >
                      {chosen ? 'Using this image' : 'Use this image'}
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
        <div className="mt-5 flex flex-col items-start gap-3">
          <p className="max-w-xl text-sm text-studio-body">
            {selected
              ? 'This image is the current draft. It is not saved yet. Next, name it in Distil, then save the concept to your library.'
              : 'Choose Use this image, then continue to Distil. Changing or hiding a candidate does not save it.'}
          </p>
          <button
            type="button"
            className={coralButton}
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
      </section>
    </div>
  )
}
