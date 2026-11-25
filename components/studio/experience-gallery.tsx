'use client'

import { useState } from 'react'
import { ConceptEditor } from '@/components/studio/concept-editor'
import { Eyebrow } from '@/components/studio/studio-ui'
import { TopicCarousel } from '@/components/studio/topic-carousel'
import { circleById, circles, type CircleName } from '@/lib/questions/experience-content'
import { experienceGallery, galleryHasVisualisations } from '@/lib/questions/experience-gallery'
import { topicIndex } from '@/lib/questions/topic-carousel'
import type { ConceptRecord, Workspace } from '@/lib/questions/types'

const frame: Record<CircleName, string> = {
  concern: 'border-studio-coral/40',
  influence: 'border-studio-grove/40',
  control: 'border-studio-line-strong',
}

const mark: Record<CircleName, string> = {
  concern: 'bg-studio-coral',
  influence: 'bg-studio-grove',
  control: 'bg-studio-ink',
}

function countCopy(count: number) {
  return count === 1 ? '1 visualisation' : `${count} visualisations`
}

function CircleMarks({ circle }: { circle: CircleName }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{circleById(circle).label}</span>
      <span className="inline-flex items-center gap-1" aria-hidden="true">
        {circles.map((item) => (
          <span key={item.id} className={`size-2 rounded-full ${item.id === circle ? mark[item.id] : 'bg-studio-line'}`} />
        ))}
      </span>
    </span>
  )
}

function VisualisationCard({
  concept,
  circle,
  interactive,
  onOpen,
}: {
  concept: ConceptRecord
  circle: CircleName
  interactive: boolean
  onOpen: () => void
}) {
  const source = concept.experienceSource
  const wording = source?.originalText ?? ''
  const image = concept.imageSrc.trim()
  const [failed, setFailed] = useState(false)
  const face = (
    <>
      <div className="relative aspect-square bg-studio-paper">
        {image && !failed ? (
          <img src={image} alt="" onError={() => setFailed(true)} className="h-full w-full object-contain" />
        ) : (
          <span className="absolute inset-0 grid place-items-center px-4 text-center text-sm text-studio-muted">This image could not be opened.</span>
        )}
      </div>
      <div className="flex min-h-24 flex-col gap-1.5 px-3 py-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-studio-eyebrow">
          <CircleMarks circle={circle} />
        </p>
        <p className="font-serif text-xl leading-none">{concept.title}</p>
        <p className="line-clamp-3 font-serif text-sm leading-snug text-studio-body">{wording}</p>
      </div>
    </>
  )
  const className = `block w-full overflow-hidden rounded-3xl border bg-studio-paper text-left shadow-studio-card ${frame[circle]}`
  if (!interactive) return <div className={className}>{face}</div>
  return (
    <button type="button" className={`${className} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral`} onClick={onOpen}>
      <span className="sr-only">Open {concept.title}</span>
      {face}
    </button>
  )
}

export function ExperienceGallery({
  experienceId,
  concepts,
  conceptsLoaded,
  workspace,
  onChange,
  saving,
  savedConceptId,
}: {
  experienceId: string
  concepts: readonly ConceptRecord[]
  conceptsLoaded: boolean
  workspace: Workspace
  onChange: (workspace: Workspace) => void
  saving: boolean
  savedConceptId: string | null
}) {
  const gallery = experienceGallery(concepts, experienceId)
  const populated = galleryHasVisualisations(gallery)
  const [focus, setFocus] = useState<Record<CircleName, string | null>>({ concern: null, influence: null, control: null })
  const [openId, setOpenId] = useState<string | null>(null)
  const open = openId ? concepts.find((concept) => concept.id === openId) ?? null : null

  return (
    <section aria-labelledby="experience-visualisations" className="min-w-0 px-4 pb-10 sm:px-10 lg:px-12">
      <Eyebrow>Visualisations</Eyebrow>
      <h3 id="experience-visualisations" className="mt-2 font-serif text-3xl leading-tight tracking-tight">Images from this experience</h3>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-studio-body">Each image stays with the circle it began in. Concern, Influence, and Control are kept apart, with equal room.</p>
      {!conceptsLoaded && concepts.length === 0 ? <p className="mt-4 text-sm text-studio-muted">Opening visualisations…</p> : null}
      {conceptsLoaded && !populated ? <p className="mt-4 text-sm text-studio-muted">No visualisations here yet.</p> : null}
      {populated ? (
        <div className="mt-6 grid gap-8">
          {circles.map((circle) => {
            const items = gallery[circle.id]
            return (
              <section key={circle.id} aria-labelledby={`experience-visualisations-${circle.id}`}>
                <h4 id={`experience-visualisations-${circle.id}`} className="font-serif text-2xl leading-tight">{circle.label}</h4>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-studio-body">{circle.hint}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-studio-eyebrow">{countCopy(items.length)}</p>
                {items.length === 0 ? <p className="mt-3 text-sm text-studio-muted">No visualisations here yet.</p> : (
                  <TopicCarousel
                    className="mt-2"
                    label={circle.label}
                    itemNoun="visualisation"
                    cardWidth="collection"
                    items={items}
                    index={topicIndex(items, focus[circle.id])}
                    onIndex={(next) => {
                      const item = items[next]
                      if (!item) return
                      setFocus((current) => ({ ...current, [circle.id]: item.id }))
                    }}
                    renderItem={(item, interactive) => (
                      <VisualisationCard concept={item} circle={circle.id} interactive={interactive} onOpen={() => setOpenId(item.id)} />
                    )}
                  />
                )}
              </section>
            )
          })}
        </div>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-30 overflow-y-auto bg-studio-cream px-4 py-6 sm:px-8 sm:py-10">
          <div className="mx-auto max-w-5xl">
            <ConceptEditor
              concept={open}
              workspace={workspace}
              onChange={onChange}
              onClose={() => setOpenId(null)}
              saving={saving}
              savedConceptId={savedConceptId}
              closeLabel="Back to this experience"
            />
          </div>
        </div>
      ) : null}
    </section>
  )
}
