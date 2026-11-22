'use client'

import { useState } from 'react'
import { ArrivalOverlay } from '@/components/studio/arrival/arrival-overlay'
import { arrivalDestinations, arrivalSpecs, type ArrivalDestination } from '@/components/studio/arrival/destinations'
import { panelClass, quietButton } from '@/components/studio/studio-ui'

type Play = { id: ArrivalDestination | 'broken'; token: number }

export function ArrivalPreview() {
  const [play, setPlay] = useState<Play | null>(null)

  function replay(id: Play['id']) {
    setPlay((current) => ({ id, token: (current?.token ?? 0) + 1 }))
  }

  return (
    <main className="min-h-screen bg-studio-cream text-studio-ink">
      <div className="flex h-12 items-center gap-3 bg-logo-orange px-3 sm:h-14 sm:px-6">
        <p className="text-sm font-semibold">Curitopia</p>
        <p className="ml-auto text-xs font-medium">Development preview</p>
      </div>
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-[1600px] flex-col lg:flex-row">
        <aside className="hidden w-[250px] shrink-0 bg-studio-sidebar px-6 py-8 lg:block">
          <p className="text-sm font-semibold">Sidebar</p>
          <p className="mt-2 text-xs leading-relaxed text-studio-note">This column stays in place. Arrivals belong to the content beside it.</p>
        </aside>
        <div className="min-w-0 flex-1 px-3 py-4 sm:px-8 sm:py-7 lg:px-12 lg:py-10">
          <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">Arrival preview</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-studio-body">Play one arrival at a time over content that is already here. The banner and sidebar stay put.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {arrivalDestinations.map((id) => (
              <button key={id} type="button" className={quietButton} onClick={() => replay(id)}>
                {arrivalSpecs[id].label}
                <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-studio-note">{arrivalSpecs[id].durationMs}ms</span>
              </button>
            ))}
            <button type="button" className={quietButton} onClick={() => replay('broken')}>Missing GIF</button>
          </div>
          <div className="relative mt-6 min-h-[32rem] overflow-hidden rounded-3xl border border-dashed border-studio-line">
            {play?.id === 'broken' ? (
              <ArrivalOverlay key={play.token} destination="home" srcOverride="/arrival-does-not-exist.gif" />
            ) : play ? (
              <ArrivalOverlay key={play.token} destination={play.id} />
            ) : null}
            <div className="p-5 sm:p-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-studio-eyebrow">Already open</p>
              <h2 className="mt-2 max-w-md font-serif text-4xl leading-[0.98] tracking-[-0.04em]">The destination is ready underneath.</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <article className={panelClass}>
                  <p className="font-serif text-2xl">A card</p>
                  <p className="mt-2 text-sm text-studio-body">Text stays readable around the arrival.</p>
                </article>
                <article className={panelClass}>
                  <p className="font-serif text-2xl">Another card</p>
                  <p className="mt-2 text-sm text-studio-body">Nothing here waits for the animation.</p>
                </article>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
