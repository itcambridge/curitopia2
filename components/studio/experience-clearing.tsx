'use client'

import { ArrowLeftRight, Link2, Pencil, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { coralButton, Eyebrow, quietButton } from '@/components/studio/studio-ui'
import { SuggestionCard, HeldInvitation } from '@/components/studio/experience-suggestions'
import {
  circleById,
  circleItemMaxLength,
  circles,
  eligibleLinkPartners,
  experienceContentView,
  itemsByCircle,
  northStarMaxLength,
  proposeRelationship,
  reconcileRelationships,
  relationshipCapMessage,
  relationshipSentence,
  relationshipsForPhrase,
  relationshipVisitNote,
  withoutPhrase,
  type CircleItem,
  type CircleName,
  type PhraseRelationship,
} from '@/lib/questions/experience-content'
import { addCircleItem, deleteCircleItem, editCircleItem, moveCircleItem, saveNorthStar } from '@/lib/questions/supabase-experience-content'
import type { HeldExperiment, LandscapeProposal, ProposalActions } from '@/lib/questions/experience-proposals'
import { holdExperiment } from '@/lib/questions/experience-proposals'
import { experimentVisitNote } from '@/lib/questions/experience-facilitator'

const fieldClass = 'w-full rounded-2xl border border-studio-line bg-studio-cream px-4 py-3 text-base outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-studio-coral'
const textAction = 'min-h-11 rounded-md px-1 text-sm font-semibold text-studio-ink underline decoration-studio-line underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral disabled:opacity-40'
const thoughtRest = 'min-h-11 w-fit max-w-full rounded-full bg-[#fffaf3] px-5 py-2.5 text-left font-serif text-lg leading-snug text-studio-ink shadow-[0_10px_22px_rgb(90_70_45/0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-studio-coral'
const thoughtOpen = 'min-h-11 w-fit max-w-full rounded-full bg-[#fffaf3] px-5 py-2.5 text-left font-serif text-lg leading-snug text-studio-ink shadow-[0_0_0_2px_#ff7f50,0_12px_26px_rgb(184_71_42/0.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-studio-coral'
const detailAction = `${quietButton} flex w-full items-center justify-start gap-2`

function replaceItem(items: CircleItem[], next: CircleItem) {
  return experienceContentView({
    northStar: null,
    items: items.map((item) => item.id === next.id ? next : item),
  }).items
}

function LinkLines({
  ground,
  selectedId,
  partnerKey,
}: {
  ground: HTMLDivElement | null
  selectedId: string | null
  partnerKey: string
}) {
  const [segments, setSegments] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([])
  useLayoutEffect(() => {
    const partnerIds = partnerKey ? partnerKey.split(',') : []
    if (!ground || !selectedId || partnerIds.length === 0) {
      setSegments([])
      return
    }
    function measure() {
      if (!ground || !selectedId) return
      const box = ground.getBoundingClientRect()
      const from = ground.querySelector<HTMLElement>(`[data-phrase-id="${CSS.escape(selectedId)}"]`)
      if (!from) {
        setSegments([])
        return
      }
      const start = from.getBoundingClientRect()
      setSegments(partnerIds.flatMap((id) => {
        const partner = ground.querySelector<HTMLElement>(`[data-phrase-id="${CSS.escape(id)}"]`)
        if (!partner) return []
        const end = partner.getBoundingClientRect()
        return [{
          x1: start.left + start.width / 2 - box.left,
          y1: start.top + start.height / 2 - box.top,
          x2: end.left + end.width / 2 - box.left,
          y2: end.top + end.height / 2 - box.top,
        }]
      }))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [ground, selectedId, partnerKey])
  if (segments.length === 0) return null
  return (
    <svg className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full lg:block" aria-hidden="true">
      {segments.map((segment) => {
        const midX = (segment.x1 + segment.x2) / 2
        const midY = (segment.y1 + segment.y2) / 2
        const dx = segment.x2 - segment.x1
        const dy = segment.y2 - segment.y1
        const length = Math.hypot(dx, dy) || 1
        const bend = Math.min(42, length * 0.14)
        const cx = midX - (dy / length) * bend
        const cy = midY + (dx / length) * bend
        return (
          <path key={`${segment.x1}-${segment.y1}-${segment.x2}-${segment.y2}`} d={`M ${segment.x1} ${segment.y1} Q ${cx} ${cy} ${segment.x2} ${segment.y2}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="text-studio-coral" opacity="0.75" />
        )
      })}
    </svg>
  )
}

function ClearingTerrain() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 1200 980">
      <rect width="1200" height="980" fill="#f4efe6" />
      <path fill="#f7f1e6" d="M0 40 C220 0 380 120 640 70 C900 20 1060 100 1200 50 V240 C980 190 740 270 480 220 C240 170 90 220 0 180 Z" />
      <path fill="#efe4d4" d="M0 130 C200 80 440 190 700 130 C940 76 1100 150 1200 100 V320 C1000 260 720 350 460 290 C220 230 80 280 0 240 Z" />
      <path fill="#e5f0e3" d="M0 230 C180 180 400 320 680 250 C920 190 1080 280 1200 220 V500 C980 430 700 540 420 470 C180 410 70 460 0 420 Z" />
      <path fill="#d3e5d2" d="M0 340 C240 280 480 430 780 350 C1000 290 1120 380 1200 320 V640 C990 560 720 680 440 610 C190 540 70 600 0 550 Z" />
      <path fill="#c5dac6" opacity="0.8" d="M0 450 C260 390 520 540 820 450 C1020 390 1140 470 1200 420 V760 C1000 680 740 800 460 720 C210 650 80 710 0 660 Z" />
      <path fill="#ead9c6" d="M0 560 C220 500 480 660 800 560 C1020 490 1140 580 1200 520 V980 H0 Z" />
      <path fill="#e0cdb6" opacity="0.85" d="M0 700 C280 630 540 790 860 690 C1060 620 1160 710 1200 650 V980 H0 Z" />
      <g fill="none" stroke="#6d947c" strokeWidth="1.25" className="opacity-40 sm:opacity-70">
        <path d="M240 168 C420 128 640 210 880 160 S1160 120 1220 156" />
        <path d="M260 206 C460 168 680 250 920 198 S1160 160 1220 196" />
        <path d="M220 248 C460 190 700 320 960 240 S1160 180 1220 230" />
        <path d="M240 292 C500 236 740 360 990 286 S1160 230 1220 274" />
        <path d="M200 470 C470 400 740 560 1020 460 S1180 400 1220 450" />
        <path d="M220 518 C500 452 760 600 1040 512 S1180 456 1220 500" />
        <path d="M180 700 C480 620 780 800 1080 690 S1200 640 1220 690" />
        <path d="M200 748 C510 674 800 840 1100 742 S1200 700 1220 740" />
      </g>
    </svg>
  )
}

const regionSpace = {
  concern: 'px-4 pb-2 pt-2 sm:px-10 lg:grid lg:min-h-48 lg:grid-cols-[12rem_minmax(0,1fr)] lg:items-start lg:gap-x-10 lg:px-12 lg:pb-10 lg:pt-2',
  influence: 'px-4 py-5 sm:px-10 lg:grid lg:min-h-52 lg:grid-cols-[12rem_minmax(0,1fr)] lg:items-start lg:gap-x-10 lg:px-12 lg:py-10',
  control: 'px-4 pb-3 pt-4 sm:px-10 lg:grid lg:min-h-48 lg:grid-cols-[12rem_minmax(0,1fr)] lg:items-start lg:gap-x-8 lg:px-12 lg:pb-8 lg:pt-8',
} as const

const phraseFlow = {
  concern: 'mt-4 grid justify-items-start gap-3 lg:mt-1 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-8',
  influence: 'mt-4 grid justify-items-start gap-3 lg:mt-6 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-8',
  control: 'mt-4 grid justify-items-start gap-3 lg:mt-4 lg:grid-cols-2 lg:gap-x-14 lg:gap-y-6',
} as const

function phrasePlace(index: number) {
  if (index % 2 === 1) return 'lg:mt-8 lg:justify-self-end'
  return 'lg:mt-1 lg:justify-self-start'
}

export function ExperienceClearing({
  experienceId,
  northStar,
  items,
  proposals,
  heldExperiments,
  onBind,
  onSettled,
  onHold,
  productionOpen,
}: {
  experienceId: string
  northStar: string | null
  items: CircleItem[]
  proposals: LandscapeProposal[]
  heldExperiments: HeldExperiment[]
  productionOpen: boolean
  onBind: (actions: ProposalActions) => void
  onSettled: (id: string) => void
  onHold: (experiment: HeldExperiment) => void
}) {
  const [star, setStar] = useState(northStar)
  const [notes, setNotes] = useState(items)
  const [links, setLinks] = useState<PhraseRelationship[]>([])
  const [editingStar, setEditingStar] = useState(false)
  const [starDraft, setStarDraft] = useState(northStar ?? '')
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [itemDraft, setItemDraft] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [pendingMove, setPendingMove] = useState<CircleName | null>(null)
  const [choosingMove, setChoosingMove] = useState(false)
  const [pendingPartnerId, setPendingPartnerId] = useState<string | null>(null)
  const [adding, setAdding] = useState<CircleName | null>(null)
  const [drafts, setDrafts] = useState<Record<CircleName, string>>({ concern: '', influence: '', control: '' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const starField = useId()
  const busyRef = useRef(false)
  const notesRef = useRef(notes)
  const actionsRef = useRef<ProposalActions>(null as unknown as ProposalActions)
  notesRef.current = notes
  const [groundNode, setGroundNode] = useState<HTMLDivElement | null>(null)
  const rememberGround = useCallback((node: HTMLDivElement | null) => {
    setGroundNode(node)
  }, [])
  const grouped = itemsByCircle(notes)
  const selected = notes.find((item) => item.id === selectedId) ?? null
  const partnerKey = selected
    ? relationshipsForPhrase(links, selected.id).map((link) => link.fromId === selected.id ? link.toId : link.fromId).join(',')
    : ''
  const heldSentences = links.flatMap((link) => {
    const sentence = relationshipSentence(link, notes)
    return sentence ? [sentence] : []
  })

  async function run(action: () => Promise<void>) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setMessage(null)
    try {
      await action()
    } catch (reason: unknown) {
      setMessage(reason instanceof Error ? reason.message : 'The experience could not be saved.')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  function rejectSuggestion(id: string) {
    onSettled(id)
  }

  function acceptSuggestedPhrase(proposal: Extract<LandscapeProposal, { kind: 'phrase' }>, body: string, circle: CircleName) {
    void run(async () => {
      const saved = await addCircleItem(experienceId, circle, body, productionOpen)
      setNotes((current) => experienceContentView({ northStar: null, items: [...current, saved] }).items)
      onSettled(proposal.id)
    })
  }

  function acceptSuggestedStar(proposal: Extract<LandscapeProposal, { kind: 'north-star' }>, wording: string) {
    void run(async () => {
      const saved = await saveNorthStar(experienceId, wording, productionOpen)
      setStar(saved)
      setStarDraft(saved ?? '')
      setEditingStar(false)
      onSettled(proposal.id)
    })
  }

  function acceptSuggestedShift(proposal: Extract<LandscapeProposal, { kind: 'shift' }>, circle: CircleName) {
    void run(async () => {
      const saved = await moveCircleItem(proposal.itemId, circle, productionOpen)
      const next = notesRef.current.some((item) => item.id === saved.id) ? replaceItem(notesRef.current, saved) : notesRef.current
      setNotes(next)
      setLinks((present) => reconcileRelationships(present, next))
      onSettled(proposal.id)
    })
  }

  function acceptSuggestedRevision(proposal: Extract<LandscapeProposal, { kind: 'revision' }>, body: string) {
    void run(async () => {
      const saved = await editCircleItem(proposal.itemId, body, productionOpen)
      setNotes((current) => current.some((item) => item.id === saved.id) ? replaceItem(current, saved) : current)
      onSettled(proposal.id)
    })
  }

  function acceptSuggestedExperiment(proposal: Extract<LandscapeProposal, { kind: 'experiment' }>, invitation: string, why: string, mightReveal: string) {
    const held = holdExperiment(proposal, invitation, why, mightReveal)
    if (!held) return
    onHold(held)
    onSettled(proposal.id)
  }

  actionsRef.current = {
    acceptPhrase: acceptSuggestedPhrase,
    acceptStar: acceptSuggestedStar,
    acceptShift: acceptSuggestedShift,
    acceptRevision: acceptSuggestedRevision,
    acceptExperiment: acceptSuggestedExperiment,
    reject: rejectSuggestion,
  }

  useEffect(() => {
    onBind({
      acceptPhrase: (proposal, body, circle) => actionsRef.current.acceptPhrase(proposal, body, circle),
      acceptStar: (proposal, wording) => actionsRef.current.acceptStar(proposal, wording),
      acceptShift: (proposal, circle) => actionsRef.current.acceptShift(proposal, circle),
      acceptRevision: (proposal, body) => actionsRef.current.acceptRevision(proposal, body),
      acceptExperiment: (proposal, invitation, why, mightReveal) => actionsRef.current.acceptExperiment(proposal, invitation, why, mightReveal),
      reject: (id) => actionsRef.current.reject(id),
    })
  }, [onBind])

  function saveStar() {
    const draft = starDraft
    void run(async () => {
      const saved = await saveNorthStar(experienceId, draft, productionOpen)
      setStar(saved)
      setStarDraft(saved ?? '')
      setEditingStar(false)
      setConfirmingClear(false)
    })
  }

  function clearStar() {
    void run(async () => {
      const saved = await saveNorthStar(experienceId, '', productionOpen)
      setStar(saved)
      setStarDraft('')
      setEditingStar(false)
      setConfirmingClear(false)
    })
  }

  function addNote(circle: CircleName) {
    const draft = drafts[circle]
    void run(async () => {
      const saved = await addCircleItem(experienceId, circle, draft, productionOpen)
      setNotes((current) => experienceContentView({ northStar: null, items: [...current, saved] }).items)
      setDrafts((current) => ({ ...current, [circle]: '' }))
      setAdding(null)
    })
  }

  function saveNote(itemId: string) {
    const draft = itemDraft
    void run(async () => {
      const saved = await editCircleItem(itemId, draft, productionOpen)
      setNotes((current) => replaceItem(current, saved))
      setEditingItemId(null)
      setItemDraft('')
    })
  }

  function confirmMove(item: CircleItem) {
    const circle = pendingMove
    if (!circle || circle === item.circle) return
    void run(async () => {
      const saved = await moveCircleItem(item.id, circle, productionOpen)
      const next = replaceItem(notes, saved)
      setNotes(next)
      setLinks((present) => reconcileRelationships(present, next))
      setPendingMove(null)
      setChoosingMove(false)
    })
  }

  function removeNote(itemId: string) {
    void run(async () => {
      await deleteCircleItem(itemId, productionOpen)
      setNotes((current) => current.filter((item) => item.id !== itemId))
      setLinks((current) => withoutPhrase(current, itemId))
      setRemovingId(null)
      setSelectedId(null)
      setEditingItemId(null)
      setPendingMove(null)
      setChoosingMove(false)
      setPendingPartnerId(null)
    })
  }

  function keepLink(item: CircleItem, partner: CircleItem) {
    const proposed = proposeRelationship(item, partner, links)
    if ('error' in proposed) {
      setMessage(proposed.error)
      return
    }
    setLinks((current) => [...current, proposed.link])
    setPendingPartnerId(null)
    setMessage(null)
  }

  return (
    <div className="relative min-w-0">
      <ClearingTerrain />
      <div className="relative z-10">
      <section className="px-4 pt-6 sm:px-10 sm:pt-8 lg:px-12" aria-labelledby={starField}>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div className="min-w-0 max-w-3xl">
            <Eyebrow>North Star</Eyebrow>
            <h3 id={starField} className={star && !editingStar ? 'sr-only' : 'mt-2 max-w-xl font-serif text-3xl leading-tight tracking-tight'}>A direction for this curiosity</h3>
            {star && !editingStar ? <blockquote className="relative z-10 mt-2 bg-[#f4efe6] font-serif text-3xl italic leading-snug tracking-tight sm:text-4xl">{star}</blockquote> : null}
            {!star && !editingStar ? <p className="mt-3 max-w-xl text-base leading-relaxed text-studio-body">A direction can live here.</p> : null}
          </div>
          {!editingStar ? (
            <div className="flex flex-wrap gap-2">
              {confirmingClear ? (
                <>
                  <p className="w-full text-sm text-studio-body">Clear this North Star?</p>
                  <button type="button" className={coralButton} disabled={busy} onClick={clearStar}>Clear</button>
                  <button type="button" className={quietButton} disabled={busy} onClick={() => setConfirmingClear(false)}>Keep</button>
                </>
              ) : (
                <>
                  <button type="button" className={quietButton} disabled={busy} onClick={() => { setEditingStar(true); setStarDraft(star ?? ''); setConfirmingClear(false) }}>{star ? 'Edit' : 'Write a North Star'}</button>
                  {star ? <button type="button" className={quietButton} disabled={busy} onClick={() => setConfirmingClear(true)}>Clear</button> : null}
                </>
              )}
            </div>
          ) : null}
        </div>
        {message ? <p role="alert" className="mt-4 text-sm">{message}</p> : null}
        {editingStar ? (
          <form className="mt-5 max-w-xl" onSubmit={(event) => { event.preventDefault(); saveStar() }}>
            <label htmlFor={`${starField}-draft`} className="sr-only">North Star</label>
            <textarea id={`${starField}-draft`} value={starDraft} maxLength={northStarMaxLength} rows={3} autoComplete="off" onChange={(event) => setStarDraft(event.target.value)} placeholder="A direction you want to move towards" className={`${fieldClass} min-h-28`} />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="submit" className={coralButton} disabled={busy}>Save</button>
              <button type="button" className={quietButton} disabled={busy} onClick={() => { setEditingStar(false); setStarDraft(star ?? '') }}>Cancel</button>
            </div>
          </form>
        ) : null}
        <div aria-hidden="true" className="relative mt-5">
          <svg className="h-12 w-full" viewBox="0 0 1200 48" preserveAspectRatio="none">
            <path d="M0 34 C 180 8, 380 42, 640 18 S 980 4, 1200 28" fill="none" stroke="#c4a882" strokeWidth="1.6" />
            <path d="M0 40 C 200 18, 420 46, 700 26 S 1000 14, 1200 34" fill="none" stroke="#d7c4a8" strokeWidth="1" />
          </svg>
          <span className="absolute right-[8%] top-1 flex flex-col items-center sm:right-[16%]">
            <span className="size-3.5 rounded-full bg-studio-coral shadow-[0_0_0_8px_rgba(255,127,80,0.2)]" />
            <span className="h-24 w-px bg-gradient-to-b from-studio-coral/70 to-transparent" />
          </span>
        </div>
        {proposals.some((proposal) => proposal.kind === 'north-star') ? (
          <div className="mt-4 grid gap-3">
            {proposals.filter((proposal) => proposal.kind === 'north-star').map((proposal) => (
              <SuggestionCard key={proposal.id} proposal={proposal} busy={busy} actions={actionsRef.current} />
            ))}
          </div>
        ) : null}
      </section>
      <section aria-label="Concern, Influence, and Control">
        <div ref={rememberGround} className="relative">
          <LinkLines ground={groundNode} selectedId={selectedId} partnerKey={partnerKey} />
          <div className="relative z-10">
          {circles.map((circle) => (
            <div key={circle.id} className={regionSpace[circle.id]}>
              <div>
                <Eyebrow>{circle.depth}</Eyebrow>
                <h3 id={`${starField}-${circle.id}`} className="mt-2 font-serif text-2xl leading-tight">{circle.label}</h3>
                <p className="mt-1 max-w-xs text-sm leading-relaxed text-studio-body">{circle.hint}</p>
              </div>
              <div>
              <ul className={`${phraseFlow[circle.id]} ${selectedId ? 'lg:pr-[23rem]' : ''}`}>
                {grouped[circle.id].length === 0 && !proposals.some((proposal) => proposal.kind === 'phrase' && proposal.circle === circle.id) ? <li className="basis-full text-sm text-studio-muted">Nothing here yet.</li> : null}
                {grouped[circle.id].map((item, index) => {
                  const open = selectedId === item.id
                  return (
                    <li key={item.id} className={`max-w-full ${phrasePlace(index)} ${open ? 'max-lg:col-span-full' : ''}`}>
                      {editingItemId === item.id ? (
                        <form onSubmit={(event) => { event.preventDefault(); saveNote(item.id) }}>
                          <label htmlFor={`${starField}-${item.id}`} className="sr-only">Edit {item.body}</label>
                          <input id={`${starField}-${item.id}`} value={itemDraft} maxLength={circleItemMaxLength} autoComplete="off" onChange={(event) => setItemDraft(event.target.value)} className={fieldClass} />
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button type="submit" className={coralButton} disabled={busy}>Save</button>
                            <button type="button" className={quietButton} disabled={busy} onClick={() => setEditingItemId(null)}>Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <button
                            type="button"
                            data-phrase-id={item.id}
                            aria-pressed={open}
                            className={open ? thoughtOpen : thoughtRest}
                            onClick={() => {
                              setSelectedId(open ? null : item.id)
                              setRemovingId(null)
                              setPendingMove(null)
                              setChoosingMove(false)
                              setPendingPartnerId(null)
                              setEditingItemId(null)
                            }}
                          >
                            {item.body}
                          </button>
                          {open ? (
                            <div className="z-20 mt-3 w-full max-w-sm rounded-[1.4rem] border border-[#e6d7c6] bg-[#fffaf3] p-4 shadow-[0_18px_40px_rgb(66_51_34/0.1)] lg:absolute lg:right-6 lg:top-2 lg:mt-0 lg:w-72">
                              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-studio-eyebrow">Phrase</p>
                              <p className="mt-2 font-serif text-xl leading-snug">{item.body}</p>
                              <p className="mt-3 text-sm leading-relaxed text-studio-body"><span className="mr-2 inline-block rounded-full bg-[#f6e4da] px-2.5 py-0.5 text-studio-coral-text">{circle.label}</span>for now. {circle.hint}</p>
                              {removingId === item.id ? (
                                <div className="flex flex-wrap gap-2">
                                  <p className="w-full text-sm">Remove this?</p>
                                  <button type="button" className={coralButton} disabled={busy} onClick={() => removeNote(item.id)}>Remove</button>
                                  <button type="button" className={quietButton} disabled={busy} onClick={() => setRemovingId(null)}>Keep</button>
                                </div>
                              ) : pendingMove ? (
                                <div className="grid gap-2">
                                  <p className="text-sm">Move to {circleById(pendingMove).label}?</p>
                                  <p className="text-sm text-studio-body">{circleById(pendingMove).hint}</p>
                                  <div className="flex flex-wrap gap-2">
                                    <button type="button" className={coralButton} disabled={busy} onClick={() => confirmMove(item)}>Move</button>
                                    <button type="button" className={quietButton} disabled={busy} onClick={() => setPendingMove(null)}>Cancel</button>
                                  </div>
                                </div>
                              ) : choosingMove ? (
                                <div className="flex flex-wrap gap-2">
                                  {circles.filter((choice) => choice.id !== item.circle).map((choice) => (
                                    <button key={choice.id} type="button" className={quietButton} disabled={busy} onClick={() => { setPendingMove(choice.id); setChoosingMove(false) }}>{choice.label}</button>
                                  ))}
                                  <button type="button" className={quietButton} disabled={busy} onClick={() => setChoosingMove(false)}>Cancel</button>
                                </div>
                              ) : pendingPartnerId && pendingPartnerId !== 'choose' ? (
                                <PartnerSentence item={item} partner={notes.find((note) => note.id === pendingPartnerId) ?? null} links={links} busy={busy} onKeep={keepLink} onLeave={() => setPendingPartnerId(null)} />
                              ) : pendingPartnerId === 'choose' ? (
                                <PartnerChoices item={item} notes={notes} links={links} onChoose={setPendingPartnerId} onCancel={() => setPendingPartnerId(null)} />
                              ) : (
                                <div className="mt-4 grid gap-2">
                                  <button type="button" className={detailAction} disabled={busy} onClick={() => { setEditingItemId(item.id); setItemDraft(item.body) }}><Pencil className="size-4" aria-hidden="true" />Edit</button>
                                  <button type="button" className={detailAction} disabled={busy} onClick={() => { setChoosingMove(true); setPendingPartnerId(null); setRemovingId(null) }}><ArrowLeftRight className="size-4" aria-hidden="true" />Move</button>
                                  <button type="button" className={detailAction} disabled={busy} onClick={() => setRemovingId(item.id)}><Trash2 className="size-4" aria-hidden="true" />Remove</button>
                                  <button type="button" className={detailAction} disabled={busy} onClick={() => { setPendingPartnerId('choose'); setChoosingMove(false) }}><Link2 className="size-4" aria-hidden="true" />Link</button>
                                  <button type="button" className={textAction} onClick={() => setSelectedId(null)}>Close</button>
                                </div>
                              )}
                            </div>
                          ) : null}
                          {proposals.filter((proposal) => (proposal.kind === 'shift' || proposal.kind === 'revision') && proposal.itemId === item.id).map((proposal) => (
                            <SuggestionCard key={proposal.id} proposal={proposal} busy={busy} actions={actionsRef.current} />
                          ))}
                        </>
                      )}
                    </li>
                  )
                })}
                {proposals.filter((proposal) => proposal.kind === 'phrase' && proposal.circle === circle.id).map((proposal) => (
                  <li key={proposal.id} className="max-w-full">
                    <SuggestionCard proposal={proposal} busy={busy} actions={actionsRef.current} />
                  </li>
                ))}
              </ul>
              {adding === circle.id ? (
                <form className="mt-4 max-w-xl" onSubmit={(event) => { event.preventDefault(); addNote(circle.id) }}>
                  <label htmlFor={`${starField}-add-${circle.id}`} className="sr-only">Add to {circle.label}</label>
                  <input id={`${starField}-add-${circle.id}`} value={drafts[circle.id]} maxLength={circleItemMaxLength} autoComplete="off" placeholder="A few words" onChange={(event) => setDrafts((current) => ({ ...current, [circle.id]: event.target.value }))} className={fieldClass} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="submit" className={coralButton} disabled={busy}>Add</button>
                    <button type="button" className={quietButton} disabled={busy} onClick={() => setAdding(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <button type="button" className={`${textAction} mt-3`} disabled={busy} onClick={() => setAdding(circle.id)}>Add</button>
              )}
              </div>
            </div>
          ))}
          <div className="px-4 pb-8 pt-4 sm:px-10 lg:px-12">
            <p className="text-sm text-studio-body">{relationshipVisitNote}</p>
            {heldSentences.length > 0 ? (
              <ul className="mt-3 grid gap-2">
                {heldSentences.map((sentence) => (
                  <li key={sentence} className="flex gap-3 text-sm leading-relaxed text-studio-body">
                    <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-studio-coral" />
                    <span>{sentence}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          </div>
        </div>
      </section>
      {heldExperiments.length > 0 || proposals.some((proposal) => proposal.kind === 'experiment') ? (
        <section aria-label="Possibilities to explore" className="px-4 pb-10 pt-2 sm:px-10 lg:px-12">
          <Eyebrow>Possibilities to explore</Eyebrow>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-studio-body">{experimentVisitNote}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {heldExperiments.map((experiment) => (
              <HeldInvitation key={experiment.id} experiment={experiment} />
            ))}
            {proposals.filter((proposal) => proposal.kind === 'experiment').map((proposal) => (
              <SuggestionCard key={proposal.id} proposal={proposal} busy={busy} actions={actionsRef.current} />
            ))}
          </div>
        </section>
      ) : null}
      </div>
    </div>
  )
}

function PartnerChoices({
  item,
  notes,
  links,
  onChoose,
  onCancel,
}: {
  item: CircleItem
  notes: CircleItem[]
  links: PhraseRelationship[]
  onChoose: (id: string) => void
  onCancel: () => void
}) {
  if (links.length >= 3) {
    return (
      <div className="grid gap-2">
        <p className="text-sm text-studio-body">{relationshipCapMessage}</p>
        <button type="button" className={quietButton} onClick={onCancel}>Close</button>
      </div>
    )
  }
  const partners = eligibleLinkPartners(item, notes, links)
  return (
    <div className="grid gap-2">
      {partners.length === 0 ? <p className="text-sm text-studio-body">A concern connects through an influence.</p> : (
        <div className="flex flex-wrap gap-2">
          {partners.map((partner) => (
            <button key={partner.id} type="button" className={quietButton} onClick={() => onChoose(partner.id)}>{partner.body}</button>
          ))}
        </div>
      )}
      <button type="button" className={quietButton} onClick={onCancel}>Cancel</button>
    </div>
  )
}

function PartnerSentence({
  item,
  partner,
  links,
  busy,
  onKeep,
  onLeave,
}: {
  item: CircleItem
  partner: CircleItem | null
  links: PhraseRelationship[]
  busy: boolean
  onKeep: (item: CircleItem, partner: CircleItem) => void
  onLeave: () => void
}) {
  if (!partner) return null
  const proposed = proposeRelationship(item, partner, links)
  const sentence = 'error' in proposed ? proposed.error : relationshipSentence(proposed.link, [item, partner])
  return (
    <div className="grid gap-2">
      <p className="text-sm leading-relaxed">{sentence}</p>
      {'error' in proposed ? null : (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={coralButton} disabled={busy} onClick={() => onKeep(item, partner)}>Keep</button>
          <button type="button" className={quietButton} disabled={busy} onClick={onLeave}>Leave</button>
        </div>
      )}
    </div>
  )
}
