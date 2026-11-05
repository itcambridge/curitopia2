'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Eyebrow, coralButton, quietButton } from '@/components/studio/studio-ui'
import { conceptCardQuestion } from '@/lib/questions/library-carousel'
import { libraryCuriosityName } from '@/lib/questions/library-focus'
import { filterComparisonConcepts, questionFromReflection, replaceComparison, swapComparison, toggleComparisonPick, type ComparisonPair } from '@/lib/questions/comparison'
import { insertQuestion } from '@/lib/questions/supabase-questions'
import { addQuestion, createQuestion } from '@/lib/questions/workspace'
import type { LibraryConcept, QuestionRecord, Workspace } from '@/lib/questions/types'

const frame = 'h-36 w-full object-contain sm:h-72 lg:h-[min(68vh,34rem)]'

export function ComparisonSelect({
  concepts,
  names,
  questions,
  picks,
  onPicks,
  onReady,
  onCancel,
}: {
  concepts: LibraryConcept[]
  names: { id: string; name: string }[]
  questions: QuestionRecord[]
  picks: string[]
  onPicks: (picks: string[]) => void
  onReady: (pair: ComparisonPair) => void
  onCancel: () => void
}) {
  const searchId = useId()
  const [query, setQuery] = useState('')
  const visible = filterComparisonConcepts(concepts, query, (concept) => comparisonText(concept, names, questions))
  const chosen = picks.flatMap((id) => {
    const concept = concepts.find((item) => item.id === id)
    return concept ? [concept] : []
  })

  function pick(id: string) {
    const next = toggleComparisonPick(picks, id)
    if (next.status === 'full') return
    if (next.status === 'ready' && next.picks[0] && next.picks[1]) {
      onReady({ leftId: next.picks[0], rightId: next.picks[1] })
      return
    }
    onPicks(next.picks)
  }

  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">Choose two concepts</h2>
        <button type="button" className={quietButton} onClick={onCancel}>Cancel</button>
      </div>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-studio-body">Choose any saved concepts. The list includes every curiosity, whichever one Show is set to.</p>
      <ol className="mt-4 grid grid-cols-2 gap-2">
        {[0, 1].map((slot) => {
          const concept = chosen[slot]
          return (
            <li key={slot} className="min-w-0 rounded-2xl border border-studio-line bg-studio-paper px-3 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-studio-eyebrow">{slot === 0 ? 'First' : 'Second'}</p>
              <p className="mt-1 truncate font-serif text-lg">{concept?.title ?? 'Not chosen'}</p>
            </li>
          )
        })}
      </ol>
      <label htmlFor={searchId} className="mt-5 block text-sm font-semibold">
        Search
        <input
          id={searchId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Title, question, or curiosity"
          className="mt-2 w-full rounded-xl border border-studio-line bg-studio-cream px-3 py-2.5 font-normal"
        />
      </label>
      <ConceptChoiceList concepts={visible} names={names} questions={questions} picks={picks} blockedId={null} onPick={pick} />
    </section>
  )
}

export function ConceptComparison({
  concepts,
  names,
  questions,
  workspace,
  pair,
  openCuriosityId,
  onPair,
  onChange,
  onClose,
}: {
  concepts: LibraryConcept[]
  names: { id: string; name: string }[]
  questions: QuestionRecord[]
  workspace: Workspace
  pair: ComparisonPair
  openCuriosityId: string | null
  onPair: (pair: ComparisonPair) => void
  onChange: (workspace: Workspace) => void
  onClose: () => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const curiosityField = useId()
  const thoughtField = useId()
  const [replacing, setReplacing] = useState<'left' | 'right' | null>(null)
  const [query, setQuery] = useState('')
  const [thought, setThought] = useState('')
  const [destination, setDestination] = useState('')
  const [planting, setPlanting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const left = concepts.find((concept) => concept.id === pair.leftId) ?? null
  const right = concepts.find((concept) => concept.id === pair.rightId) ?? null
  const visible = filterComparisonConcepts(concepts, query, (concept) => comparisonText(concept, names, questions))

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  function chooseReplacement(conceptId: string) {
    if (!replacing) return
    const currentId = replacing === 'left' ? pair.leftId : pair.rightId
    if (conceptId === currentId) {
      setReplacing(null)
      setQuery('')
      return
    }
    const next = replaceComparison(pair, replacing, conceptId)
    if (!next) return
    onPair(next)
    setReplacing(null)
    setQuery('')
  }

  async function plant() {
    const prepared = questionFromReflection(thought)
    if (!prepared.ok) {
      setProblem(prepared.error)
      setNotice(null)
      return
    }
    if (!destination) {
      setProblem('Choose which curiosity should keep this question.')
      setNotice(null)
      return
    }
    const curiosityName = libraryCuriosityName(destination, names) ?? 'that curiosity'
    setPlanting(true)
    setProblem(null)
    setNotice(null)
    try {
      if (destination === openCuriosityId) {
        const next = addQuestion(workspace, prepared.text)
        if (next === workspace) {
          setProblem('Keep a question within 2000 characters.')
          return
        }
        onChange(next)
      } else {
        await insertQuestion(createQuestion(prepared.text), destination)
      }
      setThought('')
      setNotice(`Planted in ${curiosityName}. It is in that garden.`)
    } catch (reason) {
      setProblem(reason instanceof Error ? reason.message : 'The question could not be planted.')
    } finally {
      setPlanting(false)
    }
  }

  return (
    <section className="min-w-0 overflow-x-clip">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 ref={headingRef} tabIndex={-1} className="font-serif text-2xl tracking-tight outline-none sm:text-4xl">Side by side</h2>
        <button type="button" className={quietButton} onClick={onClose}>Back to the library</button>
      </div>
      <p className="sr-only">{left?.title ?? 'Missing concept'} and {right?.title ?? 'Missing concept'}.</p>
      <div className="-mx-1 mt-3 grid grid-cols-2 items-start gap-2 sm:mx-0 sm:mt-6 sm:gap-6 lg:gap-10">
        <ComparedConcept key={pair.leftId} concept={left} questions={questions} names={names} />
        <ComparedConcept key={pair.rightId} concept={right} questions={questions} names={names} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center">
        <button type="button" className={`${quietButton} col-span-2 w-full sm:w-auto`} onClick={() => { setReplacing(null); onPair(swapComparison(pair)) }}>Swap sides</button>
        <button type="button" className={`${quietButton} w-full sm:w-auto`} onClick={() => { setReplacing('left'); setQuery('') }}>Replace left</button>
        <button type="button" className={`${quietButton} w-full sm:w-auto`} onClick={() => { setReplacing('right'); setQuery('') }}>Replace right</button>
      </div>
      {replacing ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-serif text-2xl">Choose a concept for the {replacing} side</h3>
            <button type="button" className={quietButton} onClick={() => { setReplacing(null); setQuery('') }}>Cancel</button>
          </div>
          <label className="mt-4 block text-sm font-semibold">
            Search
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, question, or curiosity" className="mt-2 w-full rounded-xl border border-studio-line bg-studio-cream px-3 py-2.5 font-normal" />
          </label>
          <ConceptChoiceList concepts={visible} names={names} questions={questions} picks={[replacing === 'left' ? pair.leftId : pair.rightId]} blockedId={replacing === 'left' ? pair.rightId : pair.leftId} onPick={chooseReplacement} />
        </div>
      ) : (
        <form className="mt-8 border-t border-studio-line pt-6" onSubmit={(event) => { event.preventDefault(); void plant() }}>
          <Eyebrow>A thought, if one appears</Eyebrow>
          <label htmlFor={thoughtField} className="mt-3 block font-serif text-2xl leading-snug sm:text-3xl">What do you notice when you bring these ideas together?</label>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-studio-body">A connection, a similarity, a contradiction, a tension, a surprising difference, or an entirely new question. Leave this empty if you are only looking.</p>
          <textarea id={thoughtField} value={thought} onChange={(event) => setThought(event.target.value)} maxLength={2000} className="mt-4 min-h-28 w-full rounded-2xl border border-studio-line bg-studio-cream p-4 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-studio-coral" />
          <label htmlFor={curiosityField} className="mt-4 block text-sm font-semibold">
            Keep the question in
            <select id={curiosityField} value={destination} onChange={(event) => setDestination(event.target.value)} className="mt-2 w-full rounded-xl border border-studio-line bg-studio-cream px-3 py-2.5 font-normal sm:w-auto sm:min-w-56">
              <option value="">Choose a curiosity</option>
              {names.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <button type="submit" className={`${coralButton} mt-4 w-full sm:w-auto`} disabled={planting || thought.trim() === '' || destination === ''}>Turn into a question</button>
          {problem ? <p role="alert" className="mt-3 text-sm">{problem}</p> : null}
          {notice ? <p role="status" className="mt-3 text-sm text-studio-body">{notice}</p> : null}
        </form>
      )}
    </section>
  )
}

function ComparedConcept({
  concept,
  questions,
  names,
}: {
  concept: LibraryConcept | null
  questions: QuestionRecord[]
  names: { id: string; name: string }[]
}) {
  const [expanded, setExpanded] = useState(false)
  if (!concept) {
    return <p className="text-sm text-studio-body">This concept is no longer in the library.</p>
  }
  const question = conceptCardQuestion(concept, questions)
  const origin = libraryCuriosityName(concept.curiosityId, names)
  const long = question.length > 48
  return (
    <article className="min-w-0">
      <h3 className="text-balance text-center font-serif text-sm leading-tight text-studio-ink sm:text-2xl lg:text-4xl">{concept.title}</h3>
      <div className="relative mt-2 overflow-hidden rounded-2xl bg-studio-ink sm:rounded-[28px]">
        <img src={concept.imageSrc} alt="" className={frame} />
      </div>
      {origin ? <p className="mt-2 text-center text-[11px] text-studio-body sm:text-sm">From: {origin}</p> : null}
      <p className={`mt-2 text-balance break-words text-center font-serif text-xs leading-snug text-studio-ink sm:text-base ${long && !expanded ? 'line-clamp-3' : ''}`}>{question}</p>
      {long ? (
        <button type="button" className="mt-2 w-full text-center text-xs font-semibold underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral sm:text-sm" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>
          {expanded ? 'Show less' : 'Read full question'}
        </button>
      ) : null}
    </article>
  )
}

function ConceptChoiceList({
  concepts,
  names,
  questions,
  picks,
  blockedId,
  onPick,
}: {
  concepts: LibraryConcept[]
  names: { id: string; name: string }[]
  questions: QuestionRecord[]
  picks: string[]
  blockedId: string | null
  onPick: (id: string) => void
}) {
  if (concepts.length === 0) return <p className="mt-4 text-sm text-studio-body">No concepts match that search.</p>
  return (
    <ul className="mt-4 flex max-h-80 flex-col gap-2 overflow-y-auto">
      {concepts.map((concept) => {
        const selected = picks.includes(concept.id)
        const blocked = concept.id === blockedId
        const origin = libraryCuriosityName(concept.curiosityId, names)
        const question = conceptCardQuestion(concept, questions)
        return (
          <li key={concept.id}>
            <button
              type="button"
              className="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-studio-line bg-studio-paper px-3 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral disabled:opacity-40"
              aria-pressed={selected}
              disabled={blocked}
              onClick={() => onPick(concept.id)}
            >
              <img src={concept.imageSrc} alt="" className="size-12 shrink-0 rounded-xl object-contain bg-studio-ink" />
              <span className="min-w-0">
                <span className="block truncate font-serif text-lg">{concept.title}</span>
                {origin ? <span className="block text-xs text-studio-body">From: {origin}</span> : null}
                <span className="mt-1 line-clamp-2 block text-sm text-studio-body">{question}</span>
                {selected ? <span className="mt-1 block text-xs font-semibold">Selected</span> : null}
                {blocked ? <span className="mt-1 block text-xs font-semibold">Already in the comparison</span> : null}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function comparisonText(concept: LibraryConcept, names: { id: string; name: string }[], questions: QuestionRecord[]) {
  return [concept.title, conceptCardQuestion(concept, questions), libraryCuriosityName(concept.curiosityId, names) ?? ''].join(' ')
}
