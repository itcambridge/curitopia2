import type { CircleName } from './experience-content.ts'
import type { FacilitationReading } from './experience-facilitator.ts'
import { experimentDetailLimit, experimentInvitationLimit } from './experience-facilitator.ts'

export type PhraseProposal = {
  id: string
  kind: 'phrase'
  circle: CircleName
  body: string
  because: string
}

export type NorthStarProposal = {
  id: string
  kind: 'north-star'
  wording: string
  because: string
}

export type ShiftProposal = {
  id: string
  kind: 'shift'
  itemId: string
  from: CircleName
  to: CircleName
  because: string
}

export type RevisionProposal = {
  id: string
  kind: 'revision'
  itemId: string
  body: string
  because: string
}

export type ExperimentProposal = {
  id: string
  kind: 'experiment'
  invitation: string
  why: string
  mightReveal: string
  sourceLabel: string
}

export type HeldExperiment = {
  id: string
  invitation: string
  why: string
  mightReveal: string
  sourceLabel: string
}

export type LandscapeProposal = PhraseProposal | NorthStarProposal | ShiftProposal | RevisionProposal | ExperimentProposal

export type ProposalActions = {
  acceptPhrase: (proposal: PhraseProposal, body: string, circle: CircleName) => void
  acceptStar: (proposal: NorthStarProposal, wording: string) => void
  acceptShift: (proposal: ShiftProposal, circle: CircleName) => void
  acceptRevision: (proposal: RevisionProposal, body: string) => void
  acceptExperiment: (proposal: ExperimentProposal, invitation: string, why: string, mightReveal: string) => void
  reject: (id: string) => void
}

export function proposalsFromReading(reading: FacilitationReading, createId: () => string): LandscapeProposal[] {
  const proposals: LandscapeProposal[] = []
  if (reading.northStar) {
    proposals.push({
      id: createId(),
      kind: 'north-star',
      wording: reading.northStar.wording,
      because: reading.northStar.because,
    })
  }
  for (const phrase of reading.phrases ?? []) {
    proposals.push({ id: createId(), kind: 'phrase', circle: phrase.circle, body: phrase.body, because: phrase.because })
  }
  for (const revision of reading.revisions ?? []) {
    proposals.push({ id: createId(), kind: 'revision', itemId: revision.itemId, body: revision.body, because: revision.because })
  }
  for (const shift of reading.shifts ?? []) {
    if (!shift.from || shift.from === shift.to) continue
    proposals.push({
      id: createId(),
      kind: 'shift',
      itemId: shift.itemId,
      from: shift.from,
      to: shift.to,
      because: shift.because,
    })
  }
  if (reading.experiment) {
    proposals.push({
      id: createId(),
      kind: 'experiment',
      invitation: reading.experiment.invitation,
      why: reading.experiment.why,
      mightReveal: reading.experiment.mightReveal,
      sourceLabel: reading.experiment.sourceLabel,
    })
  }
  return proposals
}

function sameText(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

export function mergeProposals(
  current: readonly LandscapeProposal[],
  incoming: readonly LandscapeProposal[],
  notes: readonly { circle: CircleName; body: string }[],
  northStar: string | null,
  heldInvitations: readonly string[] = [],
): LandscapeProposal[] {
  const next = [...current]
  for (const proposal of incoming) {
    if (proposal.kind === 'phrase') {
      const duplicate = notes.some((note) => note.circle === proposal.circle && sameText(note.body, proposal.body))
        || next.some((item) => item.kind === 'phrase' && item.circle === proposal.circle && sameText(item.body, proposal.body))
      if (duplicate) continue
      next.push(proposal)
    } else if (proposal.kind === 'north-star') {
      if (northStar && sameText(northStar, proposal.wording)) continue
      const index = next.findIndex((item) => item.kind === 'north-star')
      if (index >= 0) next[index] = proposal
      else next.push(proposal)
    } else if (proposal.kind === 'shift') {
      const index = next.findIndex((item) => item.kind === 'shift' && item.itemId === proposal.itemId)
      if (index >= 0) next[index] = proposal
      else next.push(proposal)
    } else if (proposal.kind === 'revision') {
      const index = next.findIndex((item) => item.kind === 'revision' && item.itemId === proposal.itemId)
      if (index >= 0) next[index] = proposal
      else next.push(proposal)
    } else {
      const held = heldInvitations.some((invitation) => sameText(invitation, proposal.invitation))
        || next.some((item) => item.kind === 'experiment' && sameText(item.invitation, proposal.invitation))
      if (held) continue
      const index = next.findIndex((item) => item.kind === 'experiment')
      if (index >= 0) next[index] = proposal
      else next.push(proposal)
    }
  }
  return next
}

export function withoutProposal(proposals: readonly LandscapeProposal[], id: string) {
  return proposals.filter((proposal) => proposal.id !== id)
}

export function holdExperiment(
  proposal: ExperimentProposal,
  invitation: string,
  why: string,
  mightReveal: string,
): HeldExperiment | null {
  const nextInvitation = invitation.trim()
  const nextWhy = why.trim()
  const nextReveal = mightReveal.trim()
  if (!nextInvitation || nextInvitation.length > experimentInvitationLimit) return null
  if (!nextWhy || nextWhy.length > experimentDetailLimit) return null
  if (!nextReveal || nextReveal.length > experimentDetailLimit) return null
  return {
    id: proposal.id,
    invitation: nextInvitation,
    why: nextWhy,
    mightReveal: nextReveal,
    sourceLabel: proposal.sourceLabel,
  }
}
