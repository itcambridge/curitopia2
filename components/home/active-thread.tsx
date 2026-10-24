'use client'

import { useState } from 'react'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { submitOnEnter } from '@/components/home/submit-on-enter'

function Prompt({
  position,
  eyebrow,
  text,
}: {
  position: 'left' | 'right' | 'bottom'
  eyebrow: string
  text: string
}) {
  return (
    <div
      className={`absolute ${position === 'left' ? 'left-0 top-1/2 -translate-y-1/2' : position === 'right' ? 'right-0 top-1/2 -translate-y-1/2' : 'bottom-0 left-1/2 -translate-x-1/2'} rounded-2xl border border-studio-line bg-studio-cream px-4 py-3 text-center max-[480px]:max-w-[39%] max-[480px]:px-2 max-[480px]:py-2`}
    >
      <p className="font-mono text-[9px] uppercase tracking-widest text-studio-label max-[480px]:text-[7px]">{eyebrow}</p>
      <p className="mt-1 text-sm font-semibold max-[480px]:text-[10px]">{text}</p>
    </div>
  )
}

export function ActiveThread({ onQuestion }: { onQuestion: (question: string) => void }) {
  const [question, setQuestion] = useState('')
  const submit = () => {
    if (question.trim()) {
      onQuestion(question.trim())
      setQuestion('')
    }
  }

  return (
    <section className="rounded-[30px] border border-studio-line bg-studio-paper p-6 shadow-studio-card sm:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-studio-eyebrow">Active thread / 01</p>
          <h3 className="mt-1 text-lg font-semibold">The question garden</h3>
        </div>
        <span className="rounded-full bg-studio-mint-soft px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-studio-grove">
          in bloom
        </span>
      </div>
      <div className="relative mx-auto flex min-h-[245px] max-w-2xl items-center justify-center max-[480px]:min-h-[290px]">
        <div className="absolute inset-x-8 top-1/2 h-px bg-studio-line-soft max-[480px]:inset-x-4" />
        <div className="absolute left-1/2 top-7 h-[190px] w-px bg-studio-line-soft max-[480px]:h-[225px]" />
        <div className="relative z-10 grid size-28 place-items-center rounded-full border-[5px] border-studio-ink bg-studio-coral text-center shadow-studio-stamp-lg max-[480px]:size-24">
          <span className="font-serif text-xl font-semibold leading-none max-[480px]:text-lg">
            stay
            <br />
            curious
          </span>
        </div>
        <Prompt position="left" eyebrow="start with" text="Something you notice" />
        <Prompt position="right" eyebrow="try turning" text="It sideways" />
        <Prompt position="bottom" eyebrow="keep it" text="Playfully specific" />
      </div>
      <div className="mt-8 rounded-2xl bg-studio-ink p-4">
        <div className="mb-3 flex items-center gap-2 text-studio-note-on">
          <Sparkles size={14} />
          <span className="font-mono text-[10px] uppercase tracking-widest">plant a new seed</span>
        </div>
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => submitOnEnter(event, submit)}
            placeholder="I wonder why..."
            aria-label="Add a question"
            className="min-w-0 flex-1 bg-transparent text-sm text-studio-paper outline-none placeholder:text-studio-placeholder"
          />
          <button
            onClick={submit}
            aria-label="Plant question"
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-studio-coral text-studio-ink transition hover:bg-studio-coral-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-paper"
          >
            <ArrowUpRight size={17} />
          </button>
        </div>
      </div>
    </section>
  )
}
