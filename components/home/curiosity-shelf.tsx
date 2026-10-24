'use client'

import { useState } from 'react'
import { ChevronRight, Plus, X } from 'lucide-react'
import { submitOnEnter } from '@/components/home/submit-on-enter'
import type { Idea, IdeaColor } from '@/components/home/types'

const dotClass: Record<IdeaColor, string> = {
  coral: 'bg-studio-coral',
  violet: 'bg-studio-violet',
  mint: 'bg-studio-mint',
}

export function CuriosityShelf({ ideas, onAdd }: { ideas: Idea[]; onAdd: (value: string) => void }) {
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')
  const submit = () => {
    if (value.trim()) {
      onAdd(value.trim())
      setValue('')
      setAdding(false)
    }
  }

  return (
    <div className="rounded-[30px] border border-studio-line bg-studio-paper p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-semibold">Curiosity shelf</h3>
        <button
          onClick={() => setAdding((open) => !open)}
          aria-label={adding ? 'Close add question' : 'Add a question'}
          className="grid size-8 place-items-center rounded-full bg-studio-sidebar transition hover:bg-studio-shelf-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral"
        >
          {adding ? <X size={16} /> : <Plus size={16} />}
        </button>
      </div>
      {adding && (
        <div className="mb-4 flex gap-2 rounded-xl border border-studio-line bg-studio-cream p-2">
          <input
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => submitOnEnter(event, submit)}
            placeholder="Save a question for later"
            aria-label="Save a question for later"
            className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
          />
          <button onClick={submit} className="rounded-lg bg-studio-ink px-3 py-1.5 text-xs text-white">
            Add
          </button>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {ideas.map((idea) => (
          <div key={idea.id} className="group flex min-h-8 items-center gap-3 text-left">
            <span className={`size-2.5 shrink-0 rounded-full ${dotClass[idea.color]}`} />
            <span className="min-w-0 flex-1 text-sm text-studio-body">{idea.title}</span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-studio-tag group-hover:text-studio-coral">
              {idea.tag}
            </span>
          </div>
        ))}
      </div>
      <button className="mt-5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-studio-coral">
        View all <ChevronRight size={13} />
      </button>
    </div>
  )
}
