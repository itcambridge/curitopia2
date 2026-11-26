'use client'

import { useState } from 'react'
import { ExperienceClearing } from '@/components/studio/experience-clearing'
import { ExperienceConversation } from '@/components/studio/experience-conversation'
import { ExperienceGallery } from '@/components/studio/experience-gallery'
import type { CircleItem } from '@/lib/questions/experience-content'
import type { ConceptRecord, Workspace } from '@/lib/questions/types'
import type { FacilitationReading } from '@/lib/questions/experience-facilitator'
import { mergeProposals, proposalsFromReading, withoutProposal, type HeldExperiment, type LandscapeProposal, type ProposalActions } from '@/lib/questions/experience-proposals'

export function ExperienceWorkspace({
  curiosityId,
  experienceId,
  northStar,
  items,
  productionOpen,
  onRecordConcept,
  concepts,
  conceptsLoaded,
  workspace,
  onChange,
  saving,
  savedConceptId,
}: {
  curiosityId: string
  experienceId: string
  northStar: string | null
  items: CircleItem[]
  productionOpen: boolean
  onRecordConcept: (concept: ConceptRecord) => Promise<void>
  concepts: readonly ConceptRecord[]
  conceptsLoaded: boolean
  workspace: Workspace
  onChange: (workspace: Workspace) => void
  saving: boolean
  savedConceptId: string | null
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
    <div className="grid min-w-0 gap-10">
    <ExperienceGallery
      experienceId={experienceId}
      concepts={concepts}
      conceptsLoaded={conceptsLoaded}
      workspace={workspace}
      onChange={onChange}
      saving={saving}
      savedConceptId={savedConceptId}
    />
    <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(18rem,26rem)_minmax(0,1fr)] lg:gap-6">
      <ExperienceConversation
        curiosityId={curiosityId}
        experienceId={experienceId}
        proposals={proposals}
        actions={actions}
        onReading={onReading}
      />
      <ExperienceClearing
        curiosityId={curiosityId}
        experienceId={experienceId}
        northStar={northStar}
        items={items}
        proposals={proposals}
        heldExperiments={heldExperiments}
        productionOpen={productionOpen}
        onBind={setActions}
        onSettled={(id) => setProposals((current) => withoutProposal(current, id))}
        onHold={onHold}
        onRecordConcept={onRecordConcept}
      />
    </div>
    </div>
  )
}
