import type { ButtonHTMLAttributes, ReactNode } from 'react'
import Link from 'next/link'

export const panelClass = 'rounded-3xl border border-studio-line bg-studio-paper p-6 shadow-studio-card sm:p-8'
export const coralButton = 'rounded-xl bg-studio-coral px-4 py-2.5 text-sm font-semibold text-studio-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral disabled:opacity-40'
export const inkButton = 'rounded-xl bg-studio-ink px-4 py-2.5 text-sm font-semibold text-studio-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral disabled:opacity-40'
export const quietButton = 'rounded-xl border border-studio-line px-4 py-2.5 text-sm font-semibold text-studio-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral disabled:opacity-40'
export const iconButton = 'grid size-11 place-items-center rounded-xl border border-studio-line text-studio-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral disabled:opacity-40'

// Shared by Gather, Curate, Visualise, and Distil. Below xl the list is a horizontal
// snap carousel with a peek of the next card. From xl it is a vertical list capped
// to the viewport chrome and scrolls itself.
export const questionListClass = 'flex min-h-0 min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain py-1 [scrollbar-width:none] xl:max-h-[calc(100dvh-9.5rem)] xl:snap-none xl:flex-col xl:overflow-x-hidden xl:overflow-y-auto xl:overscroll-y-contain xl:px-1 xl:pb-2 xl:[scrollbar-color:var(--color-studio-line)_transparent] xl:[scrollbar-gutter:stable] xl:[scrollbar-width:thin] [&::-webkit-scrollbar]:hidden xl:[&::-webkit-scrollbar]:block xl:[&::-webkit-scrollbar]:w-2 xl:[&::-webkit-scrollbar-thumb]:rounded-full xl:[&::-webkit-scrollbar-thumb]:bg-studio-line-strong xl:[&::-webkit-scrollbar-track]:bg-transparent'
export const questionListItemClass = 'w-[min(17.5rem,82%)] shrink-0 snap-start xl:w-auto xl:min-w-0 xl:shrink'
export const iconCoralButton = 'grid size-11 place-items-center rounded-xl bg-studio-coral text-studio-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral disabled:opacity-40 [@media(hover:hover)]:hover:bg-studio-coral-hover'

const iconActionBase = 'peer grid size-11 shrink-0 place-items-center rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral disabled:opacity-40 [&_svg]:size-[18px]'

const iconActionTreatment = {
  quiet: 'border border-studio-line bg-transparent text-studio-ink [@media(hover:hover)]:hover:bg-studio-sidebar-hover',
  ink: 'border border-transparent bg-studio-ink text-studio-ivory [@media(hover:hover)]:hover:bg-studio-sidebar-hover [@media(hover:hover)]:hover:text-studio-ink',
  coral: 'border border-transparent bg-studio-coral text-studio-ink [@media(hover:hover)]:hover:bg-studio-coral-hover',
} as const

const iconTipAlign = {
  center: 'left-1/2 -translate-x-1/2',
  start: 'left-0',
  end: 'right-0',
} as const

export function IconAction({
  label,
  treatment,
  tipAlign = 'center',
  className = '',
  type = 'button',
  href,
  children,
  ...props
}: {
  label: string
  treatment: keyof typeof iconActionTreatment
  tipAlign?: keyof typeof iconTipAlign
  href?: string
  children: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'>) {
  const classes = `${iconActionBase} ${iconActionTreatment[treatment]} ${className}`
  return (
    <span className="relative inline-flex">
      {href ? (
        <Link href={href} aria-label={label} className={classes}>
          {children}
        </Link>
      ) : (
        <button type={type} aria-label={label} className={classes} {...props}>
          {children}
        </button>
      )}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-[calc(100%+8px)] z-20 hidden w-max max-w-[11rem] whitespace-normal rounded-lg bg-studio-ink px-2 py-1 text-center text-xs leading-snug text-studio-ivory [@media(hover:hover)]:peer-hover:block [@media(hover:hover)]:peer-focus-visible:block ${iconTipAlign[tipAlign]}`}
      >
        {label}
      </span>
    </span>
  )
}

export function Notice({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-studio-mint-soft px-4 py-3 text-sm text-studio-grove">{children}</p>
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-studio-eyebrow">{children}</p>
}
