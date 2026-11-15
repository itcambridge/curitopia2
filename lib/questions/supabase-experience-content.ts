import { createClient } from '@/lib/supabase/client'
import {
  circleName,
  experienceContentView,
  prepareCircleText,
  prepareNorthStar,
  type CircleItem,
  type CircleName,
  type ExperienceContent,
} from '@/lib/questions/experience-content'
import { experienceRecordPermitted, experienceWriteTarget } from '@/lib/questions/experience'
import { readPublicSupabaseEnv } from '@/lib/supabase/env'

function missingExperienceContent(error: { code?: string; message?: string }) {
  const message = error.message ?? ''
  return error.code === '42703'
    || error.code === '42P01'
    || error.code === 'PGRST204'
    || error.code === 'PGRST205'
    || (/north_star|experience_circle_items/i.test(message) && /does not exist|schema cache|could not find/i.test(message))
}

function experienceContentMessage(error: { code?: string; message?: string }) {
  if (missingExperienceContent(error)) return 'The North Star and circles are not in this development database yet. Apply the experience content migration before writing them. The curiosity stays as it is.'
  if (error.code === '23514') return 'Keep that wording within its length, without spaces at the ends. Nothing was saved.'
  if (error.code === '23503') return 'That experience is not in your account. Nothing was saved.'
  if (/fetch|network|failed to fetch/i.test(error.message ?? '')) return 'The network could not reach the development database. Nothing was saved.'
  return 'The experience could not be saved.'
}

function requireWritableExperience(productionOpen: boolean) {
  const target = experienceWriteTarget(readPublicSupabaseEnv())
  if (!experienceRecordPermitted({
    target,
    nodeEnv: process.env.NODE_ENV,
    uiPermit: process.env.NEXT_PUBLIC_EXPERIENCE_PRODUCTION_UI,
    productionOpen,
  })) {
    throw new Error('An Experience record is not stored for this project. Nothing was saved.')
  }
}

function circleItemFromRow(row: { id: string; circle: string; body: string; created_at: string }): CircleItem {
  const circle = circleName(row.circle)
  if (!circle) throw new Error('The circle item could not be read.')
  return { id: row.id, circle, body: row.body, createdAt: row.created_at }
}

export async function loadExperienceContent(experienceId: string, productionOpen: boolean): Promise<ExperienceContent> {
  requireWritableExperience(productionOpen)
  const supabase = createClient()
  const star = await supabase.from('experiences').select('north_star').eq('id', experienceId).maybeSingle()
  if (star.error) throw new Error(experienceContentMessage(star.error))
  if (!star.data) throw new Error('That experience is not in your account. Nothing was saved.')
  const notes = await supabase.from('experience_circle_items').select('id, circle, body, created_at').eq('experience_id', experienceId).order('created_at', { ascending: true })
  if (notes.error) throw new Error(experienceContentMessage(notes.error))
  return experienceContentView({
    northStar: star.data.north_star,
    items: (notes.data ?? []).map(circleItemFromRow),
  })
}

export async function saveNorthStar(experienceId: string, draft: string, productionOpen: boolean): Promise<string | null> {
  requireWritableExperience(productionOpen)
  const prepared = prepareNorthStar(draft)
  if ('error' in prepared) throw new Error(prepared.error)
  const supabase = createClient()
  const { data, error } = await supabase.from('experiences').update({ north_star: prepared.value }).eq('id', experienceId).select('north_star').maybeSingle()
  if (error) throw new Error(experienceContentMessage(error))
  if (!data) throw new Error('That experience is not in your account. Nothing was saved.')
  return data.north_star
}

export async function addCircleItem(experienceId: string, circle: CircleName, draft: string, productionOpen: boolean): Promise<CircleItem> {
  requireWritableExperience(productionOpen)
  if (!circleName(circle)) throw new Error('Choose Concern, Influence, or Control.')
  const prepared = prepareCircleText(draft)
  if ('error' in prepared) throw new Error(prepared.error)
  const supabase = createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw new Error('Sign in again before changing this experience.')
  const inserted = await supabase.from('experience_circle_items').insert({
    id: crypto.randomUUID(),
    user_id: userData.user.id,
    experience_id: experienceId,
    circle,
    body: prepared.value,
  }).select('id, circle, body, created_at').single()
  if (inserted.error) throw new Error(experienceContentMessage(inserted.error))
  return circleItemFromRow(inserted.data)
}

export async function editCircleItem(itemId: string, draft: string, productionOpen: boolean): Promise<CircleItem> {
  requireWritableExperience(productionOpen)
  const prepared = prepareCircleText(draft)
  if ('error' in prepared) throw new Error(prepared.error)
  const supabase = createClient()
  const { data, error } = await supabase.from('experience_circle_items').update({ body: prepared.value }).eq('id', itemId).select('id, circle, body, created_at').maybeSingle()
  if (error) throw new Error(experienceContentMessage(error))
  if (!data) throw new Error('That note is not in your account. Nothing was saved.')
  return circleItemFromRow(data)
}

export async function deleteCircleItem(itemId: string, productionOpen: boolean): Promise<void> {
  requireWritableExperience(productionOpen)
  const supabase = createClient()
  const { data, error } = await supabase.from('experience_circle_items').delete().eq('id', itemId).select('id')
  if (error) throw new Error(experienceContentMessage(error))
  if (!data || data.length === 0) throw new Error('That note is not in your account. Nothing was removed.')
}

export async function moveCircleItem(itemId: string, circle: CircleName, productionOpen: boolean): Promise<CircleItem> {
  requireWritableExperience(productionOpen)
  if (!circleName(circle)) throw new Error('Choose Concern, Influence, or Control.')
  const supabase = createClient()
  const { data, error } = await supabase.from('experience_circle_items').update({ circle }).eq('id', itemId).select('id, circle, body, created_at').maybeSingle()
  if (error) throw new Error(experienceContentMessage(error))
  if (!data) throw new Error('That note is not in your account. Nothing was saved.')
  return circleItemFromRow(data)
}
