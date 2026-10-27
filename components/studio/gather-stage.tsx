'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ChevronRight, Play, Sparkles } from 'lucide-react'
import { QuestionGarden } from '@/components/studio/question-garden'
import { addQuestion, correctOriginal, foldedQuestions, questionPlace } from '@/lib/questions/workspace'
import type { StageId, Workspace } from '@/lib/questions/types'
import { Eyebrow, inkButton, quietButton } from '@/components/studio/studio-ui'

const shelfDots = ['bg-studio-coral', 'bg-studio-violet', 'bg-studio-mint', 'bg-studio-grove']

export function GatherStage({ workspace, onChange, saveIssue }: { workspace: Workspace; onChange: (workspace: Workspace) => void; saveIssue: string | null }) {
  const [text, setText] = useState('')
  const submitted = useRef<{ id: string; text: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [correction, setCorrection] = useState('')
  const [error, setError] = useState<string | null>(null)
  const field = useRef<HTMLInputElement>(null)
  const questions = workspace.questions.filter((item) => !item.mergedIntoId)
  const branching = new Set(questions.filter((item) => foldedQuestions(workspace, item.id).length > 0).map((item) => item.id))
  const shelf = shelfPreview(questions)
  const invitation = nextInvitation(workspace)

  function add(value: string) {
    const original = value.trim()
    if (!original) return
    const next = addQuestion(workspace, original)
    if (next === workspace) {
      setError('Keep a question within 2000 characters.')
      return
    }
    setError(null)
    submitted.current = { id: next.questions[0]?.id ?? '', text: original }
    onChange(next)
    setText('')
    field.current?.focus()
  }

  useEffect(() => {
    const pending = submitted.current
    if (!pending) return
    if (workspace.questions.some((item) => item.id === pending.id)) {
      submitted.current = null
      return
    }
    if (!saveIssue) return
    setText(pending.text)
    submitted.current = null
  }, [saveIssue, workspace.questions])

  function open(stage: StageId) {
    onChange({ ...workspace, stage })
  }

  return (
    <div>
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-studio-date">
          <span className="size-2 rounded-full bg-studio-coral" />
          Field notes
        </div>
        <h2 className="max-w-xl font-serif text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">
          Follow the thread.
          <br />
          <em className="text-studio-coral">See what unfolds.</em>
        </h2>
      </header>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.62fr)]">
        <section className="flex flex-col rounded-[30px] border border-studio-line bg-studio-paper p-6 shadow-studio-card sm:p-8">
          <div className="order-1 mb-6">
            <Eyebrow>The question garden</Eyebrow>
            <p className="mt-2 max-w-xl text-sm text-studio-body">Seeds are newly captured questions. Shoots are questions retained for further attention. Branches are connections between questions. Blossoms are visual concepts grown from one or more questions, and they stay open in the library.</p>
          </div>
          <div className="order-3 xl:order-2">
            <QuestionGarden
              questions={questions}
              concepts={workspace.concepts}
              branching={branching}
              onFocus={(id) => document.getElementById(`question-${id}`)?.scrollIntoView({ block: 'nearest' })}
              onOpenConcept={(id) => {
                const concept = workspace.concepts.find((item) => item.id === id)
                if (!concept) return
                onChange({ ...workspace, stage: 'distil', focusConceptId: concept.id, focusQuestionId: concept.anchorQuestionId })
              }}
            />
          </div>
          <form
            className="order-2 mt-8 rounded-2xl bg-studio-ink p-5 sm:p-6 xl:order-3"
            onSubmit={(event) => {
              event.preventDefault()
              add(text)
            }}
          >
            <div className="mb-3 flex items-center gap-2 text-studio-note-on">
              <Sparkles size={14} />
              <span className="font-mono text-[10px] uppercase tracking-widest">Plant a new seed</span>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="gather-question" className="sr-only">Plant a new seed</label>
              <input
                ref={field}
                id="gather-question"
                value={text}
                onChange={(event) => {
                  setText(event.target.value)
                  if (error) setError(null)
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' || event.nativeEvent.isComposing || event.keyCode === 229) return
                  event.preventDefault()
                  add(text)
                }}
                autoFocus
                placeholder="I wonder why…"
                className="min-w-0 flex-1 bg-transparent py-2 text-lg text-studio-paper outline-none placeholder:text-studio-placeholder"
              />
              <button
                type="submit"
                disabled={!text.trim()}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-studio-coral px-3 py-2 text-sm font-semibold text-studio-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-paper disabled:opacity-40"
              >
                Plant <ArrowUpRight size={16} />
              </button>
            </div>
            <p className="mt-2 text-xs text-studio-note-on">Enter keeps the wording as you wrote it, then clears the field.</p>
            {error && <p role="alert" className="mt-3 text-sm text-studio-coral">{error}</p>}
          </form>
          {questions.length > 0 && (
            <ul className="order-4 mt-8 flex flex-col gap-4 border-t border-studio-line pt-6">
              {questions.map((item) => {
                const folded = foldedQuestions(workspace, item.id)
                return (
                  <li key={item.id} id={`question-${item.id}`}>
                    <Eyebrow>{questionPlace(workspace, item)}</Eyebrow>
                    {editingId === item.id ? (
                      <div className="mt-3 flex flex-col gap-3">
                        <textarea
                          value={correction}
                          onChange={(event) => setCorrection(event.target.value)}
                          aria-label="Correct the capture"
                          className="min-h-24 rounded-2xl border border-studio-line bg-studio-cream p-4 text-lg outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-studio-coral"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={inkButton}
                            onClick={() => {
                              const next = correctOriginal(workspace, item.id, correction)
                              if (next === workspace) {
                                setError('Keep a question within 2000 characters.')
                                return
                              }
                              setError(null)
                              onChange(next)
                              setEditingId(null)
                            }}
                          >
                            Save the correction
                          </button>
                          <button type="button" className={quietButton} onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-1 font-serif text-2xl leading-snug">{item.originalText}</p>
                        <button
                          type="button"
                          className="mt-2 text-sm text-studio-grove underline-offset-4 hover:underline"
                          onClick={() => { setEditingId(item.id); setCorrection(item.originalText) }}
                        >
                          Correct the capture
                        </button>
                      </>
                    )}
                    {folded.length > 0 && (
                      <ul className="mt-3 text-sm text-studio-body">
                        {folded.map((source) => <li key={source.id}>Merged wording kept: {source.originalText}</li>)}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        <div className="flex flex-col gap-5">
          <div className="rounded-[30px] bg-studio-mint p-6">
            <div className="mb-8 flex items-start justify-between">
              <div className="grid size-10 place-items-center rounded-xl bg-studio-cream text-studio-ink">
                <Play size={17} fill="currentColor" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-studio-grove">Next</span>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-studio-grove">{invitation.eyebrow}</p>
            <h3 className="mt-2 max-w-[16rem] font-serif text-3xl leading-tight">{invitation.title}</h3>
            <button
              type="button"
              onClick={() => invitation.stage ? open(invitation.stage) : field.current?.focus()}
              className="mt-8 flex items-center gap-2 text-sm font-semibold underline decoration-studio-grove underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-studio-ink"
            >
              {invitation.action} <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="rounded-[30px] border border-studio-line bg-studio-paper p-6">
            <h3 className="font-semibold">Curiosity shelf</h3>
            {shelf.length === 0 ? (
              <p className="mt-4 text-sm text-studio-body">{questions.length === 0 ? 'The shelf is clear. A question you plant will rest here.' : 'Discarded questions stay in Curate.'}</p>
            ) : (
              <ul className="mt-5 flex flex-col gap-3">
                {shelf.map((item, index) => (
                  <li key={item.id}>
                    <button type="button" onClick={() => document.getElementById(`question-${item.id}`)?.scrollIntoView({ block: 'nearest' })} className="flex w-full items-start gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral">
                      <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${shelfDots[index % shelfDots.length]}`} />
                      <span className="text-sm text-studio-body">{item.originalText}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={() => open('curate')} className="mt-5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-studio-coral focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral">
              View all <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
      <footer className="mt-8 flex flex-wrap items-center gap-3 text-[11px] text-studio-footer">
        <span className="font-mono uppercase tracking-widest">A gentle reminder</span>
        <span className="size-1 rounded-full bg-studio-coral" />
        <span>You don&apos;t have to know the answer to begin.</span>
      </footer>
    </div>
  )
}

function shelfPreview(questions: Workspace['questions']) {
  const visible = questions.filter((item) => item.disposition !== 'discarded')
  const retained = visible.filter((item) => item.disposition === 'retained')
  const others = visible.filter((item) => item.disposition !== 'retained')
  return [...retained, ...others].slice(0, 4)
}

function nextInvitation(workspace: Workspace): { eyebrow: string; title: string; action: string; stage: StageId | null } {
  const open = workspace.questions.filter((item) => !item.mergedIntoId)
  if (open.length === 0) {
    return { eyebrow: 'Begin here', title: 'Start with something you notice.', action: 'Plant a seed', stage: null }
  }
  if (open.some((item) => item.disposition === 'gathered')) {
    return { eyebrow: 'Curate', title: 'Tend what catches your attention.', action: 'Open Curate', stage: 'curate' }
  }
  if (open.some((item) => item.disposition === 'retained')) {
    return { eyebrow: 'Visualise', title: 'Make the invisible visible.', action: 'Open Visualise', stage: 'visualise' }
  }
  if (workspace.concepts.length > 0) {
    return { eyebrow: 'Library', title: 'Return to what is still unfolding.', action: 'Open the library', stage: 'library' }
  }
  return { eyebrow: 'Curate', title: 'Tend what catches your attention.', action: 'Open Curate', stage: 'curate' }
}
