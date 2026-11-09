'use client'

import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { useScreenDraft } from '@/components/studio/leave-guard'
import { IconAction } from '@/components/studio/studio-ui'
import { conceptCardQuestion } from '@/lib/questions/library-carousel'
import { cleanTitle, titleProblem } from '@/lib/questions/title'
import { foldedQuestions, updateConcept } from '@/lib/questions/workspace'
import type { ConceptRecord, Workspace } from '@/lib/questions/types'

export function ConceptEditor({
  concept,
  workspace,
  onChange,
  onClose,
  saving,
  savedConceptId,
}: {
  concept: ConceptRecord
  workspace: Workspace
  onChange: (workspace: Workspace) => void
  onClose: () => void
  saving: boolean
  savedConceptId: string | null
}) {
  const anchorId = concept.anchorQuestionId
  const [title, setTitle] = useState(concept.title)
  const [extras, setExtras] = useState<string[]>(concept.questionIds.filter((id) => id !== anchorId))
  const problem = title.trim() ? titleProblem(title) : 'Add a one- or two-word title.'
  const savedExtras = concept.questionIds.filter((id) => id !== anchorId)
  const linksMatch = savedExtras.length === extras.length && savedExtras.every((id) => extras.includes(id))
  const titleMatches = concept.title === cleanTitle(title)
  useScreenDraft(!titleMatches || !linksMatch)
  const question = conceptCardQuestion(concept, workspace.questions)
  const choices = anchorId
    ? workspace.questions.filter((item) => item.id !== anchorId && !item.mergedIntoId && item.disposition !== 'discarded')
    : []
  const anchor = anchorId ? workspace.questions.find((item) => item.id === anchorId) ?? null : null
  const detached = concept.sources.filter((source) => !source.questionId)

  useEffect(() => {
    setTitle(concept.title)
    setExtras(concept.questionIds.filter((id) => id !== concept.anchorQuestionId))
  }, [concept])

  function toggle(id: string) {
    setExtras((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  function save() {
    if (saving || titleProblem(title)) return
    if (titleMatches && linksMatch) return
    onChange(updateConcept(workspace, concept.id, title, extras))
  }

  return (
    <section className="min-w-0">
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 font-serif text-3xl tracking-tight sm:text-4xl">Edit concept</h2>
        <button type="button" className="shrink-0 text-sm font-semibold text-studio-ink underline decoration-studio-line underline-offset-4 hover:decoration-studio-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral" onClick={onClose}>Back to the library</button>
      </div>
      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(280px,1.1fr)]">
        <img src={concept.imageSrc} alt="" className="max-h-[min(78vw,28rem)] w-full rounded-3xl bg-studio-ink object-contain" />
        <form className="flex min-w-0 flex-col gap-4" onSubmit={(event) => { event.preventDefault(); save() }}>
          <div>
            <p className="text-sm font-semibold">Original question</p>
            <p className="mt-1 font-serif text-xl leading-snug">{question}</p>
          </div>
          <div>
            <p className="text-sm font-semibold">Image prompt</p>
            <p className="mt-1 text-sm leading-relaxed text-studio-body">{concept.forConsideredText}</p>
          </div>
          <div>
            <p className="text-sm font-semibold">Originating question</p>
            {anchor ? (
              <p className="mt-1 text-sm leading-relaxed text-studio-body">{anchor.originalText}</p>
            ) : (
              <p className="mt-1 text-sm leading-relaxed text-studio-body">The originating question is no longer available. Its wording on the concept stays as recorded.</p>
            )}
            {anchor ? foldedQuestions(workspace, anchor.id).map((source) => (
              <p key={source.id} className="mt-1 text-sm text-studio-muted">Merged wording kept: {source.originalText}</p>
            )) : null}
          </div>
          {detached.length > 0 && (
            <div>
              <p className="text-sm font-semibold">Earlier wording kept</p>
              <ul className="mt-1 flex flex-col gap-1 text-sm text-studio-body">
                {detached.map((source) => <li key={source.linkId}>{source.originalText}</li>)}
              </ul>
            </div>
          )}
          {anchorId && choices.length > 0 && (
            <fieldset>
              <legend className="text-sm font-semibold">Other questions that inform it</legend>
              <div className="mt-2 flex flex-col gap-2">
                {choices.map((item) => (
                  <label key={item.id} className="flex min-h-11 items-start gap-3 py-2 text-sm text-studio-body">
                    <input type="checkbox" checked={extras.includes(item.id)} onChange={() => toggle(item.id)} className="mt-0.5 size-5 shrink-0" />
                    <span>{item.originalText}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <label className="text-sm font-semibold">
            One- or two-word title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-studio-line bg-studio-cream px-4 py-3 text-base font-normal outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-studio-coral"
            />
          </label>
          {title.trim() && titleProblem(title) ? <p className="text-sm text-studio-coral">{titleProblem(title)}</p> : null}
          {saving ? <p role="status" className="text-sm text-studio-body">Saving the title and source-question links…</p> : null}
          {savedConceptId === concept.id && !saving && titleMatches && linksMatch ? <p role="status" className="text-sm text-studio-body">Saved. The image is unchanged.</p> : null}
          <div className="flex items-center gap-2">
            <IconAction type="submit" label="Save these changes" treatment="coral" tipAlign="start" disabled={Boolean(problem) || saving || (titleMatches && linksMatch)}>
              <Check aria-hidden="true" />
            </IconAction>
            <IconAction label="Cancel editing" treatment="quiet" onClick={onClose}>
              <X aria-hidden="true" />
            </IconAction>
          </div>
        </form>
      </div>
    </section>
  )
}
