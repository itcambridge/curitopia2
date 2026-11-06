'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ChevronRight, Play, Sparkles } from 'lucide-react'
import { QuestionGarden } from '@/components/studio/question-garden'
import { useScreenDraft } from '@/components/studio/leave-guard'
import { addQuestion, branchPartners, correctOriginal, foldedQuestions, linkQuestions, openVisualise, plantedQuestion, questionPlace, removeBranch, restoreQuestion, reviewQuestions, setDisposition, visualiseQuestions, visualiseTarget } from '@/lib/questions/workspace'
import type { ConceptRecord, QuestionRecord, StageId, Workspace } from '@/lib/questions/types'
import { StageMark } from '@/components/studio/stage-mark'
import { Eyebrow, inkButton, questionListClass, questionListItemClass, quietButton } from '@/components/studio/studio-ui'

const shelfDots = ['bg-studio-coral', 'bg-studio-violet', 'bg-studio-mint', 'bg-studio-grove']

export function GatherStage({ workspace, onChange, saveIssue, branchNotice = null, onOpenConcept }: { workspace: Workspace; onChange: (workspace: Workspace) => void; saveIssue: string | null; branchNotice?: string | null; onOpenConcept: (concept: ConceptRecord) => void }) {
  const [text, setText] = useState('')
  const submitted = useRef<{ id: string; text: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [correction, setCorrection] = useState('')
  const [error, setError] = useState<string | null>(null)
  const field = useRef<HTMLInputElement>(null)
  const questions = workspace.questions.filter((item) => !item.mergedIntoId)
  const activeQuestions = questions.filter((item) => item.disposition !== 'discarded')
  const discardedQuestions = questions.filter((item) => item.disposition === 'discarded')
  const visualisable = new Set(visualiseQuestions(workspace).map((item) => item.id))
  const linked = new Set(workspace.branches.flatMap((branch) => [branch.questionLowId, branch.questionHighId]))
  const shelf = shelfPreview(questions)
  const invitation = nextInvitation(workspace)
  const editing = questions.find((item) => item.id === editingId)
  useScreenDraft(text.trim() !== '' || Boolean(editing && correction.trim() !== editing.originalText.trim()))

  function add(value: string) {
    const original = plantedQuestion(value)
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

  function visualise(questionId: string) {
    const next = openVisualise(workspace, questionId)
    if (next !== workspace) onChange(next)
  }

  return (
    <div className="min-w-0">
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
        <StageMark stage="gather" placement="content" />
      </header>
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.62fr)]">
        <section className="flex min-w-0 flex-col rounded-[30px] border border-studio-line bg-studio-paper p-6 shadow-studio-card sm:p-8">
          <div className="order-1 mb-6">
            <Eyebrow>The question garden</Eyebrow>
          </div>
          <div className="order-3 xl:order-2">
            <QuestionGarden
              questions={activeQuestions}
              concepts={workspace.concepts}
              links={workspace.branches}
              linked={linked}
              onFocus={(id) => revealQuestion(id)}
              onOpenConcept={(id) => {
                const concept = workspace.concepts.find((item) => item.id === id)
                if (concept) onOpenConcept(concept)
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
            {error && <p role="alert" className="mt-3 text-sm text-studio-coral">{error}</p>}
          </form>
          {activeQuestions.length > 0 && (
            <ul id="captured-questions" aria-label="Captured questions" className={`order-4 mt-8 border-t border-studio-line pt-6 ${questionListClass}`}>
              {activeQuestions.map((item) => (
                <QuestionCard key={item.id} item={item} workspace={workspace} onChange={onChange} branchNotice={branchNotice} editingId={editingId} setEditingId={setEditingId} setCorrection={setCorrection} correction={correction} visualisable={visualisable} onVisualise={visualise} setError={setError} />
              ))}
            </ul>
          )}
          {discardedQuestions.length > 0 && (
            <details className="order-4 mt-6">
              <summary className="cursor-pointer text-sm font-semibold">Set aside ({discardedQuestions.length})</summary>
              <ul aria-label="Discarded questions" className={`mt-4 ${questionListClass}`}>
                {discardedQuestions.map((item) => (
                  <QuestionCard key={item.id} item={item} workspace={workspace} onChange={onChange} branchNotice={branchNotice} editingId={editingId} setEditingId={setEditingId} setCorrection={setCorrection} correction={correction} visualisable={visualisable} onVisualise={visualise} setError={setError} />
                ))}
              </ul>
            </details>
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
              onClick={() => {
                if (invitation.questionId) {
                  visualise(invitation.questionId)
                  return
                }
                if (invitation.stage) open(invitation.stage)
                else field.current?.focus()
              }}
              className="mt-8 flex items-center gap-2 text-sm font-semibold underline decoration-studio-grove underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-studio-ink"
            >
              {invitation.action} <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="rounded-[30px] border border-studio-line bg-studio-paper p-6">
            <h3 className="font-semibold">Curiosity shelf</h3>
            {shelf.length === 0 ? (
              <p className="mt-4 text-sm text-studio-body">{questions.length === 0 ? 'The shelf is clear. A question you plant will rest here.' : 'Questions you set aside stay in the garden.'}</p>
            ) : (
              <ul className="mt-5 flex flex-col gap-3">
                {shelf.map((item, index) => (
                  <li key={item.id}>
                    <button type="button" onClick={() => revealQuestion(item.id)} className="flex w-full items-start gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral">
                      <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${shelfDots[index % shelfDots.length]}`} />
                      <span className="text-sm text-studio-body">{item.originalText}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={() => document.getElementById('captured-questions')?.scrollIntoView({ block: 'nearest' })} className="mt-5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-studio-coral focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral">
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

function revealQuestion(id: string) {
  document.getElementById(`question-${id}`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

function QuestionCard({
  item,
  workspace,
  onChange,
  branchNotice,
  editingId,
  setEditingId,
  correction,
  setCorrection,
  visualisable,
  onVisualise,
  setError,
}: {
  item: QuestionRecord
  workspace: Workspace
  onChange: (workspace: Workspace) => void
  branchNotice: string | null
  editingId: string | null
  setEditingId: (id: string | null) => void
  correction: string
  setCorrection: (value: string) => void
  visualisable: Set<string>
  onVisualise: (id: string) => void
  setError: (value: string | null) => void
}) {
  const [target, setTarget] = useState('')
  const partners = branchPartners(workspace, item.id)
  const partnerIds = new Set(partners.map((partner) => partner.id))
  const others = reviewQuestions(workspace).filter((candidate) => candidate.id !== item.id && !partnerIds.has(candidate.id))
  const folded = foldedQuestions(workspace, item.id)
  const parked = item.disposition === 'parked'
  const discarded = item.disposition === 'discarded'
  const editing = editingId === item.id
  useScreenDraft(target !== '' || (editing && correction.trim() !== item.originalText.trim()))

  return (
    <li id={`question-${item.id}`} className={questionListItemClass}>
      <Eyebrow>{questionPlace(workspace, item)}</Eyebrow>
      {editing ? (
        <div className="mt-3 flex flex-col gap-3">
          <textarea
            value={correction}
            onChange={(event) => setCorrection(event.target.value)}
            aria-label="Correct the capture"
            className="min-h-24 w-full min-w-0 rounded-2xl border border-studio-line bg-studio-cream p-4 text-lg outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-studio-coral"
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
          <p className="mt-1 break-words font-serif text-2xl leading-snug">{item.originalText}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {visualisable.has(item.id) && (
              <button type="button" className={quietButton} aria-label={`Visualise: ${item.originalText}`} onClick={() => onVisualise(item.id)}>Visualise</button>
            )}
            {(parked || discarded) && (
              <button type="button" className={quietButton} onClick={() => onChange(restoreQuestion(workspace, item.id))}>Restore</button>
            )}
            <button type="button" className="text-sm text-studio-grove underline-offset-4 hover:underline" onClick={() => { setEditingId(item.id); setCorrection(item.originalText) }}>
              Correct the capture
            </button>
          </div>
        </>
      )}
      {folded.length > 0 && (
        <ul className="mt-3 text-sm text-studio-body">
          {folded.map((source) => (
            <li key={source.id} className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span>Merged wording kept: {source.originalText}</span>
              <button type="button" className={quietButton} onClick={() => onChange(restoreQuestion(workspace, source.id))}>Restore as its own question</button>
            </li>
          ))}
        </ul>
      )}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold">Manage this question</summary>
        <div className="mt-3 flex flex-col gap-3">
          {branchNotice ? <p role="status" className="text-sm leading-relaxed text-studio-body">{branchNotice}</p> : null}
          <div className="flex flex-wrap gap-2">
            {!parked && !discarded && <button type="button" className={quietButton} onClick={() => onChange(setDisposition(workspace, item.id, 'parked'))}>Park</button>}
            {!discarded && <button type="button" className={quietButton} onClick={() => onChange(setDisposition(workspace, item.id, 'discarded'))}>Discard</button>}
          </div>
          {partners.length > 0 && (
            <ul className="text-sm text-studio-body">
              {workspace.branches.filter((branch) => branch.questionLowId === item.id || branch.questionHighId === item.id).map((branch) => {
                const partner = partners.find((candidate) => candidate.id === (branch.questionLowId === item.id ? branch.questionHighId : branch.questionLowId))
                if (!partner) return null
                return (
                  <li key={branch.id} className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span>Branched with {partner.originalText}</span>
                    <button type="button" className={quietButton} onClick={() => onChange(removeBranch(workspace, branch.id))}>Remove branch</button>
                  </li>
                )
              })}
            </ul>
          )}
          {!discarded && others.length > 0 && (
            <div className="flex min-w-0 flex-col gap-2">
              <label className="text-sm text-studio-body" htmlFor={`link-${item.id}`}>Branch with another question</label>
              <select id={`link-${item.id}`} value={target} onChange={(event) => setTarget(event.target.value)} className="w-full rounded-xl border border-studio-line bg-studio-cream px-3 py-2 text-sm">
                <option value="">Choose a question</option>
                {others.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.originalText}</option>)}
              </select>
              <button type="button" className={`${quietButton} w-fit`} disabled={!target} onClick={() => { onChange(linkQuestions(workspace, item.id, target)); setTarget('') }}>Create a branch</button>
            </div>
          )}
        </div>
      </details>
    </li>
  )
}

function shelfPreview(questions: Workspace['questions']) {
  const visible = questions.filter((item) => item.disposition !== 'discarded')
  const retained = visible.filter((item) => item.disposition === 'retained')
  const others = visible.filter((item) => item.disposition !== 'retained')
  return [...retained, ...others].slice(0, 4)
}

function nextInvitation(workspace: Workspace): { eyebrow: string; title: string; action: string; questionId: string | null; stage: StageId | null } {
  const target = visualiseTarget(workspace)
  if (target) {
    return { eyebrow: 'Visualise', title: 'What might this question look like?', action: 'Visualise', questionId: target.id, stage: 'visualise' }
  }
  if (workspace.concepts.length > 0) {
    return { eyebrow: 'Library', title: 'Return to what is still unfolding.', action: 'Open the library', questionId: null, stage: 'library' }
  }
  return { eyebrow: 'Begin here', title: 'Start with something you notice.', action: 'Plant a seed', questionId: null, stage: null }
}
