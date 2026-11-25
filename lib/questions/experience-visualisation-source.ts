import { createClient } from '@/lib/supabase/server'
import { circleName, type CircleName } from '@/lib/questions/experience-content'
import type { VisualisationSnapshot } from '@/lib/questions/visualisation-snapshot'

export async function purgeAbandonedVisualisationSources() {
  const supabase = await createClient()
  await supabase.rpc('purge_abandoned_experience_visualisation_sources')
}

export async function releaseExperienceVisualisationSource(sourceId: string, userId: string) {
  const supabase = await createClient()
  const removed = await supabase
    .from('experience_visualisation_sources')
    .delete()
    .eq('id', sourceId)
    .eq('user_id', userId)
  return !removed.error
}

export async function captureExperienceVisualisationSource(input: {
  userId: string
  curiosityId: string
  experienceId: string
  itemId: string
  circle: CircleName
  originalText: string
}): Promise<{ sourceId: string; originalText: string; circle: CircleName } | null> {
  const supabase = await createClient()
  await purgeAbandonedVisualisationSources()
  const inserted = await supabase
    .from('experience_visualisation_sources')
    .insert({
      id: crypto.randomUUID(),
      user_id: input.userId,
      curiosity_id: input.curiosityId,
      experience_id: input.experienceId,
      item_id: input.itemId,
      circle: input.circle,
      original_text_snapshot: input.originalText,
    })
    .select('id, circle, original_text_snapshot')
    .single()
  if (inserted.error || !inserted.data) return null
  const circle = circleName(inserted.data.circle)
  const originalText = inserted.data.original_text_snapshot?.trim() ?? ''
  if (!circle || !originalText) return null
  return { sourceId: inserted.data.id, originalText, circle }
}

// The signed token and the stored row must still describe the same opening.
// Live ids may already be null. The wording and circle must still match.
// Absent means the temporary row is gone. A save may still find permanent provenance.
export async function locateVisualisationSource(snapshot: VisualisationSnapshot): Promise<'match' | 'mismatch' | 'absent'> {
  const supabase = await createClient()
  const row = await supabase
    .from('experience_visualisation_sources')
    .select('curiosity_id, circle, original_text_snapshot')
    .eq('id', snapshot.sourceId)
    .eq('user_id', snapshot.userId)
    .maybeSingle()
  if (row.error || !row.data) return 'absent'
  const matches = row.data.curiosity_id === snapshot.curiosityId
    && row.data.circle === snapshot.circle
    && row.data.original_text_snapshot === snapshot.originalText
  return matches ? 'match' : 'mismatch'
}

export async function storedVisualisationMatches(snapshot: VisualisationSnapshot) {
  return await locateVisualisationSource(snapshot) === 'match'
}
