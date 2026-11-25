import { createClient } from '@/lib/supabase/server'
import { circleName, type CircleName } from '@/lib/questions/experience-content'
import type { ExperienceConceptSave } from '@/lib/ai/visualisation-http'

function savedMessage(error: { message?: string } | null) {
  const message = error?.message ?? ''
  if (message.includes('already been saved')) return 'This visualisation has already been saved.'
  if (message.includes('has expired')) return 'This visualisation has expired. Open the topic again.'
  if (message.includes('not available')) return 'This visualisation is no longer available. Open the topic again.'
  if (message.includes('not in this curiosity')) return 'That concept is not in this curiosity.'
  return 'The Experience source could not be saved.'
}

// The database function creates the concept and copies the captured source in
// one transaction. This caller cannot supply the wording, the circle, or the live ids.
export async function saveExperienceVisualisationProvenance(input: ExperienceConceptSave): Promise<{
  circle: CircleName
  originalText: string
  experienceId: string | null
  itemId: string | null
} | { error: string }> {
  const supabase = await createClient()
  const saved = await supabase.rpc('save_experience_visualisation_provenance', {
    p_concept_id: input.conceptId,
    p_source_id: input.sourceId,
    p_title: input.title,
    p_considered_text: input.consideredText,
    p_image_path: input.imagePath,
    p_image_model: input.imageModel,
    p_prompt_version: input.promptVersion,
  })
  const row = saved.data?.[0]
  const circle = row ? circleName(row.circle) : null
  if (saved.error || !row || !circle || !row.original_text_snapshot.trim()) {
    return { error: savedMessage(saved.error) }
  }
  return {
    experienceId: row.experience_id,
    itemId: row.item_id,
    circle,
    originalText: row.original_text_snapshot,
  }
}
