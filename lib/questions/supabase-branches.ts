import { createClient } from '@/lib/supabase/client'
import type { QuestionBranch } from '@/lib/questions/types'

function branchSaveMessage(error: { code?: string; message?: string }) {
  const message = error.message ?? ''
  if (error.code === '42P01' || error.code === 'PGRST205' || /question_branches/i.test(message) && /does not exist|schema cache|could not find/i.test(message)) {
    return 'Branches are not saved yet. The question relationship migration still needs to be applied. Neither question was changed.'
  }
  if (error.code === '23505') return 'Those questions are already linked.'
  if (error.code === '23514') return 'A question cannot be linked to itself.'
  if (error.code === '23503') return 'That branch needs both questions in this curiosity.'
  if (/fetch|network|failed to fetch/i.test(message)) return 'The network could not reach the account. The branch was not confirmed.'
  return 'The branch could not be saved to the account.'
}

function toBranch(row: {
  id: string
  question_low_id: string
  question_high_id: string
  created_at: string
}): QuestionBranch {
  return {
    id: row.id,
    questionLowId: row.question_low_id,
    questionHighId: row.question_high_id,
    createdAt: row.created_at,
  }
}

export async function listBranches(curiosityId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('question_branches')
    .select('id, question_low_id, question_high_id, created_at')
    .eq('curiosity_id', curiosityId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(branchSaveMessage(error))
  return (data ?? []).map(toBranch)
}

export async function insertBranch(branch: QuestionBranch, curiosityId: string) {
  const supabase = createClient()
  const { data, error: userError } = await supabase.auth.getUser()
  if (userError || !data.user) throw new Error('Sign in again before linking questions.')
  const { error } = await supabase.from('question_branches').insert({
    id: branch.id,
    user_id: data.user.id,
    curiosity_id: curiosityId,
    question_low_id: branch.questionLowId,
    question_high_id: branch.questionHighId,
  })
  if (error) throw new Error(branchSaveMessage(error))
}

export async function deleteBranch(id: string, curiosityId: string) {
  const supabase = createClient()
  const { error } = await supabase.from('question_branches').delete().eq('id', id).eq('curiosity_id', curiosityId)
  if (error) throw new Error(branchSaveMessage(error))
}

export function branchesEqual(before: QuestionBranch[], after: QuestionBranch[]) {
  if (before.length !== after.length) return false
  const prior = new Set(before.map((branch) => branch.id))
  return after.every((branch) => prior.has(branch.id))
}

export async function syncBranchChanges(before: QuestionBranch[], after: QuestionBranch[], curiosityId: string) {
  const prior = new Set(before.map((branch) => branch.id))
  const next = new Set(after.map((branch) => branch.id))
  for (const branch of after) {
    if (!prior.has(branch.id)) await insertBranch(branch, curiosityId)
  }
  for (const branch of before) {
    if (!next.has(branch.id)) await deleteBranch(branch.id, curiosityId)
  }
}
