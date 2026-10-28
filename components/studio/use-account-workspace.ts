'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { workspaceForAccount } from '@/lib/questions/account-workspace'
import { isStageId } from '@/lib/questions/workspace'
import { conceptsEqual, listConcepts, syncConceptChanges } from '@/lib/questions/supabase-concepts'
import { getCuriosity, rememberCuriosityStage, renameCuriosity } from '@/lib/questions/supabase-curiosities'
import { questionsEqual, syncQuestionChanges } from '@/lib/questions/question-sync'
import { curiosityDraftRepository } from '@/lib/questions/store'
import { listQuestions } from '@/lib/questions/supabase-questions'
import { createClient } from '@/lib/supabase/client'
import type { ConceptRecord, QuestionRecord, Workspace } from '@/lib/questions/types'
import { emptyWorkspace } from '@/lib/questions/workspace'

export function useAccountWorkspace(curiosityId: string) {
  const router = useRouter()
  const drafts = useRef(curiosityDraftRepository(curiosityId))
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace())
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [curiosityName, setCuriosityName] = useState<string | null>(null)
  const [missingCuriosity, setMissingCuriosity] = useState(false)
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
      drafts.current.persist({ ...next, concepts: keptLocalConcepts.current })
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
    drafts.current = curiosityDraftRepository(curiosityId)
    setReady(false)
    setMissingCuriosity(false)
    setCuriosityName(null)
    show(emptyWorkspace())
    async function load() {
      const local = drafts.current.load()
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
        const curiosity = await getCuriosity(curiosityId)
        if (cancelled) return
        if (!curiosity) {
          setMissingCuriosity(true)
          setEmail(data.user?.email ?? null)
          const empty = emptyWorkspace()
          show(empty)
          confirmed.current = empty
          remoteReady.current = false
          setConceptsLoaded(false)
          setStoreError('This curiosity is not in your account.')
          return
        }
        setCuriosityName(curiosity.name)
        const questions = await listQuestions(curiosityId)
        if (cancelled) return
        let concepts: ConceptRecord[] = []
        let libraryError: string | null = null
        try {
          concepts = await listConcepts(curiosityId)
        } catch (error) {
          libraryError = error instanceof Error ? error.message : 'The library could not be loaded.'
        }
        if (cancelled) return
        const resumed = applyAccount(local.workspace, questions, concepts)
        const next = { ...resumed, stage: isStageId(curiosity.stage) ? curiosity.stage : resumed.stage }
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
  }, [curiosityId])

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
          await syncQuestionChanges(base.questions, resolved.questions, curiosityId)
          questions = await listQuestions(curiosityId)
          confirmed.current = { ...confirmed.current, questions }
        }
        if (conceptsChanged) {
          await syncConceptChanges(base.concepts, resolved.concepts, questions, curiosityId)
        }
        if (resolved.stage !== base.stage) await rememberCuriosityStage(curiosityId, resolved.stage)
        const refreshedConcepts = conceptsChanged || openingLibrary
        const concepts = refreshedConcepts ? await listConcepts(curiosityId) : resolved.concepts
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
            questions = await listQuestions(curiosityId)
            concepts = await listConcepts(curiosityId)
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

  async function rename(name: string) {
    await renameCuriosity(curiosityId, name)
    setCuriosityName(name.trim())
  }

  return { workspace, ready, email, curiosityName, missingCuriosity, storeError, saving, savedConceptId, conceptsLoaded, write, rename, signOut }
}
