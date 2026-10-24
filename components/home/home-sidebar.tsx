import { BookOpen, ChevronRight, FlaskConical, Lightbulb, Menu, Sparkles, Timer, WandSparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const stages: { id: string; label: string; icon: LucideIcon; note: string }[] = [
  { id: 'curiosity', label: 'Curiosity', icon: Lightbulb, note: 'Ask a better question' },
  { id: 'experiment', label: 'Experiment', icon: FlaskConical, note: 'Test your hunch' },
  { id: 'vision', label: 'Vision', icon: WandSparkles, note: 'Make it memorable' },
]

export function HomeSidebar({ active, onNavigate }: { active: string; onNavigate: (id: string) => void }) {
  return (
    <aside className="flex w-full flex-col justify-between border-b border-studio-line bg-studio-sidebar px-6 py-6 lg:w-[238px] lg:border-b-0 lg:border-r lg:px-7 lg:py-8">
      <div>
        <div className="mb-10 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-[14px] bg-studio-coral text-studio-ivory shadow-studio-stamp">
            <Sparkles size={19} />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-studio-kicker">Field notes / 042</p>
            <h1 className="font-serif text-[22px] font-semibold tracking-tight">curitopia</h1>
          </div>
        </div>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-studio-journey">Your journey</p>
        <nav aria-label="Curitopia journey" className="flex gap-2 lg:flex-col">
          {stages.map((stage, index) => {
            const Icon = stage.icon
            const selected = active === stage.id
            return (
              <button
                key={stage.id}
                onClick={() => onNavigate(stage.id)}
                aria-current={selected ? 'page' : undefined}
                className={`group flex flex-1 items-center gap-3 rounded-2xl p-3 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral lg:flex-none ${selected ? 'bg-studio-ink text-studio-ivory shadow-studio-stamp-coral' : 'text-studio-nav hover:bg-studio-sidebar-hover'}`}
              >
                <span className={`grid size-9 place-items-center rounded-xl ${selected ? 'bg-studio-coral text-studio-ink' : 'bg-studio-icon'}`}>
                  <Icon size={17} />
                </span>
                <span className="hidden min-[420px]:block">
                  <span className="block text-sm font-semibold">{stage.label}</span>
                  <span className={`hidden text-[11px] lg:block ${selected ? 'text-studio-note-on' : 'text-studio-note'}`}>{stage.note}</span>
                </span>
                {index < stages.length - 1 && <ChevronRight className="ml-auto hidden lg:block" size={15} />}
              </button>
            )
          })}
        </nav>
        <div className="my-8 hidden h-px bg-studio-line-faint lg:block" />
        <div className="hidden gap-2 lg:flex lg:flex-col">
          <button onClick={() => onNavigate('library')} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-studio-nav hover:bg-studio-sidebar-hover">
            <BookOpen size={17} />
            Library of curiosities
          </button>
          <button className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-studio-nav hover:bg-studio-sidebar-hover">
            <Timer size={17} />
            Focus timer <span className="ml-auto font-mono text-[10px]">25:00</span>
          </button>
        </div>
      </div>
      <div className="hidden items-center gap-3 rounded-2xl bg-studio-cream p-3 lg:flex">
        <div className="grid size-9 place-items-center rounded-full bg-studio-mint font-serif font-semibold">A</div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">Alex Morgan</p>
          <p className="font-mono text-[10px] text-studio-muted">Prototype space</p>
        </div>
        <Menu size={16} className="ml-auto text-studio-muted" />
      </div>
    </aside>
  )
}
