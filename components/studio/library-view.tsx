'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { StageMark } from '@/components/studio/stage-mark'
import { Eyebrow, coralButton, panelClass, quietButton } from '@/components/studio/studio-ui'
import { conceptQuestionCopy, orderedConcepts, selectedConceptIndex, stepConceptIndex } from '@/lib/questions/library-carousel'
import type { ConceptRecord, Workspace } from '@/lib/questions/types'

const navButton = 'grid size-11 place-items-center rounded-full border border-studio-line bg-studio-paper text-studio-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral disabled:opacity-40'
const heroFrame = 'h-[min(88vw,24rem)] sm:h-[28rem] xl:h-[36rem]'

export function LibraryView({ workspace, onChange, conceptsLoaded }: { workspace: Workspace; onChange: (workspace: Workspace) => void; conceptsLoaded: boolean }) {
  const concepts = orderedConcepts(workspace.concepts)
  const selectedIndex = selectedConceptIndex(concepts, workspace.focusConceptId)
  const selected = selectedIndex >= 0 ? concepts[selectedIndex] : null
  const spread = useCoverSpread()
  const reducedMotion = useReducedMotion()
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const ignoreClick = useRef(false)

  function choose(index: number) {
    const concept = concepts[index]
    if (!concept || concept.id === workspace.focusConceptId) return
    onChange({ ...workspace, focusConceptId: concept.id, focusQuestionId: concept.anchorQuestionId })
  }

  function move(direction: -1 | 1) {
    choose(stepConceptIndex(selectedIndex, concepts.length, direction))
  }

  return (
    <div className="min-w-0">
      <header className="mb-8">
        <Eyebrow>Library</Eyebrow>
        <h2 className="mt-2 font-serif text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">
          Concepts worth
          <br />
          <em className="text-studio-coral">looking at again.</em>
        </h2>
        <StageMark stage="library" placement="content" />
      </header>
      {!conceptsLoaded ? (
        <div className={panelClass}>
          <p className="max-w-xl text-studio-body">The library could not be loaded. Refresh the page to try again. Nothing was removed from the account.</p>
        </div>
      ) : concepts.length === 0 ? (
        <div className={panelClass}>
          <p className="max-w-xl text-studio-body">Nothing is saved yet. Gather a few questions, retain the ones you want to see, then save a concept from Distil.</p>
          <button type="button" className={`${coralButton} mt-4`} onClick={() => onChange({ ...workspace, stage: 'gather' })}>Gather questions</button>
        </div>
      ) : (
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Saved concepts"
          className="mx-auto min-w-0 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-studio-coral"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault()
              move(-1)
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault()
              move(1)
            }
          }}
        >
          <div
            className={`relative overflow-hidden ${heroFrame}`}
            style={{ perspective: reducedMotion ? undefined : '1400px', touchAction: 'pan-y' }}
            onPointerDown={(event) => {
              if (event.pointerType === 'mouse') return
              swipe.current = { x: event.clientX, y: event.clientY }
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
            onPointerUp={(event) => {
              const start = swipe.current
              swipe.current = null
              if (!start) return
              const dx = event.clientX - start.x
              const dy = event.clientY - start.y
              if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return
              ignoreClick.current = true
              window.setTimeout(() => {
                ignoreClick.current = false
              }, 0)
              move(dx > 0 ? -1 : 1)
            }}
            onPointerCancel={() => {
              swipe.current = null
            }}
          >
            {concepts.map((concept, index) => {
              const offset = index - selectedIndex
              if (Math.abs(offset) > 1) return null
              const current = offset === 0
              return (
                <ConceptSlide
                  key={concept.id}
                  concept={concept}
                  current={current}
                  offset={offset}
                  spread={spread}
                  reducedMotion={reducedMotion}
                  onChoose={() => {
                    if (ignoreClick.current) {
                      ignoreClick.current = false
                      return
                    }
                    choose(index)
                  }}
                />
              )
            })}
          </div>
          {selected && <ConceptDetail concept={selected} workspace={workspace} index={selectedIndex} count={concepts.length} onMove={move} onChange={onChange} />}
        </div>
      )}
    </div>
  )
}

function ConceptSlide({
  concept,
  current,
  offset,
  spread,
  reducedMotion,
  onChoose,
}: {
  concept: ConceptRecord
  current: boolean
  offset: number
  spread: number
  reducedMotion: boolean
  onChoose: () => void
}) {
  const scale = current ? 1 : 0.78
  const rotate = reducedMotion || current ? 0 : offset * -14
  const frame = <ConceptImage src={concept.imageSrc} alt="" />
  const className = 'absolute top-1/2 w-[92%] max-w-[40rem] transition-transform duration-500 ease-out motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-studio-coral sm:w-[72%] xl:w-[62%]'
  const style = {
    left: `${50 + offset * spread}%`,
    zIndex: current ? 2 : 1,
    opacity: current ? 1 : 0.9,
    transform: `translate(-50%, -50%) scale(${scale}) rotateY(${rotate}deg)`,
  }
  if (current) {
    return (
      <div className={className} style={style} aria-current="true">
        {frame}
      </div>
    )
  }
  return (
    <button type="button" className={className} style={style} onClick={onChoose}>
      <span className="sr-only">Show {concept.title}</span>
      {frame}
    </button>
  )
}

function ConceptImage({ src, alt }: { src: string; alt: string }) {
  const imageRef = useRef<HTMLImageElement>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  useEffect(() => {
    const image = imageRef.current
    if (image?.complete && image.naturalWidth > 0) {
      setPhase('ready')
      return
    }
    setPhase('loading')
  }, [src])
  return (
    <span className={`relative block overflow-hidden rounded-[28px] bg-studio-paper ${heroFrame}`}>
      {phase === 'loading' && <span className="absolute inset-0 grid place-items-center px-4 text-center text-sm text-studio-body">Opening image…</span>}
      {phase === 'error' && <span className="absolute inset-0 grid place-items-center px-4 text-center text-sm text-studio-body">This image could not be opened.</span>}
      {phase !== 'error' && (
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          onLoad={() => setPhase('ready')}
          onError={() => setPhase('error')}
          className={`h-full w-full object-contain ${phase === 'ready' ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </span>
  )
}

function ConceptDetail({
  concept,
  workspace,
  index,
  count,
  onMove,
  onChange,
}: {
  concept: ConceptRecord
  workspace: Workspace
  index: number
  count: number
  onMove: (direction: -1 | 1) => void
  onChange: (workspace: Workspace) => void
}) {
  const copy = conceptQuestionCopy(concept, workspace.questions)
  const countLabel = copy.questions.length === 1 ? 'One question' : copy.questions.length === 0 ? 'No linked questions' : `${copy.questions.length} questions`
  return (
    <div className="mx-auto mt-5 max-w-2xl text-center">
      <h3 aria-live="polite" className="font-serif text-4xl leading-tight tracking-[-0.03em] sm:text-5xl">{concept.title}</h3>
      <div className="mt-3 flex items-center justify-center gap-3">
        <button type="button" className={navButton} aria-label="Show the previous concept" disabled={index <= 0} onClick={() => onMove(-1)}>
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <p className="min-w-16 font-mono text-[10px] uppercase tracking-[0.18em] text-studio-eyebrow">{index + 1} of {count}</p>
        <button type="button" className={navButton} aria-label="Show the next concept" disabled={index >= count - 1} onClick={() => onMove(1)}>
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-4">
        <Eyebrow>
          {countLabel}
          {concept.imageSource === 'demo' ? ' · Demo fixture' : ''}
        </Eyebrow>
      </div>
      {copy.questions.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {copy.questions.map((text) => (
            <li key={text} className="font-serif text-lg leading-snug text-studio-ink">{text}</li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className={`${quietButton} mt-4`}
        onClick={() => onChange({ ...workspace, stage: 'distil', focusConceptId: concept.id, focusQuestionId: concept.anchorQuestionId })}
      >
        Revise in Distil
      </button>
    </div>
  )
}

function useCoverSpread() {
  const [spread, setSpread] = useState(46)
  useEffect(() => {
    const tablet = window.matchMedia('(min-width: 640px)')
    const desktop = window.matchMedia('(min-width: 1024px)')
    const update = () => setSpread(desktop.matches ? 34 : tablet.matches ? 38 : 46)
    update()
    tablet.addEventListener('change', update)
    desktop.addEventListener('change', update)
    return () => {
      tablet.removeEventListener('change', update)
      desktop.removeEventListener('change', update)
    }
  }, [])
  return spread
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return reduced
}
