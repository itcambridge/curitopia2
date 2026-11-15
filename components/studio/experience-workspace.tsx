'use client'

import { useState } from 'react'
import { ExperienceClearing } from '@/components/studio/experience-clearing'
import { ExperienceConversation } from '@/components/studio/experience-conversation'
import type { CircleItem } from '@/lib/questions/experience-content'
import type { FacilitationReading } from '@/lib/questions/experience-facilitator'
import { mergeProposals, proposalsFromReading, withoutProposal, type HeldExperiment, type LandscapeProposal, type ProposalActions } from '@/lib/questions/experience-proposals'

export function ExperienceWorkspace({
  curiosityId,
  experienceId,
  northStar,
  items,
  productionOpen,
}: {
  curiosityId: string
  experienceId: string
  northStar: string | null
  items: CircleItem[]
  productionOpen: boolean
}) {
  const [proposals, setProposals] = useState<LandscapeProposal[]>([])
  const [heldExperiments, setHeldExperiments] = useState<HeldExperiment[]>([])
  const [actions, setActions] = useState<ProposalActions | null>(null)

  function onReading(reading: FacilitationReading) {
    setProposals((current) => mergeProposals(
      current,
      proposalsFromReading(reading, () => crypto.randomUUID()),
      items,
      northStar,
      heldExperiments.map((experiment) => experiment.invitation),
    ))
  }

  function onHold(experiment: HeldExperiment) {
    setHeldExperiments((current) => current.some((item) => item.invitation.trim().toLowerCase() === experiment.invitation.trim().toLowerCase()) ? current : [...current, experiment])
  }

  return (
    <div className="mt-8 grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(18rem,26rem)_minmax(0,1fr)] lg:gap-6">
      <ExperienceConversation
        curiosityId={curiosityId}
        experienceId={experienceId}
        proposals={proposals}
        actions={actions}
        onReading={onReading}
      />
      <ExperienceClearing
        experienceId={experienceId}
        northStar={northStar}
        items={items}
        proposals={proposals}
        heldExperiments={heldExperiments}
        productionOpen={productionOpen}
        onBind={setActions}
        onSettled={(id) => setProposals((current) => withoutProposal(current, id))}
        onHold={onHold}
      />
    </div>
  )
}
