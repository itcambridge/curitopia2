'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BrandBanner } from '@/components/site-banner'
import { Eyebrow, panelClass } from '@/components/studio/studio-ui'
import { experienceWriteTarget, type ExperienceWriteTarget } from '@/lib/questions/experience'
import { curiosityOpenPath } from '@/lib/questions/curiosity-switch'
import { getCuriosity } from '@/lib/questions/supabase-curiosities'
import { openExperience } from '@/lib/questions/supabase-experience'
import { studioPath } from '@/lib/paths'
import { readPublicSupabaseEnv } from '@/lib/supabase/env'
import { createClient } from '@/lib/supabase/client'

const productionNotice = 'This copy is connected to the production database. The curiosity stays as it is. An Experience record can be stored on the development project named in the allowlist.'
const refusedNotice = 'Experience records are stored only for the development project named in the allowlist. The curiosity stays as it is.'

export function ExperienceScreen({ curiosityId }: { curiosityId: string }) {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [missing, setMissing] = useState(false)
  const [writeTarget, setWriteTarget] = useState<ExperienceWriteTarget | null>(null)
  const [created, setCreated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (cancelled) return
      setEmail(data.user?.email ?? null)
      const curiosity = await getCuriosity(curiosityId)
      if (cancelled) return
      if (!curiosity) {
        setMissing(true)
        setReady(true)
        return
      }
      setName(curiosity.name)
      const target = experienceWriteTarget(readPublicSupabaseEnv())
      if (target !== 'allowed') {
        setWriteTarget(target)
        setReady(true)
        return
      }
      const opened = await openExperience(curiosityId)
      if (cancelled) return
      setWriteTarget('allowed')
      setCreated(opened.created)
      setReady(true)
    }
    load().catch((reason: unknown) => {
      if (cancelled) return
      setError(reason instanceof Error ? reason.message : 'The experience could not be opened.')
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [curiosityId])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(studioPath('/sign-in'))
    router.refresh()
  }

  const backHref = studioPath(curiosityOpenPath(curiosityId))

  return (
    <main className="min-h-screen bg-studio-cream text-studio-ink">
      <BrandBanner email={email} onSignOut={() => { void signOut() }} />
      <div className="mx-auto w-full min-w-0 max-w-3xl px-4 py-8 sm:px-8">
        <Link href={backHref} className="text-sm font-semibold text-studio-ink underline decoration-studio-line underline-offset-4 hover:decoration-studio-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral">
          {name ? `Return to ${name}` : 'Return to this curiosity'}
        </Link>
        {!ready ? <p className="mt-8 text-sm text-studio-muted">Opening the experience…</p> : missing ? (
          <section className={`${panelClass} mt-8`}>
            <p className="text-sm">This curiosity is not in your account. <Link className="font-semibold underline-offset-2 hover:underline" href={studioPath('/')}>Return to your curiosities</Link></p>
          </section>
        ) : (
          <section className={`${panelClass} mt-8`}>
            <Eyebrow>Experience</Eyebrow>
            <h2 className="mt-3 font-serif text-4xl leading-tight tracking-tight">{name}</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-studio-body">
              This is the one experience for {name}. It stays with this curiosity.
            </p>
            {writeTarget === 'production' ? <p className="mt-4 text-sm leading-relaxed text-studio-body">{productionNotice}</p> : null}
            {writeTarget === 'refused' ? <p className="mt-4 text-sm leading-relaxed text-studio-body">{refusedNotice}</p> : null}
            {writeTarget === 'allowed' && created ? <p className="mt-4 text-sm text-studio-body">This experience has been opened for the first time.</p> : null}
            {writeTarget === 'allowed' && !created && !error ? <p className="mt-4 text-sm text-studio-body">This experience was already open.</p> : null}
            {error ? <p role="alert" className="mt-4 text-sm">{error}</p> : null}
          </section>
        )}
      </div>
    </main>
  )
}
