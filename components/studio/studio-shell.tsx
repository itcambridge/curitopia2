'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Home, Menu, X } from 'lucide-react'
import { BrandBanner } from '@/components/site-banner'
import { CuriositySwitcher } from '@/components/studio/curiosity-switcher'
import { StageMark } from '@/components/studio/stage-mark'
import { studioPath } from '@/lib/paths'
import type { StageId } from '@/lib/questions/types'
import type { workspaceCounts } from '@/lib/questions/workspace'

type Counts = ReturnType<typeof workspaceCounts>

const stages: { id: StageId; number: string; label: string; hint: string }[] = [
  { id: 'gather', number: '1', label: 'Gather', hint: 'Capture freely' },
  { id: 'curate', number: '2', label: 'Curate', hint: 'Connect questions' },
  { id: 'visualise', number: '3', label: 'Visualise', hint: 'Compare images' },
  { id: 'distil', number: '4', label: 'Distil', hint: 'Name a concept' },
  { id: 'library', number: '5', label: 'Library of Curiosities', hint: 'Open archive' },
]

const mobileSections: { id: StageId; label: string }[] = [
  { id: 'gather', label: 'Garden' },
  { id: 'visualise', label: 'Visualise' },
  { id: 'library', label: 'Library' },
  { id: 'curate', label: 'Curate' },
  { id: 'distil', label: 'Distil' },
]

function countFor(id: StageId, counts: Counts) {
  if (id === 'gather') return counts.questions
  if (id === 'curate') return counts.gathered
  if (id === 'visualise') return counts.retained
  if (id === 'library') return counts.concepts
  return counts.concepts
}

export function StudioShell({
  stage,
  counts,
  onStage,
  email,
  curiosityId,
  curiosityName,
  onBeforeLeave,
  onSignOut,
  children,
}: {
  stage: StageId
  counts: Counts
  onStage: (stage: StageId) => void
  email: string | null
  curiosityId: string
  curiosityName: string | null
  onBeforeLeave: () => void
  onSignOut: () => void
  children: ReactNode
}) {
  const menuId = useId()
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuButtonRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  function openSection(next: StageId) {
    onStage(next)
    setMenuOpen(false)
  }

  return (
    <main className="min-h-screen bg-studio-cream text-studio-ink">
      <BrandBanner email={email} onSignOut={onSignOut} />
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <div className="border-b border-studio-line bg-studio-sidebar lg:hidden">
          <div className="flex items-end gap-2 px-3 py-2">
            <Link href={studioPath('/')} className="mb-0.5 flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-studio-ink hover:bg-studio-sidebar-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral">
              <Home size={16} aria-hidden="true" />
              Home
            </Link>
            <CuriositySwitcher compact curiosityId={curiosityId} curiosityName={curiosityName} onBeforeLeave={onBeforeLeave} />
            <button
              ref={menuButtonRef}
              type="button"
              className="mb-0.5 grid size-11 shrink-0 place-items-center rounded-xl text-studio-ink hover:bg-studio-sidebar-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
              <span className="sr-only">{menuOpen ? 'Close sections' : 'Open sections'}</span>
            </button>
          </div>
          <nav id={menuId} aria-label="Sections" hidden={!menuOpen} className={`${menuOpen ? 'grid' : 'hidden'} grid-cols-2 gap-1.5 px-3 pb-3`}>
            {mobileSections.map((item) => {
              const current = stage === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openSection(item.id)}
                  aria-current={current ? 'page' : undefined}
                  className={`flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 text-left text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral ${current ? 'bg-studio-ink text-studio-ivory' : 'bg-studio-paper text-studio-ink'}`}
                >
                  <span>{item.label}</span>
                  <span className={`font-mono text-xs ${current ? 'text-studio-note-on' : 'text-studio-note'}`}>{countFor(item.id, counts)}</span>
                </button>
              )
            })}
          </nav>
        </div>
        <aside className="hidden w-full min-w-0 flex-col overflow-x-hidden border-b border-studio-line bg-studio-sidebar px-5 py-5 lg:flex lg:w-[250px] lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
          <Link href={studioPath('/')} className="mb-4 flex w-fit items-center gap-2 rounded-2xl px-2.5 py-2 text-sm font-semibold text-studio-ink hover:bg-studio-sidebar-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral">
            <Home size={16} aria-hidden="true" />
            Home
          </Link>
          <CuriositySwitcher curiosityId={curiosityId} curiosityName={curiosityName} onBeforeLeave={onBeforeLeave} />
          <nav aria-label="Workspace stages" className="flex w-full min-w-0 gap-2 overflow-x-auto lg:flex-col">
            {stages.map((item) => {
              const current = stage === item.id
              const count = countFor(item.id, counts)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onStage(item.id)}
                  aria-current={current ? 'page' : undefined}
                  className={`flex min-w-[168px] flex-1 items-center gap-3 rounded-2xl p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral lg:min-w-0 lg:flex-none ${current ? 'bg-studio-ink text-studio-ivory shadow-studio-stamp-coral' : 'text-studio-nav hover:bg-studio-sidebar-hover'}`}
                >
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl font-mono text-xs ${current ? 'bg-studio-coral text-studio-ink' : 'bg-studio-icon text-studio-ink'}`}>{item.number}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight">{item.label}</span>
                    <span className={`block text-[11px] ${current ? 'text-studio-note-on' : 'text-studio-note'}`}>{count} · {item.hint}</span>
                  </span>
                </button>
              )
            })}
          </nav>
          <StageMark stage={stage} placement="sidebar" />
        </aside>
        <section className="relative min-w-0 flex-1 overflow-x-clip px-3 py-4 sm:px-8 sm:py-7 lg:px-12 lg:py-10">
          <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-studio-mint-wash opacity-70 blur-3xl" />
          <div className="relative z-10 min-w-0">
            {children}
          </div>
        </section>
      </div>
    </main>
  )
}
