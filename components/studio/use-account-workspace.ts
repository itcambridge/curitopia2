'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { workspaceForAccount } from '@/lib/questions/account-workspace'
import { conceptsEqual, listConcepts, syncConceptChanges } from '@/lib/questions/supabase-concepts'
import { questionsEqual, syncQuestionChanges } from '@/lib/questions/question-sync'
import { browserWorkspaceRepository } from '@/lib/questions/store'
import { listQuestions } from '@/lib/questions/supabase-questions'
import { createClient } from '@/lib/supabase/client'
import type { ConceptRecord, QuestionRecord, Workspace } from '@/lib/questions/types'
import { emptyWorkspace } from '@/lib/questions/workspace'

export function useAccountWorkspace() {
  const router = useRouter()
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace())
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [storeError, setStoreError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedConceptId, setSavedConceptId] = useState<string | null>(null)
  const [conceptsLoaded, setConceptsLoaded] = useState(false)
  const current = useRef(workspace)
  const confirmed = useRef(workspace)
  const remoteReady = useRef(false)
  const accountId = useRef<string | null>(null)
  const keptLocalConcepts = useRef<ConceptRecord[]>([])
  const chain = useRef(Promise.resolve())
  current.current = workspace

  function publish(next: Workspace) {
    current.current = next
    setWorkspace(next)
    try {
      browserWorkspaceRepository.persist({ ...next, concepts: keptLocalConcepts.current })
    } catch {
      setStoreError('This browser could not keep a local copy. The account copy is unchanged by that failure.')
    }
  }

  function show(next: Workspace) {
    current.current = next
    setWorkspace(next)
  }

  function applyAccount(local: Workspace, questions: QuestionRecord[], concepts: ConceptRecord[]) {
    return workspaceForAccount(local, questions, concepts)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      const local = browserWorkspaceRepository.load()
      keptLocalConcepts.current = local.workspace.concepts
      try {
        const supabase = createClient()
        const { data, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        const userId = data.user?.id ?? null
        if (cancelled) return
        if (accountId.current && userId && accountId.current !== userId) {
          confirmed.current = emptyWorkspace()
          show(emptyWorkspace())
        }
        accountId.current = userId
        const questions = await listQuestions()
        if (cancelled) return
        let concepts: ConceptRecord[] = []
        let libraryError: string | null = null
        try {
          concepts = await listConcepts()
        } catch (error) {
          libraryError = error instanceof Error ? error.message : 'The library could not be loaded.'
        }
        if (cancelled) return
        const next = applyAccount(local.workspace, questions, concepts)
        setEmail(data.user?.email ?? null)
        publish(next)
        remoteReady.current = true
        confirmed.current = next
        setConceptsLoaded(!libraryError)
        setStoreError(libraryError)
      } catch (error) {
        if (cancelled) return
        const next = applyAccount(local.workspace, [], [])
        show(next)
        confirmed.current = next
        remoteReady.current = false
        setConceptsLoaded(false)
        setStoreError(error instanceof Error ? error.message : 'The account could not be loaded. Nothing from this browser was copied into the account.')
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
    const pendingConceptSave = !conceptsEqual(current.current.concepts, resolved.concepts)
    current.current = resolved
    setWorkspace(resolved)
    if (pendingConceptSave) setSaving(true)
    const job = chain.current.then(async () => {
      const base = confirmed.current
      const draftsBeforeSave = base.drafts
      const questionsChanged = !questionsEqual(base.questions, resolved.questions)
      const conceptsChanged = !conceptsEqual(base.concepts, resolved.concepts)
      const openingLibrary = resolved.stage === 'library' && base.stage !== 'library'
      if (!remoteReady.current && (questionsChanged || conceptsChanged)) {
        confirmed.current = base
        if (current.current === resolved) show(base)
        setStoreError('The account is not loaded, so this change was not saved.')
        return
      }
      try {
        let questions = base.questions
        if (questionsChanged) {
          await syncQuestionChanges(base.questions, resolved.questions)
          questions = await listQuestions()
          confirmed.current = { ...confirmed.current, questions }
        }
        if (conceptsChanged) {
          await syncConceptChanges(base.concepts, resolved.concepts, questions)
        }
        const refreshedConcepts = conceptsChanged || openingLibrary
        const concepts = refreshedConcepts ? await listConcepts() : resolved.concepts
        const synced = applyAccount({ ...resolved, questions, concepts }, questions, concepts)
        confirmed.current = synced
        if (current.current === resolved) publish(synced)
        if (refreshedConcepts) setConceptsLoaded(true)
        setStoreError(null)
        if (conceptsChanged) {
          const saved = resolved.concepts.find((concept) => {
            const previous = base.concepts.find((item) => item.id === concept.id)
            if (!previous) return true
            return previous.title !== concept.title
              || previous.questionIds.length !== concept.questionIds.length
              || previous.questionIds.some((id) => !concept.questionIds.includes(id))
          })
          setSavedConceptId(saved?.id ?? null)
        }
      } catch (error) {
        let questions = confirmed.current.questions
        let concepts = confirmed.current.concepts
        if (remoteReady.current) {
          try {
            questions = await listQuestions()
            concepts = await listConcepts()
          } catch {
            // The last confirmed account copy stays on screen when the reload also fails.
          }
        }
        const reverted = applyAccount({
          ...resolved,
          drafts: conceptsChanged ? draftsBeforeSave : resolved.drafts,
          questions,
          concepts,
        }, questions, concepts)
        confirmed.current = reverted
        if (current.current === resolved) show(reverted)
        setSavedConceptId(null)
        setStoreError(error instanceof Error ? error.message : 'The change could not be saved to the account.')
      }
    }).catch((error: unknown) => {
      if (current.current === resolved) show(confirmed.current)
      setSavedConceptId(null)
      setStoreError(error instanceof Error ? error.message : 'The change could not be saved to the account.')
    })
    chain.current = job
    void job.finally(() => {
      if (chain.current === job) setSaving(false)
    })
  }

  async function signOut() {
    accountId.current = null
    confirmed.current = emptyWorkspace()
    setSavedConceptId(null)
    show(emptyWorkspace())
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  return { workspace, ready, email, storeError, saving, savedConceptId, conceptsLoaded, write, signOut }
}
