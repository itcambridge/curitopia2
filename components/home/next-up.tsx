import { ArrowUpRight, Play } from 'lucide-react'

export function NextUp({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="rounded-[30px] bg-studio-mint p-6">
      <div className="mb-10 flex items-start justify-between">
        <div className="grid size-10 place-items-center rounded-xl bg-studio-cream text-studio-ink">
          <Play size={17} fill="currentColor" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-studio-grove">next up</span>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-studio-grove">experiment</p>
      <h3 className="mt-2 max-w-[220px] font-serif text-3xl leading-tight">Make the invisible visible.</h3>
      <button
        onClick={onOpen}
        className="mt-8 flex items-center gap-2 text-sm font-semibold underline decoration-studio-grove underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-studio-ink"
      >
        Open the lab <ArrowUpRight size={15} />
      </button>
    </div>
  )
}
