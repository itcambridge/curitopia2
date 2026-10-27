'use client'

import { useEffect, useRef, useState } from 'react'
import { Eyebrow, Notice, coralButton, panelClass, quietButton } from '@/components/studio/studio-ui'
import { cleanTitle, titleProblem } from '@/lib/questions/title'
import { foldedQuestions, saveConcept, selectedCandidate, updateConcept } from '@/lib/questions/workspace'
import type { ConceptRecord, Workspace } from '@/lib/questions/types'

export function DistilStage({
  workspace,
  onChange,
  saving,
  savedConceptId,
}: {
  workspace: Workspace
  onChange: (workspace: Workspace) => void
  saving: boolean
  savedConceptId: string | null
}) {
  const focusedConcept = workspace.concepts.find((concept) => concept.id === workspace.focusConceptId) ?? null
  const anchorId = focusedConcept?.anchorQuestionId ?? workspace.focusQuestionId
  const anchor = workspace.questions.find((item) => item.id === anchorId) ?? null
  const chosen = focusedConcept || !anchor ? null : selectedCandidate(workspace, anchor.id)
  const concept = focusedConcept
  const image = chosen
    ? { src: chosen.src, label: chosen.label, source: chosen.source }
    : concept
      ? { src: concept.imageSrc, label: concept.imageLabel, source: concept.imageSource }
      : null
  const informing = concept?.forConsideredText ?? anchor?.consideredText ?? ''
  const relatedChoices = workspace.questions.filter((item) => item.id !== anchor?.id && !item.mergedIntoId && (item.disposition === 'retained' || item.disposition === 'gathered'))

  return (
    <div className="flex flex-col gap-8">
      <header>
        <Eyebrow>4 · Distil</Eyebrow>
        <h2 className="mt-2 font-serif text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">Name the image, not the sentence.</h2>
        <p className="mt-3 max-w-2xl text-sm text-studio-body">A concept keeps one image, a one- or two-word title, and the questions that informed it. Nothing is stored in the account until you save it here.</p>
      </header>
      {(anchor || concept) && image ? (
        <Composer
          key={`${concept?.id ?? 'new'}-${anchor?.id ?? 'kept'}-${chosen?.id ?? 'saved'}`}
          workspace={workspace}
          concept={concept}
          anchorId={anchor?.id ?? concept?.anchorQuestionId ?? ''}
          image={image}
          usingNewImage={Boolean(chosen)}
          informing={informing}
          relatedChoices={relatedChoices.map((item) => ({ id: item.id, text: item.originalText }))}
          onChange={onChange}
          saving={saving}
          savedConceptId={savedConceptId}
        />
      ) : (
        <div className={panelClass}>
          <p className="max-w-xl text-studio-body">Use an image in Visualise, name it here, then save the concept to your library. A concept already saved can be opened from the list below.</p>
        </div>
      )}
      <section>
        <h3 className="mb-3 font-serif text-2xl">Retained concepts</h3>
        {workspace.concepts.length === 0 ? <p className="text-sm text-studio-body">None yet.</p> : (
          <ul className="grid gap-4 md:grid-cols-2">
            {workspace.concepts.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onChange({ ...workspace, focusConceptId: item.id, focusQuestionId: item.anchorQuestionId, stage: 'distil' })}
                  className="flex w-full gap-4 rounded-[24px] border border-studio-line bg-studio-paper p-3 text-left shadow-studio-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral disabled:opacity-40"
                >
                  <img src={item.imageSrc} alt="" className="size-24 rounded-2xl bg-studio-ink object-cover" />
                  <span>
                    <Eyebrow>{(item.sources.length || item.questionIds.length) === 1 ? 'One question' : `${item.sources.length || item.questionIds.length} questions`}{item.imageSource === 'demo' ? ' · Demo fixture' : ''}</Eyebrow>
                    <span className="mt-1 block font-serif text-2xl">{item.title}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Composer({
  workspace,
  concept,
  anchorId,
  image,
  usingNewImage,
  informing,
  relatedChoices,
  onChange,
  saving,
  savedConceptId,
}: {
  workspace: Workspace
  concept: ConceptRecord | null
  anchorId: string
  image: { src: string; label: string; source: 'openai' | 'demo' }
  usingNewImage: boolean
  informing: string
  relatedChoices: { id: string; text: string }[]
  onChange: (workspace: Workspace) => void
  saving: boolean
  savedConceptId: string | null
}) {
  const sent = useRef(false)
  const [title, setTitle] = useState(concept?.title ?? '')
  const [related, setRelated] = useState<string[]>(concept?.questionIds.filter((id) => id !== anchorId) ?? [])
  const problem = title.trim() ? titleProblem(title) : 'Add a one- or two-word title.'
  const anchor = workspace.questions.find((item) => item.id === anchorId)
  const included = [anchorId, ...related]
  const wordingChanged = Boolean(concept && anchor?.consideredText && concept.forConsideredText !== anchor.consideredText && !usingNewImage)
  const savedExtras = concept?.questionIds.filter((id) => id !== anchorId) ?? []
  const linksMatchSaved = savedExtras.length === related.length && savedExtras.every((id) => related.includes(id))
  const titleMatchesSaved = Boolean(concept && title.trim() && concept.title === cleanTitle(title))

  useEffect(() => {
    setTitle(concept?.title ?? '')
    setRelated(concept?.questionIds.filter((id) => id !== anchorId) ?? [])
  }, [concept, anchorId])

  useEffect(() => {
    if (!saving) sent.current = false
  }, [saving])

  function toggle(id: string) {
    setRelated((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  function keep() {
    if (sent.current || saving || titleProblem(title) || (usingNewImage && image.source === 'demo')) return
    if (!usingNewImage && concept && titleMatchesSaved && linksMatchSaved) return
    sent.current = true
    if (usingNewImage) onChange(saveConcept(workspace, anchorId, title, related))
    else if (concept) onChange(updateConcept(workspace, concept.id, title, related))
    else sent.current = false
  }

  return (
    <article className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
      <figure className={panelClass}>
        <img src={image.src} alt="" className="aspect-square w-full rounded-[24px] bg-studio-ink object-contain" />
        <figcaption className="mt-4">
          <Eyebrow>{image.label}{image.source === 'demo' ? ' · Demo fixture' : ` · ${image.source}`}</Eyebrow>
          <p className="mt-2 font-serif text-4xl leading-none">{title.trim() ? cleanTitle(title) : 'Untitled'}</p>
        </figcaption>
      </figure>
      <div className={`${panelClass} flex flex-col gap-4`}>
        <Eyebrow>Concept</Eyebrow>
        {wordingChanged && <Notice>The considered question has changed since this image was made. The image still belongs to the earlier wording.</Notice>}
        {usingNewImage && <Notice>This image is still a draft. An earlier concept stays in the library.</Notice>}
        {image.source === 'demo' && <Notice>This is a demo fixture. It was not generated, and it cannot be stored in the account.</Notice>}
        <p className="text-sm text-studio-body">No experiment is attached.</p>
        <div>
          <p className="text-sm font-semibold">The image was made for</p>
          <p className="mt-1 text-lg leading-snug">{informing}</p>
        </div>
        <div>
          <p className="text-sm font-semibold">Questions informing it</p>
          <ul className="mt-2 flex flex-col gap-2 text-sm text-studio-body">
            {included.map((id) => {
              const item = workspace.questions.find((question) => question.id === id)
              const remembered = concept?.sources.find((source) => source.questionId === id)
              if (!item && !remembered) return null
              const folded = item ? foldedQuestions(workspace, id) : []
              return (
                <li key={id}>
                  <span className="block">{item?.originalText ?? remembered?.originalText}</span>
                  {folded.map((source) => <span key={source.id} className="mt-1 block text-studio-muted">Merged wording kept: {source.originalText}</span>)}
                </li>
              )
            })}
            {concept?.sources.filter((source) => !source.questionId).map((source) => (
              <li key={source.linkId}>Earlier wording kept: {source.originalText}</li>
            ))}
          </ul>
        </div>
        {relatedChoices.length > 0 && (
          <fieldset>
            <legend className="text-sm font-semibold">Add a related question</legend>
            <div className="mt-2 flex flex-col gap-2">
              {relatedChoices.map((item) => (
                <label key={item.id} className="flex items-start gap-2 text-sm text-studio-body">
                  <input type="checkbox" checked={related.includes(item.id)} onChange={() => toggle(item.id)} className="mt-1" />
                  <span>{item.text}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div>
          <label htmlFor="concept-title" className="text-sm font-semibold">One- or two-word title</label>
          <input
            id="concept-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Name the metaphor"
            className="mt-2 w-full rounded-2xl border border-studio-line bg-studio-cream px-4 py-3 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-studio-coral"
          />
          {title.trim() && titleProblem(title) && <p className="mt-2 text-sm text-studio-coral">{titleProblem(title)}</p>}
        </div>
        <p className="text-sm text-studio-body">
          {usingNewImage
            ? 'Saving stores this image and its source-question links in the signed-in account. Nothing is stored until you use the button.'
            : 'Saving writes the title and source-question links to the concept already in this account.'}
        </p>
        {saving && (
          <p role="status" className="text-sm text-studio-body">
            {concept?.imagePath
              ? 'Saving the title and source-question links to this account…'
              : 'Saving the image and its source-question links to this account…'}
          </p>
        )}
        {savedConceptId && concept?.id === savedConceptId && !saving && titleMatchesSaved && linksMatchSaved && (
          <p role="status" className="text-sm text-studio-body">Saved to your library. This account has the image and its source-question links.</p>
        )}
        <button type="button" className={coralButton} aria-busy={saving} disabled={Boolean(problem) || saving || (!usingNewImage && !concept) || (usingNewImage && image.source === 'demo')} onClick={keep}>
          {saving ? 'Saving concept…' : usingNewImage || !concept ? 'Save concept to Library' : 'Save changes to Library'}
        </button>
        <button type="button" className={quietButton} disabled={saving} onClick={() => onChange({ ...workspace, stage: 'library', focusConceptId: concept?.id ?? workspace.focusConceptId })}>Open the library</button>
      </div>
    </article>
  )
}
