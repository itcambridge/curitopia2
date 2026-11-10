import Image from 'next/image'
import { LogOut } from 'lucide-react'
import { withBasePath } from '@/lib/paths'

export function SiteBanner({ alt = '', compact = false }: { alt?: string; compact?: boolean }) {
  return (
    <div className="flex min-w-0">
      <Image
        src={withBasePath('/header.png')}
        alt={alt}
        width={492}
        height={100}
        priority
        className={compact ? 'h-8 w-auto max-w-[11rem] object-contain object-left sm:h-10 sm:max-w-none' : 'h-12 w-auto max-w-full object-contain sm:h-14'}
      />
    </div>
  )
}

export function BrandBanner({ email, onSignOut }: { email: string | null; onSignOut: () => void }) {
  const accountLabel = email ?? 'Signed in'
  return (
    <header className="flex h-12 items-center gap-2 bg-logo-orange px-3 sm:h-14 sm:gap-3 sm:px-6">
      <h1 className="sr-only">curitopia</h1>
      <SiteBanner compact />
      <div className="ml-auto flex min-w-0 items-center gap-1">
        <p className="min-w-0 max-w-36 truncate text-right text-[11px] font-medium leading-tight text-studio-ink sm:max-w-xs" title={accountLabel}>
          {accountLabel}
        </p>
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sign out"
          className="grid size-11 shrink-0 place-items-center rounded-xl text-studio-ink hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-ink [&_svg]:size-[18px]"
        >
          <LogOut aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
