'use client'

import type { CSSProperties } from 'react'
import type { ConceptRecord, QuestionRecord } from '@/lib/questions/types'

const shownInOrbit = 6

function slot(index: number, count: number) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count
  return {
    x: 50 + Math.cos(angle) * 38,
    y: 50 + Math.sin(angle) * 38,
  }
}

function kindOf(question: QuestionRecord, branching: Set<string>) {
  if (branching.has(question.id)) return 'branch'
  if (question.disposition === 'retained') return 'shoot'
  if (question.disposition === 'parked') return 'parked'
  return 'seed'
}

const kindLabel = {
  seed: 'Seed',
  shoot: 'Shoot',
  branch: 'Branch',
  parked: 'Parked',
  blossom: 'Blossom',
} as const

function NodeFace({
  question,
  kind,
}: {
  question: QuestionRecord
  kind: keyof typeof kindLabel
}) {
  return (
    <>
      <span className={`mb-1 block font-mono text-[8px] uppercase tracking-widest ${kind === 'shoot' ? 'text-studio-grove' : 'text-studio-label'}`}>
        {kindLabel[kind]}
      </span>
      <span className="line-clamp-3 text-left text-[11px] font-semibold leading-snug">{question.originalText}</span>
    </>
  )
}

type OrbitNode =
  | { key: string; kind: 'blossom'; title: string; conceptId: string }
  | { key: string; kind: 'seed' | 'shoot' | 'branch' | 'parked'; question: QuestionRecord }

export function QuestionGarden({
  questions,
  concepts,
  branching,
  onFocus,
  onOpenConcept,
}: {
  questions: QuestionRecord[]
  concepts: ConceptRecord[]
  branching: Set<string>
  onFocus: (id: string) => void
  onOpenConcept: (id: string) => void
}) {
  const living = questions.filter((item) => item.disposition !== 'discarded')
  const blossoms = concepts.slice(0, 3).map((concept): OrbitNode => ({ key: concept.id, kind: 'blossom', title: concept.title, conceptId: concept.id }))
  const questionNodes = living.slice(0, shownInOrbit - blossoms.length).map((question): OrbitNode => ({ key: question.id, kind: kindOf(question, branching), question }))
  const orbit = [...blossoms, ...questionNodes]
  const hidden = living.length - questionNodes.length
  const hiddenConcepts = concepts.length - blossoms.length

  if (orbit.length === 0) {
    return (
      <div className="relative mx-auto flex min-h-[250px] max-w-2xl items-center justify-center max-[480px]:min-h-[280px]">
        <div className="absolute inset-x-8 top-1/2 h-px bg-studio-line-soft max-[480px]:inset-x-4" />
        <div className="absolute left-1/2 top-6 h-[190px] w-px bg-studio-line-soft max-[480px]:h-[210px]" />
        <Heart />
        <Hint place="left" eyebrow="Start with" text="Something you notice" />
        <Hint place="right" eyebrow="Try turning" text="It sideways" />
        <Hint place="bottom" eyebrow="Keep it" text="Playfully specific" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col items-center gap-4 md:hidden">
        <Heart />
        <ul className="flex flex-wrap justify-center gap-2">
          {orbit.map((node) => (
            <li key={node.key}>
              <OrbitButton node={node} onFocus={onFocus} onOpenConcept={onOpenConcept} className="max-w-full" />
            </li>
          ))}
        </ul>
      </div>
      <div className="relative mx-auto hidden min-h-[380px] max-w-3xl md:block">
        <svg className="absolute inset-0 h-full w-full text-studio-line-soft" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {orbit.map((node, index) => {
            const point = slot(index, orbit.length)
            return <line key={node.key} x1="50" y1="50" x2={point.x} y2={point.y} stroke="currentColor" strokeWidth="0.35" />
          })}
        </svg>
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <Heart />
        </div>
        {orbit.map((node, index) => {
          const point = slot(index, orbit.length)
          return (
            <OrbitButton
              key={node.key}
              node={node}
              onFocus={onFocus}
              onOpenConcept={onOpenConcept}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              className="absolute z-20 w-[9.5rem] -translate-x-1/2 -translate-y-1/2"
            />
          )
        })}
      </div>
      {(hidden > 0 || hiddenConcepts > 0) && (
        <p className="mt-4 text-center text-xs text-studio-muted">
          {hidden === 1 ? 'One more question is in the list below.' : hidden > 1 ? `${hidden} more questions are in the list below.` : ''}
          {hidden > 0 && hiddenConcepts > 0 ? ' ' : ''}
          {hiddenConcepts === 1 ? 'One more concept is in the library.' : hiddenConcepts > 1 ? `${hiddenConcepts} more concepts are in the library.` : ''}
        </p>
      )}
    </div>
  )
}

function OrbitButton({
  node,
  onFocus,
  onOpenConcept,
  className,
  style,
}: {
  node: OrbitNode
  onFocus: (id: string) => void
  onOpenConcept: (id: string) => void
  className?: string
  style?: CSSProperties
}) {
  if (node.kind === 'blossom') {
    return (
      <button type="button" style={style} onClick={() => onOpenConcept(node.conceptId)} className={`${className ?? ''} ${chipClass('blossom')}`}>
        <span className="mb-1 block font-mono text-[8px] uppercase tracking-widest text-studio-coral">Blossom</span>
        <span className="line-clamp-3 text-left text-[11px] font-semibold leading-snug">{node.title}</span>
      </button>
    )
  }
  return (
    <button type="button" style={style} onClick={() => onFocus(node.question.id)} className={`${className ?? ''} ${chipClass(node.kind)}`}>
      <NodeFace question={node.question} kind={node.kind} />
    </button>
  )
}

function Heart() {
  return (
    <div className="relative z-10 grid size-28 place-items-center rounded-full border-[5px] border-studio-ink bg-studio-coral text-center shadow-studio-stamp-lg max-[480px]:size-24">
      <span className="font-serif text-xl font-semibold leading-none max-[480px]:text-lg">
        stay
        <br />
        curious
      </span>
    </div>
  )
}

function Hint({ place, eyebrow, text }: { place: 'left' | 'right' | 'bottom'; eyebrow: string; text: string }) {
  const position = place === 'left'
    ? 'left-0 top-1/2 -translate-y-1/2'
    : place === 'right'
      ? 'right-0 top-1/2 -translate-y-1/2'
      : 'bottom-0 left-1/2 -translate-x-1/2'
  return (
    <div className={`absolute ${position} max-w-[39%] rounded-2xl border border-studio-line bg-studio-cream px-4 py-3 text-center max-[480px]:px-2 max-[480px]:py-2`}>
      <p className="font-mono text-[9px] uppercase tracking-widest text-studio-label max-[480px]:text-[7px]">{eyebrow}</p>
      <p className="mt-1 text-sm font-semibold max-[480px]:text-[10px]">{text}</p>
    </div>
  )
}

function chipClass(kind: keyof typeof kindLabel) {
  if (kind === 'blossom') return 'rounded-2xl border border-studio-coral bg-studio-ivory px-3 py-2 text-studio-ink shadow-studio-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-studio-coral'
  if (kind === 'shoot') return 'rounded-2xl border border-studio-mint bg-studio-mint-soft px-3 py-2 text-studio-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-studio-coral'
  if (kind === 'branch') return 'rounded-2xl border border-studio-line-strong bg-studio-paper px-3 py-2 text-studio-ink shadow-studio-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-studio-coral'
  return 'rounded-2xl border border-studio-line bg-studio-cream px-3 py-2 text-studio-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-studio-coral'
}
