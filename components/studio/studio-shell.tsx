import type { ReactNode } from 'react'
import Link from 'next/link'
import { Home, LogOut } from 'lucide-react'
import { SiteBanner } from '@/components/site-banner'
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
  curiosityName,
  onSignOut,
  children,
}: {
  stage: StageId
  counts: Counts
  onStage: (stage: StageId) => void
  email: string | null
  curiosityName: string | null
  onSignOut: () => void
  children: ReactNode
}) {
  const accountLabel = email ?? 'Signed in'

  return (
    <main className="min-h-screen bg-studio-cream text-studio-ink">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-studio-line px-5 py-3 sm:px-8">
        <h1 className="sr-only">curitopia</h1>
        <SiteBanner />
        <div className="ml-auto flex min-w-0 items-center gap-1.5">
          <p className="min-w-0 max-w-48 truncate text-right text-[11px] leading-tight text-studio-body sm:max-w-xs" title={accountLabel}>
            {accountLabel}
          </p>
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="grid size-8 shrink-0 place-items-center rounded-xl text-studio-nav transition-colors hover:bg-studio-paper hover:text-studio-ink focus-visible:bg-studio-paper focus-visible:text-studio-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral"
          >
            <LogOut size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <aside className="flex w-full min-w-0 flex-col overflow-x-hidden border-b border-studio-line bg-studio-sidebar px-5 py-5 lg:w-[250px] lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
          <Link href={studioPath('/')} className="mb-4 flex w-fit items-center gap-2 rounded-2xl px-2.5 py-2 text-sm font-semibold text-studio-ink hover:bg-studio-sidebar-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral">
            <Home size={16} aria-hidden="true" />
            Home
          </Link>
          {curiosityName ? <p className="mb-4 font-serif text-2xl leading-tight">{curiosityName}</p> : null}
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
        <section className="relative min-w-0 flex-1 overflow-x-clip px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
          <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-studio-mint-wash opacity-70 blur-3xl" />
          <div className="relative z-10 min-w-0">
            {children}
          </div>
        </section>
      </div>
    </main>
  )
}
