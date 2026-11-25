import { circleName, type CircleName } from '@/lib/questions/experience-content'
import { createClient } from '@/lib/supabase/server'

export type OwnedExperienceTopic = {
  originalText: string
  circle: CircleName
}

// The signed-in user, the curiosity, the experience, and the topic must agree.
// A miss returns null. Callers must not send the request to a model.
export async function loadOwnedExperienceTopic(curiosityId: string, experienceId: string, itemId: string): Promise<OwnedExperienceTopic | null> {
  const supabase = await createClient()
  const experience = await supabase
    .from('experiences')
    .select('id')
    .eq('id', experienceId)
    .eq('curiosity_id', curiosityId)
    .maybeSingle()
  if (experience.error || !experience.data) return null
  const item = await supabase
    .from('experience_circle_items')
    .select('body, circle')
    .eq('id', itemId)
    .eq('experience_id', experienceId)
    .maybeSingle()
  if (item.error || !item.data) return null
  const circle = circleName(item.data.circle)
  const originalText = item.data.body?.trim() ?? ''
  if (!circle || !originalText) return null
  return { originalText, circle }
}
