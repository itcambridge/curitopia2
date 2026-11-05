import { coverImageBucket, coverImageExtension, coverImageProblem, coverObjectPath, isDedicatedCoverPath } from '@/lib/questions/cover-image'
import { cleanCuriosityName, curiosityNameProblem, initialCuriosityName, isPersistedStage } from '@/lib/questions/curiosity'
import { createClient } from '@/lib/supabase/client'
import type { StageId } from '@/lib/questions/types'

const signedUrlSeconds = 60 * 60

export const coverMigrationNotice = 'Cover images are not saved yet. The cover image migration still needs to be applied.'

export type CuriositySummary = {
  id: string
  name: string
  stage: StageId
  updatedAt: string
  questionCount: number
  conceptCount: number
  coverImagePath: string | null
  coverImageSrc: string | null
}

export type CuriosityList = {
  items: CuriositySummary[]
  coverNotice: string | null
}

function curiosityMessage(error: { code?: string; message?: string }, fallback: string) {
  const message = error.message ?? ''
  if (missingCoverColumn(error)) return coverMigrationNotice
  if (error.code === '23505') return 'You already have a curiosity with this name.'
  if (error.code === '23514') return 'That name does not match the account rules.'
  if (/fetch|network|failed to fetch/i.test(message)) return 'The network could not reach the account. Nothing new was confirmed.'
  return fallback
}

function missingCoverColumn(error: { code?: string; message?: string }) {
  const message = error.message ?? ''
  return error.code === '42703' || error.code === 'PGRST204' || /cover_image_path/.test(message)
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

const curiosityColumns = 'id, name, stage, updated_at, questions(count), concepts(count)'
const curiosityColumnsWithCover = `${curiosityColumns}, cover_image_path`

type CuriosityRow = {
  id: string
  name: string
  stage: string
  updated_at: string
  cover_image_path?: string | null
  questions: unknown
  concepts: unknown
}

function toSummary(row: CuriosityRow, coverImageSrc: string | null): CuriositySummary | null {
  if (!isPersistedStage(row.stage)) return null
  return {
    id: row.id,
    name: row.name,
    stage: row.stage,
    updatedAt: row.updated_at,
    questionCount: countOf(row.questions),
    conceptCount: countOf(row.concepts),
    coverImagePath: row.cover_image_path ?? null,
    coverImageSrc,
  }
}

async function signedCoverUrls(paths: string[]) {
  if (paths.length === 0) return new Map<string, string>()
  const { supabase } = await signedIn()
  const { data, error } = await supabase.storage.from(coverImageBucket).createSignedUrls(paths, signedUrlSeconds)
  if (error) throw new Error('The cover images could not be opened.')
  const signed = new Map<string, string>()
  for (const item of data ?? []) {
    if (item.path && item.signedUrl && !item.error) signed.set(item.path, item.signedUrl)
  }
  return signed
}

export async function listCuriosities(): Promise<CuriosityList> {
  const { supabase } = await signedIn()
  const first = await supabase
    .from('curiosities')
    .select(curiosityColumnsWithCover)
    .order('updated_at', { ascending: false })
  let coverNotice: string | null = null
  let rows = (first.data ?? []) as CuriosityRow[]
  if (first.error) {
    if (!missingCoverColumn(first.error)) throw new Error(curiosityMessage(first.error, 'The curiosities could not be loaded.'))
    const second = await supabase
      .from('curiosities')
      .select(curiosityColumns)
      .order('updated_at', { ascending: false })
    if (second.error) throw new Error(curiosityMessage(second.error, 'The curiosities could not be loaded.'))
    rows = (second.data ?? []) as CuriosityRow[]
    coverNotice = coverMigrationNotice
  }
  const paths = [...new Set(rows.flatMap((row) => row.cover_image_path ? [row.cover_image_path] : []))]
  const signed = paths.length > 0 ? await signedCoverUrls(paths) : new Map<string, string>()
  return {
    items: rows.flatMap((row) => {
      const summary = toSummary(row, row.cover_image_path ? signed.get(row.cover_image_path) ?? null : null)
      return summary ? [summary] : []
    }),
    coverNotice,
  }
}

export async function listCuriosityNames() {
  const { supabase, userId } = await signedIn()
  const { data, error } = await supabase.from('curiosities').select('id, name').eq('user_id', userId).order('name', { ascending: true })
  if (error) throw new Error(curiosityMessage(error, 'The curiosities could not be loaded.'))
  return (data ?? []).flatMap((row) => row.id && row.name ? [{ id: row.id, name: row.name }] : [])
}

export async function getCuriosity(id: string): Promise<CuriositySummary | null> {
  const { supabase } = await signedIn()
  const { data, error } = await supabase
    .from('curiosities')
    .select(curiosityColumns)
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
    coverImagePath: null,
    coverImageSrc: null,
  }
}

async function currentCoverPath(id: string) {
  const { supabase } = await signedIn()
  const { data, error } = await supabase
    .from('curiosities')
    .select('cover_image_path')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(curiosityMessage(error, 'The cover image could not be read.'))
  if (!data) throw new Error('That curiosity is not in your account.')
  return { supabase, path: data.cover_image_path }
}

async function releaseCoverObject(path: string, userId: string, curiosityId: string) {
  if (!isDedicatedCoverPath(path, userId, curiosityId)) return null
  const { supabase } = await signedIn()
  const [curiosities, concepts] = await Promise.all([
    supabase.from('curiosities').select('id', { count: 'exact', head: true }).eq('cover_image_path', path),
    supabase.from('concepts').select('id', { count: 'exact', head: true }).eq('image_path', path),
  ])
  if (curiosities.error || concepts.error) return 'The previous cover file could not be checked, so it was left in storage.'
  if ((curiosities.count ?? 0) > 0 || (concepts.count ?? 0) > 0) return null
  const removed = await supabase.storage.from(coverImageBucket).remove([path])
  return removed.error ? 'The cover was updated. The previous file could not be deleted.' : null
}

export async function setCuriosityCover(id: string, file: File) {
  const problem = coverImageProblem(file)
  if (problem) throw new Error(problem)
  const extension = coverImageExtension(file.type)
  if (!extension) throw new Error('Use a JPEG, PNG, or WebP image.')
  const { supabase: session, userId } = await signedIn()
  const current = await currentCoverPath(id)
  const path = coverObjectPath(userId, id, extension)
  const uploaded = await session.storage.from(coverImageBucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (uploaded.error) throw new Error(curiosityMessage(uploaded.error, 'The image could not be uploaded.'))
  const saved = await session.from('curiosities').update({ cover_image_path: path }).eq('id', id).select('id')
  if (saved.error || !saved.data?.length) {
    await session.storage.from(coverImageBucket).remove([path])
    if (saved.error) throw new Error(curiosityMessage(saved.error, 'The cover image could not be saved.'))
    throw new Error('That curiosity is not in your account.')
  }
  return current.path ? await releaseCoverObject(current.path, userId, id) : null
}

export async function clearCuriosityCover(id: string) {
  const { userId } = await signedIn()
  const current = await currentCoverPath(id)
  const { supabase } = await signedIn()
  const saved = await supabase.from('curiosities').update({ cover_image_path: null }).eq('id', id).select('id')
  if (saved.error) throw new Error(curiosityMessage(saved.error, 'The cover image could not be removed.'))
  if (!saved.data?.length) throw new Error('That curiosity is not in your account.')
  return current.path ? await releaseCoverObject(current.path, userId, id) : null
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
