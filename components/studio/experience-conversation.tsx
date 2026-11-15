'use client'

import { useId, useState } from 'react'
import { coralButton, Eyebrow } from '@/components/studio/studio-ui'
import { SuggestionCard } from '@/components/studio/experience-suggestions'
import { withBasePath } from '@/lib/paths'
import type { LandscapeProposal, ProposalActions } from '@/lib/questions/experience-proposals'
import {
  conversationVisitNote,
  facilitationMessageLimit,
  readingFromUnknown,
  threadTurnContent,
  turnsForRequest,
  type FacilitationReading,
  type FacilitationTurn,
} from '@/lib/questions/experience-facilitator'

type Exchange = {
  id: string
  user: string
  reading: FacilitationReading
}

const fieldClass = 'w-full rounded-2xl border border-studio-line bg-studio-cream px-4 py-3 text-base leading-relaxed outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-studio-coral'

function Reading({ reading }: { reading: FacilitationReading }) {
  return (
    <div className="grid gap-4">
      <p className="font-serif text-lg leading-relaxed">{reading.say}</p>
      {reading.interpretation ? (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-studio-eyebrow">A reading</p>
          <p className="mt-2 text-sm leading-relaxed text-studio-body">{reading.interpretation}</p>
        </div>
      ) : null}
      {reading.forces.length > 0 ? (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-studio-eyebrow">Forces</p>
          <ul className="mt-2 grid gap-2">
            {reading.forces.map((force) => (
              <li key={`${force.name}-${force.why}`} className="rounded-2xl bg-[#fffaf3] px-3 py-2 shadow-[0_8px_18px_rgb(90_70_45/0.08)]">
                <p className="font-serif text-base leading-snug">{force.name}</p>
                <p className="mt-1 text-sm leading-relaxed text-studio-body">{force.why}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {reading.interaction ? <p className="text-sm leading-relaxed text-studio-body">{reading.interaction}</p> : null}
      {reading.followUp ? <p className="font-serif text-base italic leading-relaxed">{reading.followUp}</p> : null}
    </div>
  )
}

export function ExperienceConversation({
  curiosityId,
  experienceId,
  proposals,
  actions,
  onReading,
}: {
  curiosityId: string
  experienceId: string
  proposals: LandscapeProposal[]
  actions: ProposalActions | null
  onReading: (reading: FacilitationReading) => void
}) {
  const fieldId = useId()
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const earlier = exchanges.slice(0, -1)
  const latest = exchanges[exchanges.length - 1] ?? null

  async function send() {
    const message = draft.trim()
    if (!message || thinking) return
    setThinking(true)
    setError(null)
    const prior: FacilitationTurn[] = exchanges.flatMap((exchange) => [
      { role: 'user' as const, content: exchange.user },
      { role: 'assistant' as const, content: threadTurnContent(exchange.reading) },
    ])
    try {
      const response = await fetch(withBasePath('/api/experience'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          curiosityId,
          experienceId,
          message,
          turns: turnsForRequest(prior),
          selectedQuestionIds: [],
          selectedConceptIds: [],
          includeBackground: false,
        }),
      })
      let payload: { reading?: unknown; error?: string } = {}
      try {
        payload = await response.json() as { reading?: unknown; error?: string }
      } catch {
        payload = {}
      }
      const reading = readingFromUnknown(payload.reading)
      if (!response.ok || !reading) {
        setError(payload.error || 'The conversation could not continue. Your landscape is unchanged.')
        return
      }
      onReading(reading)
      setExchanges((current) => [...current, { id: crypto.randomUUID(), user: message, reading }])
      setDraft('')
    } catch {
      setError('The conversation could not continue. Your landscape is unchanged.')
    } finally {
      setThinking(false)
    }
  }

  return (
    <section aria-labelledby={`${fieldId}-title`} className="min-w-0 lg:sticky lg:top-6">
      <div className="rounded-[1.6rem] bg-[#fffaf3]/90 p-4 shadow-[0_16px_36px_rgb(90_70_45/0.08)] sm:p-5">
        <Eyebrow>Conversation</Eyebrow>
        <h3 id={`${fieldId}-title`} className="mt-2 font-serif text-2xl leading-tight">What is happening</h3>
        <p className="mt-2 text-sm leading-relaxed text-studio-body">{conversationVisitNote} The North Star and phrases stay.</p>
        {exchanges.length === 0 ? (
          <p className="mt-5 font-serif text-lg leading-relaxed">Describe the situation in your own words. There is no set of questions to get through.</p>
        ) : (
          <div className="mt-5 grid gap-5">
            {earlier.length > 0 ? (
              <details className="group">
                <summary className="cursor-pointer list-none text-sm font-semibold underline decoration-studio-line underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral [&::-webkit-details-marker]:hidden">
                  Earlier in this sitting
                </summary>
                <div className="mt-4 grid max-h-72 gap-5 overflow-y-auto pr-1">
                  {earlier.map((exchange) => (
                    <article key={exchange.id} className="grid gap-3 border-t border-studio-line pt-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-studio-eyebrow">You</p>
                      <p className="font-serif text-base leading-relaxed">{exchange.user}</p>
                      <Reading reading={exchange.reading} />
                    </article>
                  ))}
                </div>
              </details>
            ) : null}
            {latest ? (
              <article className="grid gap-3" aria-live="polite">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-studio-eyebrow">You</p>
                <p className="font-serif text-base leading-relaxed">{latest.user}</p>
                <Reading reading={latest.reading} />
              </article>
            ) : null}
          </div>
        )}
        {proposals.length > 0 ? (
          <div className="mt-5 grid gap-3">
            {proposals.map((proposal) => (
              <SuggestionCard key={proposal.id} proposal={proposal} busy={thinking} actions={actions} />
            ))}
          </div>
        ) : null}
        <form className="mt-5" onSubmit={(event) => { event.preventDefault(); void send() }}>
          <label htmlFor={fieldId} className="sr-only">Your message</label>
          <textarea
            id={fieldId}
            value={draft}
            maxLength={facilitationMessageLimit}
            rows={4}
            autoComplete="off"
            disabled={thinking}
            placeholder="Say it in the words you would use with someone you trust"
            onChange={(event) => setDraft(event.target.value)}
            className={`${fieldClass} min-h-28`}
          />
          {thinking ? <p className="mt-3 text-sm text-studio-body" aria-live="polite">Thinking this through…</p> : null}
          {error ? <p role="alert" className="mt-3 text-sm">{error}</p> : null}
          <button type="submit" className={`${coralButton} mt-3 min-h-11`} disabled={thinking || !draft.trim()}>Send</button>
        </form>
      </div>
    </section>
  )
}
