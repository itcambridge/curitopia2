'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Columns2, Pencil } from 'lucide-react'
import { ComparisonSelect, ConceptComparison } from '@/components/studio/concept-comparison'
import { ConceptEditor } from '@/components/studio/concept-editor'
import { StageMark } from '@/components/studio/stage-mark'
import { Eyebrow, IconAction, panelClass } from '@/components/studio/studio-ui'
import { studioPath } from '@/lib/paths'
import { carouselOffset, conceptCardQuestion, conceptQuestionCopy, conceptRemainsVisible, orderedConcepts, questionDispositionMap, selectedConceptIndex, stepConceptIndex } from '@/lib/questions/library-carousel'
import { reconcileComparisonScope, type ComparisonPair } from '@/lib/questions/comparison'
import { allCuriositiesFocus, emptyLibraryMessage, hiddenLibraryMessage, libraryConceptsForFocus, libraryCuriosityName, libraryFocusChoices, libraryOriginLabel, workspaceFocusForLibraryConcept } from '@/lib/questions/library-focus'
import { listAccountConcepts } from '@/lib/questions/supabase-concepts'
import { listCuriosityNames } from '@/lib/questions/supabase-curiosities'
import { listQuestionDispositions } from '@/lib/questions/supabase-questions'
import type { ConceptRecord, LibraryConcept, Workspace } from '@/lib/questions/types'

const heroFrame = 'h-[min(88vw,24rem)] sm:h-[28rem] xl:h-[36rem]'
const textLinkClass = 'text-sm font-semibold text-studio-ink underline decoration-studio-line underline-offset-4 hover:decoration-studio-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral'

export function LibraryView({
  workspace,
  onChange,
  openCuriosityId,
  openCuriosityName = null,
  initialFocus,
  returnHref = null,
  requestedEditId = null,
  onEditClosed,
  saving = false,
  savedConceptId = null,
}: {
  workspace: Workspace
  onChange: (workspace: Workspace) => void
  openCuriosityId: string | null
  openCuriosityName?: string | null
  initialFocus: string
  returnHref?: string | null
  requestedEditId?: string | null
  onEditClosed?: () => void
  saving?: boolean
  savedConceptId?: string | null
}) {
  const focusId = useId()
  const [focus, setFocus] = useState(initialFocus)
  const [activeId, setActiveId] = useState<string | null>(workspace.focusConceptId)
  const [records, setRecords] = useState<LibraryConcept[] | null>(null)
  const [questionRows, setQuestionRows] = useState<{ id: string; disposition: string }[]>([])
  const [names, setNames] = useState<{ id: string; name: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [picks, setPicks] = useState<string[] | null>(null)
  const [pair, setPair] = useState<ComparisonPair | null>(null)
  const [scopeNotice, setScopeNotice] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(requestedEditId)
  const conceptStamp = workspace.concepts.map((concept) => `${concept.id}:${concept.updatedAt}:${concept.title}:${concept.questionIds.join(',')}`).join('|')
  const questionStamp = workspace.questions.map((question) => `${question.id}:${question.disposition}`).join('|')
  const dispositions = questionDispositionMap(questionRows, workspace.questions)
  const visibleRecords = (records ?? []).filter((concept) => conceptRemainsVisible(concept, dispositions))
  const concepts = orderedConcepts(libraryConceptsForFocus(visibleRecords, focus))
  const scopedCount = libraryConceptsForFocus(records ?? [], focus).length
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
        const [nextConcepts, nextNames, nextQuestions] = await Promise.all([
          listAccountConcepts(),
          listCuriosityNames(),
          listQuestionDispositions(),
        ])
        if (cancelled) return
        setRecords(nextConcepts)
        setNames(nextNames)
        setQuestionRows(nextQuestions)
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
  }, [conceptStamp, questionStamp])

  useEffect(() => {
    setEditingId(requestedEditId)
  }, [requestedEditId])

  function selectFocus(next: string) {
    const scoped = libraryConceptsForFocus(visibleRecords, next)
    const allowed = new Set(scoped.map((concept) => concept.id))
    const label = next === allCuriositiesFocus ? null : libraryCuriosityName(next, names) ?? (next === openCuriosityId ? openCuriosityName : null)
    const nextComparison = reconcileComparisonScope(pair, picks, allowed, scoped.length, label)
    setFocus(next)
    setActiveId(null)
    if (nextComparison.mode === 'idle') {
      setScopeNotice(null)
      return
    }
    if (nextComparison.mode === 'pair') {
      setPair(nextComparison.pair)
      setScopeNotice(null)
      return
    }
    if (nextComparison.mode === 'select') {
      setPair(null)
      setPicks(nextComparison.picks)
      setScopeNotice(nextComparison.notice)
      return
    }
    setPair(null)
    setPicks(null)
    setScopeNotice(nextComparison.notice)
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
    setPair(null)
    setPicks(null)
    setEditingId(concept.id)
    if (mirror.focusConceptId === workspace.focusConceptId) return
    onChange({ ...workspace, stage: 'library', focusConceptId: mirror.focusConceptId, focusQuestionId: mirror.focusQuestionId })
  }

  const visibleKey = concepts.map((concept) => concept.id).join('|')
  useEffect(() => {
    if (records === null || (!pair && !picks)) return
    const allowed = new Set(concepts.map((concept) => concept.id))
    const label = focus === allCuriositiesFocus ? null : focusName
    const next = reconcileComparisonScope(pair, picks, allowed, concepts.length, label)
    if (next.mode === 'pair') {
      if (pair && next.pair.leftId === pair.leftId && next.pair.rightId === pair.rightId) return
      setPair(next.pair)
      setScopeNotice(null)
      return
    }
    if (next.mode === 'idle') {
      if (!pair && !picks && !scopeNotice) return
      setPair(null)
      setPicks(null)
      setScopeNotice(null)
      return
    }
    if (next.mode === 'select') {
      const same = picks !== null && picks.length === next.picks.length && picks.every((id, index) => id === next.picks[index]) && pair === null && scopeNotice === next.notice
      if (same) return
      setPair(null)
      setPicks(next.picks)
      setScopeNotice(next.notice)
      return
    }
    if (pair === null && picks === null && scopeNotice === next.notice) return
    setPair(null)
    setPicks(null)
    setScopeNotice(next.notice)
  }, [visibleKey, records, pair, picks, focus, focusName, concepts, scopeNotice])

  const editing = editingId
    ? visibleRecords.find((concept) => concept.id === editingId)
      ?? workspace.concepts.find((concept) => concept.id === editingId && conceptRemainsVisible(concept, dispositions))
      ?? null
    : null
  const gallery = records !== null && !editing && !pair && !picks && concepts.length > 0

  return (
    <div className="min-w-0">
      <header className={pair || picks ? 'mb-3' : 'mb-8'}>
        {pair || picks ? null : <Eyebrow>Library</Eyebrow>}
        <h2 className={`font-serif text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl ${pair || picks || editing ? 'sr-only' : 'mt-2'}`}>
          Concepts worth
          <br />
          <em className="text-studio-coral">looking at again.</em>
        </h2>
        <div className={`flex min-w-0 items-end gap-2 ${pair || picks ? '' : 'mt-5'}`}>
          <div className="min-w-0 flex-1 sm:flex-none">
            <label htmlFor={focusId} className="text-sm font-semibold">Library scope</label>
            <select
              id={focusId}
              value={focus}
              onChange={(event) => selectFocus(event.target.value)}
              className="mt-2 block min-h-11 w-full min-w-0 rounded-2xl border border-studio-line bg-studio-cream px-4 py-3 text-base font-normal sm:w-56"
            >
              {options.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
          </div>
          {concepts.length > 1 && pair === null && picks === null ? (
            <IconAction label="Compare concepts" treatment="quiet" tipAlign="end" onClick={() => { setScopeNotice(null); setPicks([]); setPair(null) }}>
              <Columns2 aria-hidden="true" />
            </IconAction>
          ) : null}
        </div>
        {concepts.length > 1 && pair === null && picks === null ? <p className="mt-3 max-w-xl text-sm leading-relaxed text-studio-body">Compare two concepts from this scope.</p> : null}
        {pair || picks || gallery || editing ? null : <StageMark stage="library" placement="content" />}
      </header>
      {error && records !== null ? <p role="alert" className="mb-4 text-sm">{error}</p> : null}
      {scopeNotice && !picks ? <p role="status" className="mb-4 text-sm text-studio-body">{scopeNotice}</p> : null}
      {error && records === null ? (
        <div className={panelClass}>
          <p className="max-w-xl text-studio-body">{error} Refresh the page to try again. Nothing was removed from the account.</p>
        </div>
      ) : records === null ? (
        <p className="text-sm text-studio-muted">Opening the library…</p>
      ) : editing ? (
        <ConceptEditor
          concept={editing}
          workspace={workspace}
          onChange={onChange}
          onClose={() => { setEditingId(null); onEditClosed?.() }}
          saving={saving}
          savedConceptId={savedConceptId}
        />
      ) : pair ? (
        <ConceptComparison
          concepts={concepts}
          names={names}
          questions={workspace.questions}
          workspace={workspace}
          pair={pair}
          scopeLabel={focus === allCuriositiesFocus ? null : focusName}
          openCuriosityId={openCuriosityId}
          onPair={setPair}
          onChange={onChange}
          onClose={() => { setPair(null); setScopeNotice(null) }}
        />
      ) : picks ? (
        <ComparisonSelect
          concepts={concepts}
          names={names}
          questions={workspace.questions}
          picks={picks}
          scopeLabel={focus === allCuriositiesFocus ? null : focusName}
          notice={scopeNotice}
          onPicks={setPicks}
          onReady={(next) => { setPair(next); setPicks(null); setScopeNotice(null) }}
          onCancel={() => { setPicks(null); setScopeNotice(null) }}
        />
      ) : concepts.length === 0 ? (
        <div className={panelClass}>
          <p className="max-w-xl text-studio-body">{scopedCount > 0 ? hiddenLibraryMessage() : emptyLibraryMessage(focus, focusName)}</p>
          {returnHref ? (
            <Link href={returnHref} className={`${textLinkClass} mt-4 inline-block`}>Return to your curiosities</Link>
          ) : (
            <button type="button" className={`${textLinkClass} mt-4`} onClick={() => onChange({ ...workspace, stage: 'gather' })}>Return to the garden</button>
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
              const offset = carouselOffset(index, selectedIndex, concepts.length)
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
          <StageMark stage="library" placement="content" />
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
          className="absolute inset-0 rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-studio-coral"
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
    <div className={`relative overflow-hidden rounded-3xl bg-studio-ink ${heroFrame}`}>
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
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-studio-ink via-studio-ink/75 to-transparent px-4 pb-14 pt-4 text-center sm:px-6 sm:pt-6">
        <Title className="text-balance font-serif text-3xl leading-none tracking-[-0.03em] text-studio-ivory sm:text-4xl">{title}</Title>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-studio-ink via-studio-ink/80 to-transparent px-4 pb-4 pt-16 text-center sm:px-6 sm:pb-5">
        <p className={`${heading ? 'pointer-events-auto max-h-32 overflow-y-auto text-base sm:text-lg' : 'line-clamp-3 text-sm'} text-balance font-serif leading-snug text-studio-ivory`}>{question}</p>
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
      <div className="mt-3 flex items-center justify-center gap-2">
        <IconAction label="Show the previous concept" treatment="quiet" tipAlign="start" disabled={count < 2} onClick={() => onMove(-1)}>
          <ChevronLeft aria-hidden="true" />
        </IconAction>
        <p className="min-w-16 font-mono text-[10px] uppercase tracking-[0.18em] text-studio-eyebrow">{index + 1} of {count}</p>
        <IconAction label="Show the next concept" treatment="quiet" tipAlign="end" disabled={count < 2} onClick={() => onMove(1)}>
          <ChevronRight aria-hidden="true" />
        </IconAction>
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
      <div className="mt-4 flex justify-center">
        <IconAction label="Edit this concept" treatment="quiet" href={reviseHref ?? undefined} onClick={reviseHref ? undefined : onRevise}>
          <Pencil aria-hidden="true" />
        </IconAction>
      </div>
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
