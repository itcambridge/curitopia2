import { readConceptImage } from '@/lib/questions/concept-image'
import { linkChanges } from '@/lib/questions/concept-links'
import type { ConceptRecord, ConceptSource, QuestionRecord } from '@/lib/questions/types'
import { createClient } from '@/lib/supabase/client'

const bucket = 'concept-images'
const signedUrlSeconds = 60 * 60

type ConceptRow = {
  id: string
  title: string
  for_considered_text: string
  image_path: string
  image_model: string
  prompt_version: string
  created_at: string
  updated_at: string
}

type LinkRow = {
  id: string
  concept_id: string
  question_id: string | null
  original_text_snapshot: string
  considered_text_snapshot: string | null
}

function conceptMessage(error: { code?: string; message?: string }, fallback: string) {
  const message = error.message ?? ''
  if (error.code === '23505') return 'That concept is already in the account.'
  if (error.code === '23503') return 'A source question is not in this account, so the concept was not kept.'
  if (error.code === '23514') return 'The concept does not match the account rules for its title, image, or wording.'
  if (/fetch|network|failed to fetch/i.test(message)) return 'The network could not reach the account. Nothing new was confirmed.'
  return fallback
}

async function signedIn() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Sign in again before saving a concept.')
  return { supabase, userId: data.user.id }
}

function toSource(row: LinkRow): ConceptSource {
  return {
    linkId: row.id,
    questionId: row.question_id,
    originalText: row.original_text_snapshot,
    consideredText: row.considered_text_snapshot,
  }
}

function toConcept(row: ConceptRow, sources: ConceptSource[], imageSrc: string): ConceptRecord {
  const live = sources.filter((source) => source.questionId)
  return {
    id: row.id,
    title: row.title,
    imageSrc,
    imagePath: row.image_path,
    imageLabel: row.image_model,
    imageSource: 'openai',
    model: row.image_model,
    promptVersion: row.prompt_version,
    forConsideredText: row.for_considered_text,
    anchorQuestionId: live[0]?.questionId ?? null,
    questionIds: live.flatMap((source) => source.questionId ? [source.questionId] : []),
    sources,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listConcepts(curiosityId: string) {
  const { supabase } = await signedIn()
  const [{ data: conceptRows, error: conceptError }, { data: linkRows, error: linkError }] = await Promise.all([
    supabase.from('concepts').select('id, title, for_considered_text, image_path, image_model, prompt_version, created_at, updated_at').eq('curiosity_id', curiosityId).order('updated_at', { ascending: false }),
    supabase.from('concept_questions').select('id, concept_id, question_id, original_text_snapshot, considered_text_snapshot').eq('curiosity_id', curiosityId),
  ])
  if (conceptError) throw new Error(conceptMessage(conceptError, 'The library could not be loaded.'))
  if (linkError) throw new Error(conceptMessage(linkError, 'The library could not be loaded.'))
  const rows = conceptRows ?? []
  const links = linkRows ?? []
  const signed = new Map<string, string>()
  if (rows.length > 0) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrls(rows.map((row) => row.image_path), signedUrlSeconds)
    if (error) throw new Error('The saved images could not be opened. The library was left unchanged.')
    for (const item of data ?? []) {
      if (item.error || !item.signedUrl) throw new Error('A saved image could not be opened. The library was left unchanged.')
      signed.set(item.path ?? '', item.signedUrl)
    }
  }
  return rows.map((row) => {
    const sources = links.filter((link) => link.concept_id === row.id).map(toSource)
    const imageSrc = signed.get(row.image_path)
    if (!imageSrc) throw new Error('A saved image could not be opened. The library was left unchanged.')
    return toConcept(row, sources, imageSrc)
  })
}

function snapshot(question: QuestionRecord) {
  const original = question.originalText.trim()
  const considered = question.consideredText?.trim() ?? ''
  if (!original) throw new Error('A source question has no wording, so the concept was not kept.')
  return {
    original_text_snapshot: original,
    considered_text_snapshot: considered ? considered : null,
  }
}

async function removeUploaded(path: string) {
  const { supabase } = await signedIn()
  const { error } = await supabase.storage.from(bucket).remove([path])
  return error ? 'the uploaded image could not be removed' : null
}

async function removeConceptRow(id: string) {
  const { supabase } = await signedIn()
  const { error } = await supabase.from('concepts').delete().eq('id', id)
  return error ? 'the new concept row could not be removed' : null
}

function cleanupMessage(action: string, problems: string[]) {
  if (problems.length === 0) return action
  return `${action} Cleanup also failed: ${problems.join('; ')}.`
}

export async function createStoredConcept(concept: ConceptRecord, questions: QuestionRecord[], curiosityId: string) {
  if (!concept.model?.trim() || !concept.promptVersion?.trim()) {
    throw new Error('This drawing has no image model on record, so it was not kept in the account.')
  }
  const image = readConceptImage(concept.imageSrc)
  if ('error' in image) throw new Error(image.error)
  const { supabase, userId } = await signedIn()
  const path = `${userId}/${concept.id}/kept.${image.file.extension}`
  const uploaded = await supabase.storage.from(bucket).upload(path, new Blob([image.file.bytes], { type: image.file.mime }), {
    contentType: image.file.mime,
    upsert: false,
  })
  if (uploaded.error) throw new Error(conceptMessage(uploaded.error, 'The selected image could not be uploaded. The concept was not kept.'))

  const inserted = await supabase.from('concepts').insert({
    id: concept.id,
    user_id: userId,
    curiosity_id: curiosityId,
    title: concept.title,
    for_considered_text: concept.forConsideredText.trim(),
    image_path: path,
    image_model: concept.model.trim(),
    prompt_version: concept.promptVersion.trim(),
  })
  if (inserted.error) {
    const fileProblem = await removeUploaded(path)
    throw new Error(cleanupMessage(conceptMessage(inserted.error, 'The concept could not be saved.'), fileProblem ? [fileProblem] : []))
  }

  let links: {
    id: string
    concept_id: string
    question_id: string
    user_id: string
    curiosity_id: string
    original_text_snapshot: string
    considered_text_snapshot: string | null
  }[]
  try {
    links = concept.questionIds.map((questionId) => {
      const question = questions.find((item) => item.id === questionId)
      if (!question) throw new Error('A source question is not in this account, so the concept was not kept.')
      const text = snapshot(question)
      return {
        id: crypto.randomUUID(),
        concept_id: concept.id,
        question_id: question.id,
        user_id: userId,
        curiosity_id: curiosityId,
        ...text,
      }
    })
  } catch (error) {
    const problems = [await removeConceptRow(concept.id), await removeUploaded(path)].filter((item): item is string => Boolean(item))
    const reason = error instanceof Error ? error.message : 'The concept sources could not be saved.'
    throw new Error(cleanupMessage(reason, problems))
  }
  if (links.length === 0) {
    const problems = [await removeConceptRow(concept.id), await removeUploaded(path)].filter((item): item is string => Boolean(item))
    throw new Error(cleanupMessage('A concept needs at least one source question.', problems))
  }
  const linked = await supabase.from('concept_questions').insert(links)
  if (linked.error) {
    const problems = [await removeConceptRow(concept.id), await removeUploaded(path)].filter((item): item is string => Boolean(item))
    throw new Error(cleanupMessage(conceptMessage(linked.error, 'The concept sources could not be saved.'), problems))
  }
}

export async function updateStoredConcept(before: ConceptRecord, after: ConceptRecord, questions: QuestionRecord[], curiosityId: string) {
  const { supabase, userId } = await signedIn()
  if (before.title !== after.title) {
    const updated = await supabase.from('concepts').update({ title: after.title }).eq('id', after.id).eq('curiosity_id', curiosityId)
    if (updated.error) throw new Error(conceptMessage(updated.error, 'The title could not be saved.'))
  }
  const changes = linkChanges(before.sources, after.questionIds)
  if (changes.remove.length > 0) {
    const removed = await supabase.from('concept_questions').delete().in('id', changes.remove)
    if (removed.error) throw new Error(conceptMessage(removed.error, 'A source question could not be removed from the concept.'))
  }
  if (changes.add.length > 0) {
    const links = changes.add.map((questionId) => {
      const question = questions.find((item) => item.id === questionId)
      if (!question) throw new Error('A source question is not in this account, so the concept was not changed.')
      const text = snapshot(question)
      return {
        id: crypto.randomUUID(),
        concept_id: after.id,
        question_id: question.id,
        user_id: userId,
        curiosity_id: curiosityId,
        ...text,
      }
    })
    const linked = await supabase.from('concept_questions').insert(links)
    if (linked.error) throw new Error(conceptMessage(linked.error, 'A source question could not be added to the concept.'))
  }
}

export function conceptsEqual(before: ConceptRecord[], after: ConceptRecord[]) {
  if (before.length !== after.length) return false
  const prior = new Map(before.map((concept) => [concept.id, concept]))
  return after.every((concept) => {
    const previous = prior.get(concept.id)
    if (!previous) return false
    return previous.title === concept.title
      && previous.forConsideredText === concept.forConsideredText
      && previous.imagePath === concept.imagePath
      && previous.model === concept.model
      && previous.promptVersion === concept.promptVersion
      && previous.questionIds.length === concept.questionIds.length
      && previous.questionIds.every((id) => concept.questionIds.includes(id))
  })
}

export async function syncConceptChanges(before: ConceptRecord[], after: ConceptRecord[], questions: QuestionRecord[], curiosityId: string) {
  const afterIds = new Set(after.map((concept) => concept.id))
  if (before.some((concept) => !afterIds.has(concept.id))) {
    throw new Error('A concept disappeared from the screen. The account copy was left in place.')
  }
  const prior = new Map(before.map((concept) => [concept.id, concept]))
  for (const concept of after) {
    const existing = prior.get(concept.id)
    if (!existing) {
      await createStoredConcept(concept, questions, curiosityId)
      continue
    }
    if (
      existing.title !== concept.title
      || existing.questionIds.length !== concept.questionIds.length
      || existing.questionIds.some((id) => !concept.questionIds.includes(id))
    ) {
      await updateStoredConcept(existing, concept, questions, curiosityId)
    }
  }
}
