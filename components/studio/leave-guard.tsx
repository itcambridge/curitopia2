'use client'

import { createContext, useCallback, useContext, useEffect, useId, useState, type ReactNode } from 'react'

type GuardValue = {
  dirty: boolean
  setFlag: (id: string, dirty: boolean) => void
}

const LeaveGuardContext = createContext<GuardValue | null>(null)

export function LeaveGuard({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const setFlag = useCallback((id: string, dirty: boolean) => {
    setFlags((current) => {
      if (Boolean(current[id]) === dirty) return current
      const next = { ...current }
      if (dirty) next[id] = true
      else delete next[id]
      return next
    })
  }, [])
  const dirty = Object.values(flags).some(Boolean)
  return <LeaveGuardContext.Provider value={{ dirty, setFlag }}>{children}</LeaveGuardContext.Provider>
}

export function useScreenDraft(dirty: boolean) {
  const guard = useContext(LeaveGuardContext)
  const id = useId()
  const setFlag = guard?.setFlag
  useEffect(() => {
    if (!setFlag) return
    setFlag(id, dirty)
    return () => setFlag(id, false)
  }, [setFlag, id, dirty])
}

export function useLeaveConfirmation() {
  const guard = useContext(LeaveGuardContext)
  return () => {
    if (!guard?.dirty) return true
    return window.confirm('Switch curiosity? Text you have not saved on this screen will be left behind. Questions and image drafts already kept for this curiosity stay with it.')
  }
}
