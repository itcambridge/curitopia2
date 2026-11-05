'use client'

import { useEffect, useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLeaveConfirmation } from '@/components/studio/leave-guard'
import { studioPath } from '@/lib/paths'
import { createCuriosityChoice, curiosityGardenPath, curiositySwitchChoices } from '@/lib/questions/curiosity-switch'
import { listCuriosityNames } from '@/lib/questions/supabase-curiosities'

export function CuriositySwitcher({
  curiosityId,
  curiosityName,
  onBeforeLeave,
  compact = false,
}: {
  curiosityId: string
  curiosityName: string | null
  onBeforeLeave: () => void
  compact?: boolean
}) {
  const router = useRouter()
  const fieldId = useId()
  const confirmLeave = useLeaveConfirmation()
  const [names, setNames] = useState<{ id: string; name: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const choices = curiositySwitchChoices(names, curiosityId, curiosityName)

  useEffect(() => {
    let cancelled = false
    listCuriosityNames().then((next) => {
      if (!cancelled) setNames(next)
    }).catch(() => {
      if (!cancelled) setError('The other curiosities could not be loaded.')
    })
    return () => {
      cancelled = true
    }
  }, [curiosityId, curiosityName])

  function choose(value: string) {
    if (value === curiosityId) return
    if (!confirmLeave()) {
      setRevision((current) => current + 1)
      return
    }
    onBeforeLeave()
    if (value === createCuriosityChoice) {
      router.push(studioPath('/#new-curiosity'))
      return
    }
    router.push(studioPath(curiosityGardenPath(value)))
  }

  return (
    <div className={compact ? 'min-w-0 flex-1' : 'mb-4 min-w-0'}>
      <label htmlFor={fieldId} className={compact ? 'block text-xs font-semibold leading-none' : 'mb-2 block text-sm font-semibold'}>Current curiosity</label>
      <select
        id={fieldId}
        key={revision}
        value={curiosityId}
        onChange={(event) => choose(event.target.value)}
        className={`w-full max-w-full rounded-xl border border-studio-line bg-studio-cream px-3 text-sm font-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral ${compact ? 'mt-1 min-h-11 py-2' : 'py-2.5'}`}
      >
        {choices.map((item) => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
        <option value={createCuriosityChoice}>Create curiosity</option>
      </select>
      {error ? <p className="mt-2 text-xs text-studio-body">{error}</p> : null}
    </div>
  )
}
