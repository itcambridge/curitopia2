'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { browserWorkspaceRepository } from '@/lib/questions/store'
import { confirmImportedQuestions, ensureQuestionArchive, readQuestionArchive, rememberUnsavedQuestions } from '@/lib/questions/local-archive'
import { planQuestionImport, type ImportItem, type ImportSkip } from '@/lib/questions/import-plan'
import { questionsEqual, syncQuestionChanges } from '@/lib/questions/question-sync'
import { importQuestions, listQuestions } from '@/lib/questions/supabase-questions'
import { createClient } from '@/lib/supabase/client'
import type { QuestionRecord, Workspace } from '@/lib/questions/types'
import { emptyWorkspace } from '@/lib/questions/workspace'

export function useAccountWorkspace() {
  const router = useRouter()
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace())
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [storeError, setStoreError] = useState<string | null>(null)
  const [importItems, setImportItems] = useState<ImportItem[] | null>(null)
  const [importSkipped, setImportSkipped] = useState<ImportSkip[]>([])
  const [importHidden, setImportHidden] = useState(false)
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

  function offerImport(remote: QuestionRecord[]) {
    const archive = readQuestionArchive()
    if (!archive) {
      setImportItems(null)
      return
    }
    const remoteIds = new Set(remote.map((item) => item.id))
    const pending = archive.questions.filter((item) => !remoteIds.has(item.id) && !archive.confirmedIds.includes(item.id))
    if (pending.length === 0) {
      setImportItems(null)
      return
    }
    const plan = planQuestionImport(pending, remote)
    setImportItems(plan.items)
    setImportSkipped(plan.skipped)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      const local = browserWorkspaceRepository.load()
      ensureQuestionArchive(local.workspace.questions, local.workspace.drafts, local.workspace.concepts)
      try {
        const supabase = createClient()
        const [{ data }, questions] = await Promise.all([
          supabase.auth.getUser(),
          listQuestions(),
        ])
        if (cancelled) return
        setEmail(data.user?.email ?? null)
        const known = new Set(questions.map((item) => item.id))
        publish({
          ...local.workspace,
          questions,
          drafts: local.workspace.drafts.filter((draft) => known.has(draft.questionId)),
          concepts: local.workspace.concepts.filter((concept) => known.has(concept.anchorQuestionId)),
        })
        remoteReady.current = true
        confirmed.current = {
          ...local.workspace,
          questions,
          drafts: local.workspace.drafts.filter((draft) => known.has(draft.questionId)),
          concepts: local.workspace.concepts.filter((concept) => known.has(concept.anchorQuestionId)),
        }
        offerImport(questions)
        setStoreError(null)
      } catch (error) {
        if (cancelled) return
        publish(local.workspace)
        remoteReady.current = false
        setStoreError(error instanceof Error ? error.message : 'The account questions could not be loaded. The browser copy is on screen and was not changed.')
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
          rememberUnsavedQuestions(resolved.questions)
          if (current.current === resolved) publish(resolved)
          setStoreError('The account questions are not loaded, so this change stayed in the browser.')
          return
        }
        try {
          await syncQuestionChanges(base.questions, resolved.questions)
          const questions = await listQuestions()
          const synced = { ...resolved, questions }
          confirmed.current = synced
          if (current.current === resolved) publish(synced)
          setStoreError(null)
        } catch (error) {
          rememberUnsavedQuestions(resolved.questions)
          confirmed.current = base
          if (current.current === resolved) publish(base)
          setStoreError(error instanceof Error ? error.message : 'The question could not be saved to the account.')
        }
        return
      }
      confirmed.current = current.current === resolved ? resolved : confirmed.current
      if (current.current === resolved) publish(resolved)
    }).catch((error: unknown) => {
      if (current.current === resolved) publish(confirmed.current)
      setStoreError(error instanceof Error ? error.message : 'The question could not be saved to the account.')
    })
  }

  async function runImport() {
    const archive = readQuestionArchive()
    const remote = await listQuestions()
    const remoteIds = new Set(remote.map((item) => item.id))
    const pending = (archive?.questions ?? []).filter((item) => !remoteIds.has(item.id) && !(archive?.confirmedIds.includes(item.id)))
    const plan = planQuestionImport(pending, remote)
    setImportItems(plan.items)
    setImportSkipped(plan.skipped)
    const result = await importQuestions(plan.items)
    const questions = await listQuestions()
    const known = new Set(questions.map((item) => item.id))
    publish({
      ...current.current,
      questions,
      drafts: [...current.current.drafts, ...(archive?.drafts ?? []).filter((draft) => known.has(draft.questionId) && !current.current.drafts.some((item) => item.questionId === draft.questionId))],
      concepts: [...current.current.concepts, ...(archive?.concepts ?? []).filter((concept) => known.has(concept.anchorQuestionId) && !current.current.concepts.some((item) => item.id === concept.id))],
    })
    const present = new Set(questions.map((item) => item.id))
    setImportItems(plan.items.filter((item) => !present.has(item.question.id)))
    return result
  }

  function confirmImport() {
    const archive = readQuestionArchive()
    const present = new Set(current.current.questions.map((item) => item.id))
    const alreadyNoted = new Set(
      importSkipped.filter((item) => item.reason.startsWith('Already in the account')).map((item) => item.id),
    )
    confirmImportedQuestions(
      (archive?.questions ?? []).map((item) => item.id).filter((id) => present.has(id) || alreadyNoted.has(id)),
    )
    setImportItems(null)
    setImportHidden(true)
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  return {
    workspace,
    ready,
    email,
    storeError,
    write,
    signOut,
    importItems: importHidden ? null : importItems,
    importSkipped,
    runImport,
    confirmImport,
    dismissImport: () => setImportHidden(true),
  }
}
