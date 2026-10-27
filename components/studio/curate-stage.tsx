'use client'

import { useState } from 'react'
import { correctOriginal, duplicateGroups, foldedQuestions, mergeQuestions, questionPlace, restoreQuestion, reviewQuestions, setDisposition } from '@/lib/questions/workspace'
import type { QuestionRecord, Workspace } from '@/lib/questions/types'
import { Eyebrow, Notice, coralButton, panelClass, quietButton } from '@/components/studio/studio-ui'

export function CurateStage({ workspace, onChange }: { workspace: Workspace; onChange: (workspace: Workspace) => void }) {
  const groups = duplicateGroups(workspace)
  const byId = new Map(workspace.questions.map((item) => [item.id, item]))
  const grouped = new Set(groups.flat())
  const waiting = reviewQuestions(workspace).filter((item) => item.disposition === 'gathered' && !grouped.has(item.id))
  const retained = reviewQuestions(workspace).filter((item) => item.disposition === 'retained' && !grouped.has(item.id))
  const parked = workspace.questions.filter((item) => !item.mergedIntoId && item.disposition === 'parked' && !grouped.has(item.id))
  const discarded = workspace.questions.filter((item) => !item.mergedIntoId && item.disposition === 'discarded')

  return (
    <div className="flex flex-col gap-8">
      <header>
        <Eyebrow>2 · Curate</Eyebrow>
        <h2 className="mt-2 font-serif text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">Keep what is worth carrying.</h2>
        <p className="mt-3 max-w-2xl text-sm text-studio-body">{waiting.length} gathered, {retained.length} retained, {parked.length} parked, {discarded.length} discarded. Parking and discarding leave the wording here. Nothing is removed by a suggestion.</p>
      </header>
      {groups.length > 0 && (
        <section className="flex flex-col gap-4">
          <Notice>Similar wording. This match is text in the browser. No model read the list.</Notice>
          {groups.map((group) => (
            <div key={group.join('-')} className={panelClass}>
              <Eyebrow>Possible duplicates</Eyebrow>
              <ul className="mt-4 flex flex-col gap-4">
                {group.map((id) => {
                  const item = byId.get(id)
                  if (!item) return null
                  return <QuestionRow key={id} fieldId={`group-${id}`} item={item} workspace={workspace} onChange={onChange} />
                })}
              </ul>
            </div>
          ))}
        </section>
      )}
      <QuestionSection title="Gathered" empty="Nothing is waiting. Gather more, or restore a question you parked." items={waiting} workspace={workspace} onChange={onChange} />
      <QuestionSection title="Retained for exploration" empty="No question is retained yet. Keep one when you want it available for an image." items={retained} workspace={workspace} onChange={onChange} />
      <QuestionSection title="Parked" empty="No parked questions." items={parked} workspace={workspace} onChange={onChange} />
      <QuestionSection title="Discarded" empty="No discarded questions." items={discarded} workspace={workspace} onChange={onChange} />
    </div>
  )
}

function QuestionSection({
  title,
  empty,
  items,
  workspace,
  onChange,
}: {
  title: string
  empty: string
  items: QuestionRecord[]
  workspace: Workspace
  onChange: (workspace: Workspace) => void
}) {
  return (
    <section>
      <h3 className="mb-3 font-serif text-2xl">{title}</h3>
      {items.length === 0 ? <p className="text-sm text-studio-body">{empty}</p> : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className={panelClass}>
              <QuestionRow key={item.id} fieldId={item.id} item={item} workspace={workspace} onChange={onChange} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function QuestionRow({ fieldId, item, workspace, onChange }: { fieldId: string; item: QuestionRecord; workspace: Workspace; onChange: (workspace: Workspace) => void }) {
  const [target, setTarget] = useState('')
  const [editing, setEditing] = useState(false)
  const [correction, setCorrection] = useState(item.originalText)
  const others = reviewQuestions(workspace).filter((candidate) => candidate.id !== item.id)
  const folded = foldedQuestions(workspace, item.id)
  const parked = item.disposition === 'parked'
  const discarded = item.disposition === 'discarded'

  return (
    <div>
      <Eyebrow>{questionPlace(workspace, item)}</Eyebrow>
      {editing ? (
        <div className="mt-3 flex flex-col gap-3">
          <textarea
            value={correction}
            onChange={(event) => setCorrection(event.target.value)}
            aria-label="Correct the capture"
            className="min-h-24 rounded-2xl border border-studio-line bg-studio-cream p-4 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-studio-coral"
          />
          <div className="flex gap-2">
            <button type="button" className={coralButton} onClick={() => {
              const next = correction.trim()
              if (!next || next.length > 2000) return
              onChange(correctOriginal(workspace, item.id, next))
              setEditing(false)
            }}>Save the correction</button>
            <button type="button" className={quietButton} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : <p className="mt-2 font-serif text-2xl leading-snug">{item.originalText}</p>}
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
      <div className="mt-4 flex flex-wrap gap-2">
        {!editing && <button type="button" className={quietButton} onClick={() => { setCorrection(item.originalText); setEditing(true) }}>Correct the capture</button>}
        {item.disposition !== 'retained' && !discarded && (
          <button type="button" className={coralButton} onClick={() => onChange(setDisposition(workspace, item.id, 'retained'))}>Keep</button>
        )}
        {!parked && !discarded && (
          <button type="button" className={quietButton} onClick={() => onChange(setDisposition(workspace, item.id, 'parked'))}>Park</button>
        )}
        {!discarded && (
          <button type="button" className={quietButton} onClick={() => onChange(setDisposition(workspace, item.id, 'discarded'))}>Discard</button>
        )}
        {(parked || discarded) && (
          <button type="button" className={coralButton} onClick={() => onChange(restoreQuestion(workspace, item.id))}>Restore</button>
        )}
      </div>
      {!discarded && others.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="text-sm text-studio-body" htmlFor={`merge-${fieldId}`}>Merge this wording into</label>
          <select
            id={`merge-${fieldId}`}
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className="rounded-xl border border-studio-line bg-studio-cream px-3 py-2 text-sm"
          >
            <option value="">Choose a question</option>
            {others.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.originalText}</option>)}
          </select>
          <button type="button" className={quietButton} disabled={!target} onClick={() => onChange(mergeQuestions(workspace, item.id, target))}>Merge</button>
        </div>
      )}
    </div>
  )
}
