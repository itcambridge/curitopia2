'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ComparisonSelect, ConceptComparison } from '@/components/studio/concept-comparison'
import { StageMark } from '@/components/studio/stage-mark'
import { Eyebrow, coralButton, panelClass, quietButton } from '@/components/studio/studio-ui'
import { studioPath } from '@/lib/paths'
import { conceptCardQuestion, conceptQuestionCopy, orderedConcepts, selectedConceptIndex, stepConceptIndex } from '@/lib/questions/library-carousel'
import type { ComparisonPair } from '@/lib/questions/comparison'
import { emptyLibraryMessage, libraryConceptsForFocus, libraryCuriosityName, libraryFocusChoices, libraryOriginLabel, workspaceFocusForLibraryConcept } from '@/lib/questions/library-focus'
import { listAccountConcepts } from '@/lib/questions/supabase-concepts'
import { listCuriosityNames } from '@/lib/questions/supabase-curiosities'
import type { ConceptRecord, LibraryConcept, Workspace } from '@/lib/questions/types'

const navButton = 'grid size-11 place-items-center rounded-full border border-studio-line bg-studio-paper text-studio-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral disabled:opacity-40'
const heroFrame = 'h-[min(88vw,24rem)] sm:h-[28rem] xl:h-[36rem]'

export function LibraryView({
  workspace,
  onChange,
  openCuriosityId,
  openCuriosityName = null,
  initialFocus,
  returnHref = null,
}: {
  workspace: Workspace
  onChange: (workspace: Workspace) => void
  openCuriosityId: string | null
  openCuriosityName?: string | null
  initialFocus: string
  returnHref?: string | null
}) {
  const focusId = useId()
  const [focus, setFocus] = useState(initialFocus)
  const [activeId, setActiveId] = useState<string | null>(workspace.focusConceptId)
  const [records, setRecords] = useState<LibraryConcept[] | null>(null)
  const [names, setNames] = useState<{ id: string; name: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [picks, setPicks] = useState<string[] | null>(null)
  const [pair, setPair] = useState<ComparisonPair | null>(null)
  const conceptStamp = workspace.concepts.map((concept) => `${concept.id}:${concept.updatedAt}:${concept.title}:${concept.questionIds.join(',')}`).join('|')
  const concepts = orderedConcepts(libraryConceptsForFocus(records ?? [], focus))
  const selectedIndex = selectedConceptIndex(concepts, activeId)
  const selected = selectedIndex >= 0 ? concepts[selectedIndex] : null
  const spread = useCoverSpread()
  const reducedMotion = useReducedMotion()
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const ignoreClick = useRef(false)
  const choices = libraryFocusChoices(names)
  const options = choices.some((choice) => choice.id === focus)
    ? choices
    : [choices[0], { id: focus, name: openCuriosityName ?? 'This curiosity' }, ...choices.slice(1)]
  const focusName = libraryCuriosityName(focus, names) ?? (focus === openCuriosityId ? openCuriosityName : null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [nextConcepts, nextNames] = await Promise.all([listAccountConcepts(), listCuriosityNames()])
        if (cancelled) return
        setRecords(nextConcepts)
        setNames(nextNames)
        setError(null)
      } catch (reason) {
        if (cancelled) return
        setError(reason instanceof Error ? reason.message : 'The library could not be loaded.')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [conceptStamp])

  function selectFocus(next: string) {
    setFocus(next)
    setActiveId(null)
  }

  function choose(index: number) {
    const concept = concepts[index]
    if (!concept || concept.id === activeId) return
    setActiveId(concept.id)
    const mirror = workspaceFocusForLibraryConcept(workspace.concepts, concept, openCuriosityId)
    if (!mirror || mirror.focusConceptId === workspace.focusConceptId) return
    onChange({ ...workspace, focusConceptId: mirror.focusConceptId, focusQuestionId: mirror.focusQuestionId })
  }

  function move(direction: -1 | 1) {
    choose(stepConceptIndex(selectedIndex, concepts.length, direction))
  }

  function revise(concept: LibraryConcept) {
    const mirror = workspaceFocusForLibraryConcept(workspace.concepts, concept, openCuriosityId)
    if (!mirror) return
    onChange({ ...workspace, stage: 'distil', focusConceptId: mirror.focusConceptId, focusQuestionId: mirror.focusQuestionId })
  }

  return (
    <div className="min-w-0">
      <header className={pair || picks ? 'mb-3' : 'mb-8'}>
        {pair || picks ? null : <Eyebrow>Library</Eyebrow>}
        <h2 className={`font-serif text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl ${pair || picks ? 'sr-only' : 'mt-2'}`}>
          Concepts worth
          <br />
          <em className="text-studio-coral">looking at again.</em>
        </h2>
        <div className={`flex min-w-0 flex-wrap items-center gap-2 ${pair || picks ? '' : 'mt-5'}`}>
          <label htmlFor={focusId} className="shrink-0 text-sm font-semibold">Library scope</label>
          <select
            id={focusId}
            value={focus}
            onChange={(event) => selectFocus(event.target.value)}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-studio-line bg-studio-cream px-3 py-2 text-sm font-normal sm:w-auto sm:min-w-56 sm:max-w-xs sm:flex-none"
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
          {records && records.length > 1 && pair === null && picks === null ? (
            <button type="button" className={`${quietButton} w-full sm:w-auto`} onClick={() => { setPicks([]); setPair(null) }}>Compare</button>
          ) : null}
        </div>
        {pair || picks ? null : <StageMark stage="library" placement="content" />}
      </header>
      {error && records !== null ? <p role="alert" className="mb-4 text-sm">{error}</p> : null}
      {error && records === null ? (
        <div className={panelClass}>
          <p className="max-w-xl text-studio-body">{error} Refresh the page to try again. Nothing was removed from the account.</p>
        </div>
      ) : records === null ? (
        <p className="text-sm text-studio-muted">Opening the library…</p>
      ) : pair ? (
        <ConceptComparison
          concepts={records}
          names={names}
          questions={workspace.questions}
          workspace={workspace}
          pair={pair}
          openCuriosityId={openCuriosityId}
          onPair={setPair}
          onChange={onChange}
          onClose={() => setPair(null)}
        />
      ) : picks ? (
        <ComparisonSelect
          concepts={records}
          names={names}
          questions={workspace.questions}
          picks={picks}
          onPicks={setPicks}
          onReady={(next) => { setPair(next); setPicks(null) }}
          onCancel={() => setPicks(null)}
        />
      ) : concepts.length === 0 ? (
        <div className={panelClass}>
          <p className="max-w-xl text-studio-body">{emptyLibraryMessage(focus, focusName)}</p>
          {returnHref ? (
            <Link href={returnHref} className={`${coralButton} mt-4 inline-block`}>Return to your curiosities</Link>
          ) : (
            <button type="button" className={`${coralButton} mt-4`} onClick={() => onChange({ ...workspace, stage: 'gather' })}>Return to the garden</button>
          )}
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
                  question={conceptCardQuestion(concept, workspace.questions)}
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
          {selected && (
            <ConceptDetail
              concept={selected}
              workspace={workspace}
              index={selectedIndex}
              count={concepts.length}
              origin={libraryOriginLabel(focus, libraryCuriosityName(selected.curiosityId, names))}
              reviseHref={workspaceFocusForLibraryConcept(workspace.concepts, selected, openCuriosityId)
                ? null
                : studioPath(`/?curiosity=${encodeURIComponent(selected.curiosityId)}&concept=${encodeURIComponent(selected.id)}`)}
              onMove={move}
              onRevise={() => revise(selected)}
            />
          )}
        </div>
      )}
    </div>
  )
}

function ConceptSlide({
  concept,
  question,
  current,
  offset,
  spread,
  reducedMotion,
  onChoose,
}: {
  concept: ConceptRecord
  question: string
  current: boolean
  offset: number
  spread: number
  reducedMotion: boolean
  onChoose: () => void
}) {
  const scale = current ? 1 : 0.78
  const rotate = reducedMotion || current ? 0 : offset * -14
  const className = 'absolute top-1/2 w-[92%] max-w-[40rem] transition-transform duration-500 ease-out motion-reduce:transition-none sm:w-[72%] xl:w-[62%]'
  const style = {
    left: `${50 + offset * spread}%`,
    zIndex: current ? 2 : 1,
    opacity: current ? 1 : 0.9,
    transform: `translate(-50%, -50%) scale(${scale}) rotateY(${rotate}deg)`,
  }
  return (
    <div className={className} style={style} aria-current={current ? 'true' : undefined}>
      <ConceptCard src={concept.imageSrc} title={concept.title} question={question} heading={current} />
      {!current && (
        <button
          type="button"
          className="absolute inset-0 rounded-[28px] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-studio-coral"
          onClick={onChoose}
        >
          <span className="sr-only">Show {concept.title}</span>
        </button>
      )}
    </div>
  )
}

function ConceptCard({ src, title, question, heading }: { src: string; title: string; question: string; heading: boolean }) {
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
  const Title = heading ? 'h3' : 'p'
  return (
    <div className={`relative overflow-hidden rounded-[28px] bg-studio-ink ${heroFrame}`}>
      {phase === 'loading' && <span className="absolute inset-0 grid place-items-center px-4 text-center text-sm text-studio-ivory">Opening image…</span>}
      {phase === 'error' && <span className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-studio-ivory">This image could not be opened.</span>}
      {phase !== 'error' && (
        <img
          ref={imageRef}
          src={src}
          alt=""
          onLoad={() => setPhase('ready')}
          onError={() => setPhase('error')}
          className={`h-full w-full object-contain ${phase === 'ready' ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-studio-ink/90 via-studio-ink/50 to-transparent px-4 pb-16 pt-4 text-center sm:px-6 sm:pt-6">
        <Title className="text-balance font-serif text-3xl leading-none tracking-[-0.03em] text-studio-ivory sm:text-4xl">{title}</Title>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-studio-ink/90 via-studio-ink/55 to-transparent px-4 pb-4 pt-16 text-center sm:px-6 sm:pb-5">
        <p className={`${heading ? 'max-h-28 overflow-y-auto pointer-events-auto' : 'line-clamp-3'} text-balance font-serif text-sm leading-snug text-studio-ivory sm:text-base`}>{question}</p>
      </div>
    </div>
  )
}

function ConceptDetail({
  concept,
  workspace,
  index,
  count,
  origin,
  reviseHref,
  onMove,
  onRevise,
}: {
  concept: ConceptRecord
  workspace: Workspace
  index: number
  count: number
  origin: string | null
  reviseHref: string | null
  onMove: (direction: -1 | 1) => void
  onRevise: () => void
}) {
  const question = conceptCardQuestion(concept, workspace.questions)
  const linked = conceptQuestionCopy(concept, workspace.questions).questions
  const others = linked.filter((text) => text !== question)
  const linkedCount = linked.length
  const countLabel = linkedCount === 1 ? 'One question' : linkedCount === 0 ? 'No linked questions' : `${linkedCount} questions`
  return (
    <div className="mx-auto mt-5 max-w-2xl text-center">
      <p aria-live="polite" className="sr-only">{concept.title}. {question}</p>
      {origin ? <p className="text-balance break-words text-sm text-studio-body">{origin}</p> : null}
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
      {others.length > 0 && (
        <div className="mt-4">
          <Eyebrow>Other questions that informed it</Eyebrow>
          <ul className="mt-3 flex flex-col gap-2">
            {others.map((text) => (
              <li key={text} className="font-serif text-lg leading-snug text-studio-ink">{text}</li>
            ))}
          </ul>
        </div>
      )}
      {reviseHref ? (
        <Link href={reviseHref} className={`${quietButton} mt-4 inline-block`}>Revise in Distil</Link>
      ) : (
        <button type="button" className={`${quietButton} mt-4`} onClick={onRevise}>Revise in Distil</button>
      )}
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
