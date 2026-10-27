import { createClient } from '@/lib/supabase/client'
import type { Disposition, QuestionRecord } from '@/lib/questions/types'
import type { ImportItem } from '@/lib/questions/import-plan'

const dispositions: Disposition[] = ['gathered', 'retained', 'parked', 'discarded']

export type QuestionPatch = {
  originalText?: string
  consideredText?: string | null
  disposition?: Disposition
  mergedIntoId?: string | null
}

export type ImportFailure = {
  id: string
  text: string
  reason: string
}

function isDisposition(value: string): value is Disposition {
  return dispositions.includes(value as Disposition)
}

export function questionSaveMessage(error: { code?: string; message?: string }) {
  const message = error.message ?? ''
  if (message.includes('merge would create a cycle')) return 'Those questions cannot be merged because it would make a circle.'
  if (message.includes('cannot merge into itself')) return 'A question cannot be merged into itself.'
  if (message.includes('restore a merged question')) return 'Restore the merged question before merging it somewhere else.'
  if (message.includes('merge chain is too deep')) return 'That merge chain is too long to save.'
  if (error.code === '23505') return 'That question is already in the account.'
  if (error.code === '23503') return 'The merge points at a question the account cannot use.'
  if (error.code === '23514') return 'That question does not match the account rules for wording or curation.'
  if (/fetch|network|failed to fetch/i.test(message)) return 'The network could not reach the account. Nothing new was confirmed.'
  return 'The question could not be saved to the account.'
}

async function signedInUserId() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Sign in again before saving a question.')
  return { supabase, userId: data.user.id }
}

function toRecord(row: {
  id: string
  original_text: string
  considered_text: string | null
  disposition: string
  merged_into_id: string | null
  created_at: string
  updated_at: string
}): QuestionRecord {
  if (!isDisposition(row.disposition)) {
    throw new Error('A saved question uses a curation state this screen does not understand.')
  }
  return {
    id: row.id,
    originalText: row.original_text,
    consideredText: row.considered_text,
    disposition: row.disposition,
    mergedIntoId: row.merged_into_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listQuestions() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('questions')
    .select('id, original_text, considered_text, disposition, merged_into_id, created_at, updated_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(questionSaveMessage(error))
  return (data ?? []).map(toRecord)
}

export async function insertQuestion(question: QuestionRecord) {
  const { supabase, userId } = await signedInUserId()
  const { error } = await supabase.from('questions').insert({
    id: question.id,
    user_id: userId,
    original_text: question.originalText,
    considered_text: question.consideredText,
    disposition: question.disposition,
    merged_into_id: question.mergedIntoId,
  })
  if (error) throw new Error(questionSaveMessage(error))
}

export async function updateQuestion(id: string, patch: QuestionPatch) {
  const { supabase } = await signedInUserId()
  const row: {
    original_text?: string
    considered_text?: string | null
    disposition?: Disposition
    merged_into_id?: string | null
  } = {}
  if (patch.originalText !== undefined) row.original_text = patch.originalText
  if (patch.consideredText !== undefined) row.considered_text = patch.consideredText
  if (patch.disposition !== undefined) row.disposition = patch.disposition
  if (patch.mergedIntoId !== undefined) row.merged_into_id = patch.mergedIntoId
  if (Object.keys(row).length === 0) return
  const { error } = await supabase.from('questions').update(row).eq('id', id)
  if (error) throw new Error(questionSaveMessage(error))
}

function insertOrder(items: ImportItem[]) {
  const pending = [...items]
  const ordered: ImportItem[] = []
  const ready = new Set<string>()
  while (pending.length) {
    const nextIndex = pending.findIndex((item) => {
      const target = item.question.mergedIntoId
      return !target || ready.has(target) || !pending.some((other) => other.question.id === target)
    })
    const index = nextIndex === -1 ? 0 : nextIndex
    const [item] = pending.splice(index, 1)
    ordered.push(item)
    ready.add(item.question.id)
  }
  return ordered
}

export async function importQuestions(items: ImportItem[]) {
  const failed: ImportFailure[] = []
  let imported = 0
  for (const item of insertOrder(items)) {
    try {
      await insertQuestion(item.question)
      imported += 1
    } catch (error) {
      failed.push({
        id: item.question.id,
        text: item.question.originalText,
        reason: error instanceof Error ? error.message : 'The question could not be saved to the account.',
      })
    }
  }
  return { imported, failed }
}
