'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { workspaceForAccount } from '@/lib/questions/account-workspace'
import { questionsEqual, syncQuestionChanges } from '@/lib/questions/question-sync'
import { browserWorkspaceRepository } from '@/lib/questions/store'
import { listQuestions } from '@/lib/questions/supabase-questions'
import { createClient } from '@/lib/supabase/client'
import type { Workspace } from '@/lib/questions/types'
import { emptyWorkspace } from '@/lib/questions/workspace'

export function useAccountWorkspace() {
  const router = useRouter()
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace())
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [storeError, setStoreError] = useState<string | null>(null)
  const current = useRef(workspace)
  const confirmed = useRef(workspace)
  const remoteReady = useRef(false)
  const chain = useRef(Promise.resolve())
  current.current = workspace

  function publish(next: Workspace) {
    current.current = next
    setWorkspace(next)
    try {
      browserWorkspaceRepository.persist(next)
    } catch {
      setStoreError('This browser could not keep a local copy. The account copy is unchanged by that failure.')
    }
  }

  function show(next: Workspace) {
    current.current = next
    setWorkspace(next)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      const local = browserWorkspaceRepository.load()
      try {
        const supabase = createClient()
        const [{ data }, questions] = await Promise.all([
          supabase.auth.getUser(),
          listQuestions(),
        ])
        if (cancelled) return
        const next = workspaceForAccount(local.workspace, questions)
        setEmail(data.user?.email ?? null)
        publish(next)
        remoteReady.current = true
        confirmed.current = next
        setStoreError(null)
      } catch (error) {
        if (cancelled) return
        const next = workspaceForAccount(local.workspace, [])
        show(next)
        confirmed.current = next
        remoteReady.current = false
        setStoreError(error instanceof Error ? error.message : 'The account questions could not be loaded. Nothing from this browser was copied into the account.')
      } finally {
        if (!cancelled) setReady(true)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  function write(next: Workspace | ((value: Workspace) => Workspace)) {
    const resolved = typeof next === 'function' ? next(current.current) : next
    current.current = resolved
    setWorkspace(resolved)
    chain.current = chain.current.then(async () => {
      const base = confirmed.current
      if (!questionsEqual(base.questions, resolved.questions)) {
        if (!remoteReady.current) {
          confirmed.current = base
          if (current.current === resolved) show(base)
          setStoreError('The account questions are not loaded, so this change was not saved.')
          return
        }
        try {
          await syncQuestionChanges(base.questions, resolved.questions)
          const questions = await listQuestions()
          const synced = workspaceForAccount(resolved, questions)
          confirmed.current = synced
          if (current.current === resolved) publish(synced)
          setStoreError(null)
        } catch (error) {
          confirmed.current = base
          if (current.current === resolved) publish(base)
          setStoreError(error instanceof Error ? error.message : 'The question could not be saved to the account.')
        }
        return
      }
      confirmed.current = current.current === resolved ? resolved : confirmed.current
      if (current.current === resolved) publish(resolved)
    }).catch((error: unknown) => {
      if (current.current === resolved) show(confirmed.current)
      setStoreError(error instanceof Error ? error.message : 'The question could not be saved to the account.')
    })
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  return { workspace, ready, email, storeError, write, signOut }
}
