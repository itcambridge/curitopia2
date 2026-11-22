'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ExperienceWorkspace } from '@/components/studio/experience-workspace'
import { LeaveGuard } from '@/components/studio/leave-guard'
import { StudioShell } from '@/components/studio/studio-shell'
import { Eyebrow, panelClass } from '@/components/studio/studio-ui'
import { useAccountWorkspace } from '@/components/studio/use-account-workspace'
import { experienceClientProductionOpen, experienceWriteTarget, type ExperienceProductionDecision, type ExperienceWriteTarget } from '@/lib/questions/experience'
import type { CircleItem } from '@/lib/questions/experience-content'
import { curiosityOpenPath, surfaceStage } from '@/lib/questions/curiosity-switch'
import { getCuriosity } from '@/lib/questions/supabase-curiosities'
import { openExperience } from '@/lib/questions/supabase-experience'
import { loadExperienceContent } from '@/lib/questions/supabase-experience-content'
import { studioPath } from '@/lib/paths'
import type { StageId } from '@/lib/questions/types'
import { workspaceCounts } from '@/lib/questions/workspace'
import { readPublicSupabaseEnv } from '@/lib/supabase/env'

const productionNotice = 'This copy is connected to the production database. The curiosity stays as it is. An Experience record can be stored on the development project named in the allowlist.'
const mismatchNotice = 'This copy’s Experience permissions do not match, so nothing was opened. The curiosity stays as it is.'
const refusedNotice = 'Experience records are stored only for the development project named in the allowlist. The curiosity stays as it is.'

export function ExperienceScreen({
  curiosityId,
  productionDecision,
}: {
  curiosityId: string
  productionDecision: ExperienceProductionDecision
}) {
  const router = useRouter()
  const account = useAccountWorkspace(curiosityId)
  const [name, setName] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [missing, setMissing] = useState(false)
  const [writeTarget, setWriteTarget] = useState<ExperienceWriteTarget | null>(null)
  const [release, setRelease] = useState<'closed' | 'split' | null>(null)
  const [created, setCreated] = useState(false)
  const [experienceId, setExperienceId] = useState<string | null>(null)
  const [northStar, setNorthStar] = useState<string | null>(null)
  const [items, setItems] = useState<CircleItem[]>([])
  const [contentNotice, setContentNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setReady(false)
      setMissing(false)
      setName(null)
      setWriteTarget(null)
      setRelease(null)
      setCreated(false)
      setError(null)
      setExperienceId(null)
      setNorthStar(null)
      setItems([])
      setContentNotice(null)
      const curiosity = await getCuriosity(curiosityId)
      if (cancelled) return
      if (!curiosity) {
        setMissing(true)
        setReady(true)
        return
      }
      setName(curiosity.name)
      const target = experienceWriteTarget(readPublicSupabaseEnv())
      const productionOpen = experienceClientProductionOpen({
        nodeEnv: process.env.NODE_ENV,
        target,
        uiPermit: process.env.NEXT_PUBLIC_EXPERIENCE_PRODUCTION_UI,
        serverDecision: productionDecision,
      })
      if (target !== 'allowed' && !productionOpen) {
        setWriteTarget(target)
        if (target === 'production') setRelease(productionDecision === 'closed' ? 'closed' : 'split')
        setReady(true)
        return
      }
      const opened = await openExperience(curiosityId, productionOpen)
      if (cancelled) return
      try {
        const content = await loadExperienceContent(opened.id, productionOpen)
        if (cancelled) return
        setExperienceId(opened.id)
        setNorthStar(content.northStar)
        setItems(content.items)
      } catch (reason: unknown) {
        if (cancelled) return
        setContentNotice(reason instanceof Error ? reason.message : 'The experience could not be opened.')
      }
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
  }, [curiosityId, productionDecision])

  async function openStage(stage: StageId) {
    if (!account.ready || account.missingCuriosity) return
    await account.write({ ...account.workspace, stage: surfaceStage(stage) })
    router.push(studioPath(curiosityOpenPath(curiosityId)))
  }

  return (
    <LeaveGuard>
      <StudioShell stage={account.workspace.stage} counts={workspaceCounts(account.workspace)} onStage={(stage) => { void openStage(stage) }} email={account.email} curiosityId={curiosityId} curiosityName={account.curiosityName ?? name} onBeforeLeave={account.holdDrafts} onSignOut={() => { void account.signOut() }} experienceActive>
        <div className="min-w-0">
          {!ready ? <p className="text-sm text-studio-muted">Opening the experience…</p> : missing ? (
            <section className={`${panelClass} mt-8`}>
              <p className="text-sm">This curiosity is not in your account. <Link className="font-semibold underline-offset-2 hover:underline" href={studioPath('/')}>Return to your curiosities</Link></p>
            </section>
          ) : (
            <>
              <header className="mb-8">
                <Eyebrow>Experience</Eyebrow>
                <h2 className="mt-2 font-serif text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">{name}</h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-studio-body">
                  This is the one experience for {name}. It stays with this curiosity.
                </p>
                {writeTarget === 'production' && release === 'split' ? <p className="mt-4 text-sm leading-relaxed text-studio-body">{mismatchNotice}</p> : null}
                {writeTarget === 'production' && release !== 'split' ? <p className="mt-4 text-sm leading-relaxed text-studio-body">{productionNotice}</p> : null}
                {writeTarget === 'refused' ? <p className="mt-4 text-sm leading-relaxed text-studio-body">{refusedNotice}</p> : null}
                {writeTarget === 'allowed' && created ? <p className="mt-4 text-sm text-studio-body">This experience has been opened for the first time.</p> : null}
                {writeTarget === 'allowed' && !created && !error ? <p className="mt-4 text-sm text-studio-body">This experience was already open.</p> : null}
                {contentNotice ? <p role="alert" className="mt-4 text-sm">{contentNotice}</p> : null}
                {error ? <p role="alert" className="mt-4 text-sm">{error}</p> : null}
              </header>
              {writeTarget === 'allowed' && experienceId ? (
                <ExperienceWorkspace key={experienceId} curiosityId={curiosityId} experienceId={experienceId} northStar={northStar} items={items} productionOpen={productionDecision === 'open'} />
              ) : null}
            </>
          )}
        </div>
      </StudioShell>
    </LeaveGuard>
  )
}
