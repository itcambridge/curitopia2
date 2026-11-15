import { createClient } from '@/lib/supabase/server'
import { circleName } from '@/lib/questions/experience-content'
import { assembleCuratedExploration } from '@/lib/questions/experience-exploration'
import {
  type FacilitationContext,
  type FacilitationPhrase,
} from '@/lib/questions/experience-facilitator'

function clip(value: string, limit: number) {
  const text = value.trim()
  return text.length <= limit ? text : text.slice(0, limit)
}

export async function loadFacilitationContext(input: {
  curiosityId: string
  experienceId: string
  questionIds: readonly string[]
  conceptIds: readonly string[]
}): Promise<FacilitationContext | null> {
  const supabase = await createClient()
  const curiosity = await supabase.from('curiosities').select('name').eq('id', input.curiosityId).maybeSingle()
  if (curiosity.error) throw new Error('The experience could not be read.')
  if (!curiosity.data?.name) return null

  const experience = await supabase
    .from('experiences')
    .select('north_star')
    .eq('id', input.experienceId)
    .eq('curiosity_id', input.curiosityId)
    .maybeSingle()
  if (experience.error) throw new Error('The experience could not be read.')
  if (!experience.data) return null

  const notes = await supabase
    .from('experience_circle_items')
    .select('id, circle, body')
    .eq('experience_id', input.experienceId)
    .order('created_at', { ascending: true })
  if (notes.error) throw new Error('The experience could not be read.')
  const phrases: FacilitationPhrase[] = []
  for (const row of notes.data ?? []) {
    const circle = circleName(row.circle)
    if (!circle || !row.body.trim()) continue
    phrases.push({ id: row.id, circle, body: clip(row.body, 240) })
  }

  // The route still accepts question and concept id lists. They do not choose this collection.
  void input.questionIds
  void input.conceptIds

  const conceptRows = await supabase
    .from('concepts')
    .select('id, title, for_considered_text, created_at')
    .eq('curiosity_id', input.curiosityId)
    .order('created_at', { ascending: true })
  if (conceptRows.error) throw new Error('The experience could not be read.')
  const conceptIds = (conceptRows.data ?? []).map((row) => row.id)
  const linkRows = conceptIds.length === 0
    ? { data: [], error: null }
    : await supabase
      .from('concept_questions')
      .select('concept_id, question_id, original_text_snapshot, considered_text_snapshot')
      .eq('curiosity_id', input.curiosityId)
      .in('concept_id', conceptIds)
  if (linkRows.error) throw new Error('The experience could not be read.')

  const exploration = assembleCuratedExploration(
    (conceptRows.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      forConsideredText: row.for_considered_text,
      createdAt: row.created_at,
    })),
    (linkRows.data ?? []).map((row) => ({
      conceptId: row.concept_id,
      questionId: row.question_id,
      originalText: row.original_text_snapshot,
      consideredText: row.considered_text_snapshot,
    })),
  )

  return {
    curiosityName: clip(curiosity.data.name, 200),
    northStar: experience.data.north_star ? clip(experience.data.north_star, 400) : null,
    phrases,
    questions: [],
    concepts: exploration.concepts,
    provenance: exploration.provenance,
  }
}
