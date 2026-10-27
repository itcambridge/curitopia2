import type { ReactNode } from 'react'

export const panelClass = 'rounded-[30px] border border-studio-line bg-studio-paper p-6 shadow-studio-card sm:p-8'
export const coralButton = 'rounded-xl bg-studio-coral px-4 py-2.5 text-sm font-semibold text-studio-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral disabled:opacity-40'
export const inkButton = 'rounded-xl bg-studio-ink px-4 py-2.5 text-sm font-semibold text-studio-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral disabled:opacity-40'
export const quietButton = 'rounded-xl border border-studio-line px-4 py-2.5 text-sm font-semibold text-studio-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral disabled:opacity-40'

export function Notice({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-studio-mint-soft px-4 py-3 text-sm text-studio-grove">{children}</p>
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-studio-eyebrow">{children}</p>
}
