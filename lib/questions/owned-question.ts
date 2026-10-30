import { createClient } from '@/lib/supabase/server'

export async function loadOwnedQuestionText(questionId: string, curiosityId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('questions')
    .select('original_text')
    .eq('id', questionId)
    .eq('curiosity_id', curiosityId)
    .maybeSingle()
  if (error || !data?.original_text) return null
  return data.original_text
}
