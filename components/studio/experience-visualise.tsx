'use client'

import { useEffect, useRef, useState } from 'react'
import { ExperienceTopicVisualisation, type ExperienceVisualTopic } from '@/components/studio/visualise-stage'
import { withBasePath } from '@/lib/paths'
import { circleName } from '@/lib/questions/experience-content'
import { conceptOriginLabel } from '@/lib/questions/visualisation-source'
import { shouldReleaseVisualisationSource } from '@/lib/questions/visualisation-lifecycle'
import type { ConceptRecord } from '@/lib/questions/types'

type OpenedSnapshot = {
  token: string
  originalText: string
  circle: ExperienceVisualTopic['circle']
}

function discardSnapshot(token: string) {
  void fetch(withBasePath('/api/visualise/source'), {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token }),
  }).catch(() => {
    // A failed release leaves the row until the seven-day cleanup.
  })
}

export function ExperienceVisualise({
  topic,
  onClose,
  onSaved,
}: {
  topic: Omit<ExperienceVisualTopic, 'snapshotToken'>
  onClose: () => void
  onSaved: (concept: ConceptRecord) => Promise<void>
}) {
  const [opened, setOpened] = useState<OpenedSnapshot | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const tokenRef = useRef('')
  const savingRef = useRef(false)
  const releasedRef = useRef(false)
  const frozen = opened ? {
    ...topic,
    originalText: opened.originalText,
    circle: opened.circle,
    snapshotToken: opened.token,
  } : null

  useEffect(() => {
    let cancelled = false
    releasedRef.current = false
    setOpened(null)
    setProblem(null)
    void fetch(withBasePath('/api/visualise/source'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        curiosityId: topic.curiosityId,
        experienceId: topic.experienceId,
        itemId: topic.itemId,
      }),
    }).then(async (response) => {
      const body = await response.json() as { token?: unknown; originalText?: unknown; circle?: unknown; error?: unknown }
      const circle = typeof body.circle === 'string' ? circleName(body.circle) : null
      const originalText = typeof body.originalText === 'string' ? body.originalText.trim() : ''
      const token = typeof body.token === 'string' ? body.token : ''
      if (cancelled) {
        if (token) discardSnapshot(token)
        return
      }
      if (!response.ok || !token || !circle || !originalText) {
        setProblem(typeof body.error === 'string' ? body.error : 'This topic could not be opened for visualisation.')
        return
      }
      tokenRef.current = token
      setOpened({ token, originalText, circle })
    }).catch(() => {
      if (!cancelled) setProblem('This topic could not be opened for visualisation.')
    })
    return () => {
      cancelled = true
      const token = tokenRef.current
      tokenRef.current = ''
      if (!shouldReleaseVisualisationSource({ saving: savingRef.current, alreadyReleased: releasedRef.current })) return
      releasedRef.current = true
      if (token) discardSnapshot(token)
    }
  }, [topic.curiosityId, topic.experienceId, topic.itemId])

  function noteSaving(active: boolean) {
    savingRef.current = active
    setSaving(active)
  }

  function closeIfIdle() {
    if (!shouldReleaseVisualisationSource({ saving: savingRef.current, alreadyReleased: false })) return
    const token = tokenRef.current
    tokenRef.current = ''
    releasedRef.current = true
    if (token) discardSnapshot(token)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[#f4efe6]/95 px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-studio-eyebrow">{frozen ? conceptOriginLabel(frozen.circle) : 'Experience'}</p>
            <h2 className="mt-2 font-serif text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">Give this topic a visual form.</h2>
            {frozen ? <p className="mt-4 max-w-2xl font-serif text-2xl leading-snug">{frozen.originalText}</p> : <p className="mt-4 text-sm text-studio-muted">Opening this topic…</p>}
          </div>
          <button type="button" className="min-h-11 text-sm font-semibold text-studio-ink underline decoration-studio-line underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral disabled:cursor-not-allowed disabled:opacity-50" disabled={saving} onClick={closeIfIdle}>Back to this topic</button>
        </div>
        {problem ? <p role="alert" className="rounded-2xl bg-studio-coral/20 px-4 py-3 text-sm">{problem}</p> : null}
        {frozen ? <ExperienceTopicVisualisation topic={frozen} onClose={closeIfIdle} onSaved={onSaved} onSavingChange={noteSaving} /> : null}
      </div>
    </div>
  )
}
