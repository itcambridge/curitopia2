import { ActiveThread } from '@/components/home/active-thread'
import { CuriosityShelf } from '@/components/home/curiosity-shelf'
import { HomeSidebar } from '@/components/home/home-sidebar'
import { NextUp } from '@/components/home/next-up'
import { QpmGauge } from '@/components/home/qpm-gauge'
import type { Idea } from '@/components/home/types'

function studioDateLabel(date: Date) {
  const formatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date)
  return `${formatted} · Studio 01`
}

export function HomeDashboard({
  active,
  ideas,
  qpm,
  onNavigate,
  onAddQuestion,
  onOpenExperiment,
}: {
  active: string
  ideas: Idea[]
  qpm: number
  onNavigate: (id: string) => void
  onAddQuestion: (question: string) => void
  onOpenExperiment: () => void
}) {
  return (
    <main className="min-h-screen overflow-hidden bg-studio-cream text-studio-ink">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <HomeSidebar active={active} onNavigate={onNavigate} />
        <section className="relative flex-1 px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
          <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-studio-mint-wash opacity-70 blur-3xl" />
          <header className="relative mb-10 flex items-start justify-between gap-5">
            <div>
              <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-studio-date">
                <span className="size-2 rounded-full bg-studio-coral" />
                {studioDateLabel(new Date())}
              </div>
              <h2 className="max-w-xl font-serif text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">
                Follow the thread.
                <br />
                <em className="text-studio-coral">See what unfolds.</em>
              </h2>
            </div>
            <QpmGauge value={qpm} />
          </header>
          <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
            <ActiveThread onQuestion={onAddQuestion} />
            <div className="flex flex-col gap-5">
              <NextUp onOpen={onOpenExperiment} />
              <CuriosityShelf ideas={ideas} onAdd={onAddQuestion} />
            </div>
          </div>
          <footer className="relative mt-8 flex flex-wrap items-center gap-3 text-[11px] text-studio-footer">
            <span className="font-mono uppercase tracking-widest">A gentle reminder</span>
            <span className="size-1 rounded-full bg-studio-coral" />
            <span>You don&apos;t have to know the answer to begin.</span>
          </footer>
        </section>
      </div>
    </main>
  )
}
