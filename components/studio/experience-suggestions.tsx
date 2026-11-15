'use client'

import { useState } from 'react'
import { coralButton, quietButton } from '@/components/studio/studio-ui'
import { circleById, circleItemMaxLength, circles, northStarMaxLength, type CircleName } from '@/lib/questions/experience-content'
import { experimentDetailLimit, experimentInvitationLimit } from '@/lib/questions/experience-facilitator'
import type { ExperimentProposal, HeldExperiment, LandscapeProposal, NorthStarProposal, PhraseProposal, ProposalActions, RevisionProposal, ShiftProposal } from '@/lib/questions/experience-proposals'

const suggestionClass = 'grid w-full max-w-sm gap-3 rounded-[1.4rem] border border-dashed border-[#e07a5f] bg-[#fffaf3] p-4'

function Actions({
  busy,
  editing,
  onEdit,
  onAccept,
  onReject,
}: {
  busy: boolean
  editing: boolean
  onEdit: () => void
  onAccept: () => void
  onReject: () => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={`${coralButton} min-h-11`} disabled={busy} onClick={onAccept}>Accept</button>
      {editing ? null : <button type="button" className={`${quietButton} min-h-11`} disabled={busy} onClick={onEdit}>Edit</button>}
      <button type="button" className={`${quietButton} min-h-11`} disabled={busy} onClick={onReject}>Reject</button>
    </div>
  )
}

function PhraseCard({
  proposal,
  busy,
  actions,
}: {
  proposal: PhraseProposal
  busy: boolean
  actions: ProposalActions
}) {
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(proposal.body)
  const [circle, setCircle] = useState<CircleName>(proposal.circle)
  return (
    <article className={suggestionClass}>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-studio-eyebrow">Suggestion</p>
      {editing ? (
        <>
          <label className="sr-only" htmlFor={`${proposal.id}-body`}>Suggested phrase</label>
          <input id={`${proposal.id}-body`} value={body} maxLength={circleItemMaxLength} onChange={(event) => setBody(event.target.value)} className="w-full rounded-2xl border border-studio-line bg-studio-cream px-4 py-3 text-base outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-studio-coral" />
          <div className="flex flex-wrap gap-2">
            {circles.map((entry) => (
              <button key={entry.id} type="button" className={entry.id === circle ? coralButton : quietButton} onClick={() => setCircle(entry.id)}>{entry.label}</button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="font-serif text-lg leading-snug">{proposal.body}</p>
          <p className="text-sm leading-relaxed text-studio-body">Suggested in {circleById(proposal.circle).label}. {proposal.because}</p>
        </>
      )}
      <Actions busy={busy || !actions} editing={editing} onEdit={() => setEditing(true)} onAccept={() => actions.acceptPhrase(proposal, editing ? body : proposal.body, editing ? circle : proposal.circle)} onReject={() => actions.reject(proposal.id)} />
    </article>
  )
}

function StarCard({
  proposal,
  busy,
  actions,
}: {
  proposal: NorthStarProposal
  busy: boolean
  actions: ProposalActions
}) {
  const [editing, setEditing] = useState(false)
  const [wording, setWording] = useState(proposal.wording)
  return (
    <article className={suggestionClass}>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-studio-eyebrow">Suggested North Star</p>
      {editing ? (
        <>
          <label className="sr-only" htmlFor={`${proposal.id}-star`}>Suggested North Star</label>
          <textarea id={`${proposal.id}-star`} value={wording} maxLength={northStarMaxLength} rows={3} onChange={(event) => setWording(event.target.value)} className="w-full rounded-2xl border border-studio-line bg-studio-cream px-4 py-3 text-base outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-studio-coral" />
        </>
      ) : (
        <>
          <p className="font-serif text-lg italic leading-snug">{proposal.wording}</p>
          <p className="text-sm leading-relaxed text-studio-body">{proposal.because}</p>
        </>
      )}
      <Actions busy={busy || !actions} editing={editing} onEdit={() => setEditing(true)} onAccept={() => actions.acceptStar(proposal, editing ? wording : proposal.wording)} onReject={() => actions.reject(proposal.id)} />
    </article>
  )
}

function ShiftCard({
  proposal,
  busy,
  actions,
}: {
  proposal: ShiftProposal
  busy: boolean
  actions: ProposalActions
}) {
  const [editing, setEditing] = useState(false)
  const [circle, setCircle] = useState<CircleName>(proposal.to)
  return (
    <article className={suggestionClass}>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-studio-eyebrow">Suggested move</p>
      <p className="text-sm leading-relaxed text-studio-body">From {circleById(proposal.from).label} to {circleById(editing ? circle : proposal.to).label}. {proposal.because}</p>
      {editing ? (
        <div className="flex flex-wrap gap-2">
          {circles.filter((entry) => entry.id !== proposal.from).map((entry) => (
            <button key={entry.id} type="button" className={entry.id === circle ? coralButton : quietButton} onClick={() => setCircle(entry.id)}>{entry.label}</button>
          ))}
        </div>
      ) : null}
      <Actions busy={busy || !actions} editing={editing} onEdit={() => setEditing(true)} onAccept={() => actions.acceptShift(proposal, editing ? circle : proposal.to)} onReject={() => actions.reject(proposal.id)} />
    </article>
  )
}

function RevisionCard({
  proposal,
  busy,
  actions,
}: {
  proposal: RevisionProposal
  busy: boolean
  actions: ProposalActions
}) {
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(proposal.body)
  return (
    <article className={suggestionClass}>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-studio-eyebrow">Suggested wording</p>
      {editing ? (
        <>
          <label className="sr-only" htmlFor={`${proposal.id}-revision`}>Suggested wording</label>
          <input id={`${proposal.id}-revision`} value={body} maxLength={circleItemMaxLength} onChange={(event) => setBody(event.target.value)} className="w-full rounded-2xl border border-studio-line bg-studio-cream px-4 py-3 text-base outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-studio-coral" />
        </>
      ) : (
        <>
          <p className="font-serif text-lg leading-snug">{proposal.body}</p>
          <p className="text-sm leading-relaxed text-studio-body">{proposal.because}</p>
        </>
      )}
      <Actions busy={busy || !actions} editing={editing} onEdit={() => setEditing(true)} onAccept={() => actions.acceptRevision(proposal, editing ? body : proposal.body)} onReject={() => actions.reject(proposal.id)} />
    </article>
  )
}

const invitationField = 'w-full rounded-2xl border border-studio-line bg-studio-cream px-4 py-3 text-base outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-studio-coral'

function ExperimentCard({
  proposal,
  busy,
  actions,
}: {
  proposal: ExperimentProposal
  busy: boolean
  actions: ProposalActions
}) {
  const [editing, setEditing] = useState(false)
  const [invitation, setInvitation] = useState(proposal.invitation)
  const [why, setWhy] = useState(proposal.why)
  const [mightReveal, setMightReveal] = useState(proposal.mightReveal)
  const shownInvitation = editing ? invitation : proposal.invitation
  const shownWhy = editing ? why : proposal.why
  const shownReveal = editing ? mightReveal : proposal.mightReveal
  return (
    <article className={suggestionClass}>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-studio-eyebrow">One possibility</p>
      {editing ? (
        <div className="grid gap-2">
          <label className="sr-only" htmlFor={`${proposal.id}-invitation`}>What you might try</label>
          <textarea id={`${proposal.id}-invitation`} value={invitation} maxLength={experimentInvitationLimit} rows={3} onChange={(event) => setInvitation(event.target.value)} className={invitationField} />
          <label className="sr-only" htmlFor={`${proposal.id}-why`}>Why it might be useful</label>
          <textarea id={`${proposal.id}-why`} value={why} maxLength={experimentDetailLimit} rows={2} onChange={(event) => setWhy(event.target.value)} className={invitationField} />
          <label className="sr-only" htmlFor={`${proposal.id}-reveal`}>What it might reveal</label>
          <textarea id={`${proposal.id}-reveal`} value={mightReveal} maxLength={experimentDetailLimit} rows={2} onChange={(event) => setMightReveal(event.target.value)} className={invitationField} />
        </div>
      ) : (
        <>
          <p className="font-serif text-lg leading-snug">{shownInvitation}</p>
          <p className="text-sm leading-relaxed text-studio-body">{shownWhy}</p>
          <p className="text-sm leading-relaxed text-studio-body">{shownReveal}</p>
        </>
      )}
      <p className="text-sm text-studio-muted">From {proposal.sourceLabel}</p>
      <Actions
        busy={busy || !actions}
        editing={editing}
        onEdit={() => setEditing(true)}
        onAccept={() => actions.acceptExperiment(proposal, shownInvitation, shownWhy, shownReveal)}
        onReject={() => actions.reject(proposal.id)}
      />
    </article>
  )
}

export function HeldInvitation({ experiment }: { experiment: HeldExperiment }) {
  return (
    <article className="grid w-full max-w-sm gap-2 rounded-[1.4rem] bg-[#fffaf3] p-4 shadow-[0_10px_22px_rgb(90_70_45/0.08)]">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-studio-eyebrow">For this visit</p>
      <p className="font-serif text-lg leading-snug">{experiment.invitation}</p>
      <p className="text-sm leading-relaxed text-studio-body">{experiment.why}</p>
      <p className="text-sm leading-relaxed text-studio-body">{experiment.mightReveal}</p>
      <p className="text-sm text-studio-muted">From {experiment.sourceLabel}</p>
    </article>
  )
}

export function SuggestionCard({
  proposal,
  busy,
  actions,
}: {
  proposal: LandscapeProposal
  busy: boolean
  actions: ProposalActions | null
}) {
  if (!actions) return null
  if (proposal.kind === 'phrase') return <PhraseCard proposal={proposal} busy={busy} actions={actions} />
  if (proposal.kind === 'north-star') return <StarCard proposal={proposal} busy={busy} actions={actions} />
  if (proposal.kind === 'shift') return <ShiftCard proposal={proposal} busy={busy} actions={actions} />
  if (proposal.kind === 'experiment') return <ExperimentCard proposal={proposal} busy={busy} actions={actions} />
  return <RevisionCard proposal={proposal} busy={busy} actions={actions} />
}
