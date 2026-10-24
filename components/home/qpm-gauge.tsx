import { Info } from 'lucide-react'

export function QpmGauge({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-2xl border border-studio-line bg-studio-paper px-4 py-2.5">
        <p className="font-mono text-[9px] uppercase tracking-widest text-studio-label">Questions / minute</p>
        <p className="mt-0.5 font-serif text-2xl leading-none text-studio-coral">
          {value}
          <span className="ml-1 text-sm text-studio-muted">qpm</span>
        </p>
      </div>
      <button
        title="Counts questions added during this session over the last 60 seconds."
        aria-label="About questions per minute"
        className="grid size-11 place-items-center rounded-full border border-studio-line-strong bg-studio-paper text-studio-info transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral"
      >
        <Info size={17} />
      </button>
    </div>
  )
}
