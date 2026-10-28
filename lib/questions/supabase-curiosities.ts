import { cleanCuriosityName, curiosityNameProblem, initialCuriosityName, isPersistedStage } from '@/lib/questions/curiosity'
import { createClient } from '@/lib/supabase/client'
import type { StageId } from '@/lib/questions/types'

export type CuriositySummary = {
  id: string
  name: string
  stage: StageId
  updatedAt: string
  questionCount: number
  conceptCount: number
}

function curiosityMessage(error: { code?: string; message?: string }, fallback: string) {
  const message = error.message ?? ''
  if (error.code === '23505') return 'You already have a curiosity with this name.'
  if (error.code === '23514') return 'That name does not match the account rules.'
  if (/fetch|network|failed to fetch/i.test(message)) return 'The network could not reach the account. Nothing new was confirmed.'
  return fallback
}

function countOf(value: unknown) {
  if (Array.isArray(value)) {
    const first = value[0] as { count?: unknown } | undefined
    return typeof first?.count === 'number' ? first.count : 0
  }
  if (value && typeof value === 'object' && typeof (value as { count?: unknown }).count === 'number') {
    return (value as { count: number }).count
  }
  return 0
}

async function signedIn() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Sign in again before opening a curiosity.')
  return { supabase, userId: data.user.id }
}

export async function listCuriosities(): Promise<CuriositySummary[]> {
  const { supabase } = await signedIn()
  const { data, error } = await supabase
    .from('curiosities')
    .select('id, name, stage, updated_at, questions(count), concepts(count)')
    .order('updated_at', { ascending: false })
  if (error) throw new Error(curiosityMessage(error, 'The curiosities could not be loaded.'))
  return (data ?? []).flatMap((row) => {
    if (!isPersistedStage(row.stage)) return []
    return [{
      id: row.id,
      name: row.name,
      stage: row.stage,
      updatedAt: row.updated_at,
      questionCount: countOf(row.questions),
      conceptCount: countOf(row.concepts),
    }]
  })
}

export async function getCuriosity(id: string): Promise<CuriositySummary | null> {
  const { supabase } = await signedIn()
  const { data, error } = await supabase
    .from('curiosities')
    .select('id, name, stage, updated_at, questions(count), concepts(count)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(curiosityMessage(error, 'The curiosity could not be opened.'))
  if (!data || !isPersistedStage(data.stage)) return null
  return {
    id: data.id,
    name: data.name,
    stage: data.stage,
    updatedAt: data.updated_at,
    questionCount: countOf(data.questions),
    conceptCount: countOf(data.concepts),
  }
}

export async function createCuriosity(name: string) {
  const problem = curiosityNameProblem(name)
  if (problem) throw new Error(problem)
  const { supabase, userId } = await signedIn()
  const id = crypto.randomUUID()
  const { error } = await supabase.from('curiosities').insert({
    id,
    user_id: userId,
    name: cleanCuriosityName(name),
    stage: 'gather',
  })
  if (error) throw new Error(curiosityMessage(error, 'The curiosity could not be created.'))
  return id
}

export async function renameCuriosity(id: string, name: string) {
  const problem = curiosityNameProblem(name)
  if (problem) throw new Error(problem)
  const { supabase } = await signedIn()
  const { data, error } = await supabase
    .from('curiosities')
    .update({ name: cleanCuriosityName(name) })
    .eq('id', id)
    .select('id')
  if (error) throw new Error(curiosityMessage(error, 'The curiosity could not be renamed.'))
  if (!data?.length) throw new Error('That curiosity is not in your account.')
}

export async function rememberCuriosityStage(id: string, stage: StageId) {
  const { supabase } = await signedIn()
  const { error } = await supabase.from('curiosities').update({ stage }).eq('id', id)
  if (error) throw new Error(curiosityMessage(error, 'The place you left off could not be saved.'))
}

export { initialCuriosityName }
