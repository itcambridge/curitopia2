import { createClient } from '@/lib/supabase/client'
import { experienceWriteTarget, nextExperienceVisit } from '@/lib/questions/experience'
import { readPublicSupabaseEnv } from '@/lib/supabase/env'

export type OpenExperience = {
  id: string
  created: boolean
}

function missingExperienceTable(error: { code?: string; message?: string }) {
  const message = error.message ?? ''
  return error.code === '42P01' || error.code === 'PGRST205' || (/experiences/i.test(message) && /does not exist|schema cache|could not find/i.test(message))
}

function experienceMessage(error: { code?: string; message?: string }) {
  if (missingExperienceTable(error)) return 'The Experience table is not in this development database yet. Apply the experiences migration to the development project. Nothing was saved.'
  if (error.code === '23503') return 'That curiosity is not in your account. Nothing was saved.'
  if (/fetch|network|failed to fetch/i.test(error.message ?? '')) return 'The network could not reach the development database. Nothing was saved.'
  return 'The experience could not be opened.'
}

async function readExperienceId(curiosityId: string) {
  const supabase = createClient()
  const { data, error } = await supabase.from('experiences').select('id').eq('curiosity_id', curiosityId).maybeSingle()
  if (error) throw new Error(experienceMessage(error))
  return data?.id ?? null
}

export async function openExperience(curiosityId: string): Promise<OpenExperience> {
  if (experienceWriteTarget(readPublicSupabaseEnv()) !== 'allowed') {
    throw new Error('An Experience record is not stored for this project. Nothing was saved.')
  }
  const supabase = createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw new Error('Sign in again before opening an experience.')
  const visit = nextExperienceVisit(await readExperienceId(curiosityId))
  if (visit.action === 'resume') return { id: visit.id, created: false }
  const id = crypto.randomUUID()
  const inserted = await supabase.from('experiences').insert({
    id,
    user_id: userData.user.id,
    curiosity_id: curiosityId,
  }).select('id')
  if (inserted.error?.code === '23505') {
    const existingId = await readExperienceId(curiosityId)
    if (!existingId) throw new Error('The experience could not be opened.')
    return { id: existingId, created: false }
  }
  if (inserted.error) throw new Error(experienceMessage(inserted.error))
  return { id, created: true }
}
