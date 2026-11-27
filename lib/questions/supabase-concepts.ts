import { readConceptImage } from '@/lib/questions/concept-image'
import { linkChanges } from '@/lib/questions/concept-links'
import { blossomedQuestionNotice, originatingQuestionId } from '@/lib/questions/library-carousel'
import type { ConceptRecord, ConceptSource, ExperienceConceptSource, LibraryConcept, QuestionRecord } from '@/lib/questions/types'
import { circleName } from '@/lib/questions/experience-content'
import { withBasePath } from '@/lib/paths'
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

type ExperienceSourceRow = {
  id: string
  concept_id: string
  experience_id: string | null
  item_id: string | null
  curiosity_id: string
  circle: string
  original_text_snapshot: string
}

function conceptMessage(error: { code?: string; message?: string }, fallback: string) {
  const message = error.message ?? ''
  if (error.code === '23505') return 'That concept is already in the account.'
  if (error.code === '23503') return 'A source question is not in this account, so the concept was not kept.'
  if (error.code === '23514') return 'The concept does not match the account rules for its title, image, or wording.'
  if (/fetch|network|failed to fetch/i.test(message)) return 'The network could not reach the account. Nothing new was confirmed.'
  return fallback
}

async function signedIn(action = 'saving a concept') {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error(`Sign in again before ${action}.`)
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

async function signedImageUrls(paths: string[]) {
  const signed = new Map<string, string>()
  if (paths.length === 0) return signed
  const { supabase } = await signedIn()
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, signedUrlSeconds)
  if (error) throw new Error('The saved images could not be opened. The library was left unchanged.')
  for (const item of data ?? []) {
    if (item.error || !item.signedUrl) throw new Error('A saved image could not be opened. The library was left unchanged.')
    signed.set(item.path ?? '', item.signedUrl)
  }
  return signed
}

function toExperienceSource(row: ExperienceSourceRow): ExperienceConceptSource | null {
  const circle = circleName(row.circle)
  const originalText = row.original_text_snapshot.trim()
  if (!circle || !originalText) return null
  return {
    linkId: row.id,
    experienceId: row.experience_id,
    itemId: row.item_id,
    curiosityId: row.curiosity_id,
    circle,
    originalText,
  }
}

function experienceSourceFor(conceptId: string, rows: ExperienceSourceRow[]) {
  const row = rows.find((item) => item.concept_id === conceptId)
  return row ? toExperienceSource(row) : null
}

async function loadExperienceSources(supabase: Awaited<ReturnType<typeof signedIn>>['supabase'], column: 'curiosity_id' | 'user_id', value: string) {
  const result = await supabase
    .from('concept_experience_sources')
    .select('id, concept_id, experience_id, item_id, curiosity_id, circle, original_text_snapshot')
    .eq(column, value)
  if (!result.error) return result.data ?? []
  if (result.error.code === '42P01' || result.error.code === 'PGRST205') return []
  throw new Error(conceptMessage(result.error, 'The library could not be loaded.'))
}

function toConcept(row: ConceptRow, sources: ConceptSource[], imageSrc: string, experienceSource: ExperienceConceptSource | null = null): ConceptRecord {
  const live = sources.flatMap((source) => source.questionId ? [source.questionId] : [])
  const anchorQuestionId = originatingQuestionId({
    anchorQuestionId: null,
    forConsideredText: row.for_considered_text,
    sources,
  })
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
    anchorQuestionId,
    questionIds: anchorQuestionId ? [anchorQuestionId, ...live.filter((id) => id !== anchorQuestionId)] : live,
    sources,
    experienceSource,
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
  const experienceSources = await loadExperienceSources(supabase, 'curiosity_id', curiosityId)
  const rows = conceptRows ?? []
  const links = linkRows ?? []
  const signed = await signedImageUrls(rows.map((row) => row.image_path))
  return rows.map((row) => {
    const sources = links.filter((link) => link.concept_id === row.id).map(toSource)
    const imageSrc = signed.get(row.image_path)
    if (!imageSrc) throw new Error('A saved image could not be opened. The library was left unchanged.')
    return toConcept(row, sources, imageSrc, experienceSourceFor(row.id, experienceSources))
  })
}

// Read-only collection for the Library. Do not pass the result to
// syncConceptChanges or assign it to workspace.concepts. A concept's
// curiosity_id cannot be changed, and the workspace writer saves one curiosity.
export async function listAccountConcepts(): Promise<LibraryConcept[]> {
  const { supabase, userId } = await signedIn('opening the library')
  const [{ data: conceptRows, error: conceptError }, { data: linkRows, error: linkError }] = await Promise.all([
    supabase.from('concepts').select('id, curiosity_id, title, for_considered_text, image_path, image_model, prompt_version, created_at, updated_at').eq('user_id', userId).order('updated_at', { ascending: false }),
    supabase.from('concept_questions').select('id, concept_id, question_id, original_text_snapshot, considered_text_snapshot').eq('user_id', userId),
  ])
  if (conceptError) throw new Error(conceptMessage(conceptError, 'The library could not be loaded.'))
  if (linkError) throw new Error(conceptMessage(linkError, 'The library could not be loaded.'))
  const experienceSources = await loadExperienceSources(supabase, 'user_id', userId)
  const rows = conceptRows ?? []
  const links = linkRows ?? []
  const signed = await signedImageUrls(rows.map((row) => row.image_path))
  return rows.map((row) => {
    const sources = links.filter((link) => link.concept_id === row.id).map(toSource)
    const imageSrc = signed.get(row.image_path)
    if (!imageSrc) throw new Error('A saved image could not be opened. The library was left unchanged.')
    return { ...toConcept(row, sources, imageSrc, experienceSourceFor(row.id, experienceSources)), curiosityId: row.curiosity_id }
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

async function primaryConceptStored(supabase: Awaited<ReturnType<typeof signedIn>>['supabase'], curiosityId: string, questionId: string) {
  const linked = await supabase.from('concept_questions').select('concept_id').eq('curiosity_id', curiosityId).eq('question_id', questionId)
  if (linked.error) throw new Error(conceptMessage(linked.error, blossomedQuestionNotice))
  const ids = [...new Set((linked.data ?? []).flatMap((row) => typeof row.concept_id === 'string' ? [row.concept_id] : []))]
  if (ids.length === 0) return false
  const [conceptRows, linkRows, experienceRows] = await Promise.all([
    supabase.from('concepts').select('id, for_considered_text').in('id', ids).eq('curiosity_id', curiosityId),
    supabase.from('concept_questions').select('concept_id, question_id, considered_text_snapshot').in('concept_id', ids).eq('curiosity_id', curiosityId),
    supabase.from('concept_experience_sources').select('concept_id').in('concept_id', ids),
  ])
  if (conceptRows.error) throw new Error(conceptMessage(conceptRows.error, blossomedQuestionNotice))
  if (linkRows.error) throw new Error(conceptMessage(linkRows.error, blossomedQuestionNotice))
  const experienceIds = new Set<string>()
  if (!experienceRows.error) {
    for (const row of experienceRows.data ?? []) {
      if (typeof row.concept_id === 'string') experienceIds.add(row.concept_id)
    }
  } else if (experienceRows.error.code !== '42P01' && experienceRows.error.code !== 'PGRST205') {
    throw new Error(conceptMessage(experienceRows.error, blossomedQuestionNotice))
  }
  return (conceptRows.data ?? []).some((row) => {
    if (experienceIds.has(row.id)) return false
    return originatingQuestionId({
      anchorQuestionId: null,
      forConsideredText: row.for_considered_text,
      sources: (linkRows.data ?? []).filter((link) => link.concept_id === row.id).map((link) => ({
        questionId: link.question_id,
        consideredText: link.considered_text_snapshot,
      })),
    }) === questionId
  })
}

export async function createStoredConcept(concept: ConceptRecord, questions: QuestionRecord[], curiosityId: string) {
  if (!concept.model?.trim() || !concept.promptVersion?.trim()) {
    throw new Error('This drawing has no image model on record, so it was not kept in the account.')
  }
  if (!concept.experienceSource && concept.anchorQuestionId) {
    const { supabase } = await signedIn()
    if (await primaryConceptStored(supabase, curiosityId, concept.anchorQuestionId)) throw new Error(blossomedQuestionNotice)
  }
  const image = readConceptImage(concept.imageSrc)
  if ('error' in image) throw new Error(image.error)
  const snapshotToken = concept.experienceSource?.snapshotToken?.trim() ?? ''
  if (concept.experienceSource && !snapshotToken) {
    throw new Error('This visualisation has no source snapshot, so the concept was not kept.')
  }
  const { supabase, userId } = await signedIn()
  const path = `${userId}/${concept.id}/kept.${image.file.extension}`
  const uploaded = await supabase.storage.from(bucket).upload(path, new Blob([image.file.bytes], { type: image.file.mime }), {
    contentType: image.file.mime,
    upsert: false,
  })
  if (uploaded.error) throw new Error(conceptMessage(uploaded.error, 'The selected image could not be uploaded. The concept was not kept.'))

  if (concept.experienceSource) {
    const payload = {
      conceptId: concept.id,
      curiosityId,
      token: snapshotToken,
      title: concept.title.trim(),
      consideredText: concept.forConsideredText.trim(),
      imagePath: path,
      imageModel: concept.model.trim(),
      promptVersion: concept.promptVersion.trim(),
    }
    const postProvenance = async () => {
      const response = await fetch(withBasePath('/api/visualise/provenance'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const recorded = await response.json() as { error?: unknown }
      if (!response.ok) {
        const failure = new Error(typeof recorded.error === 'string' ? recorded.error : 'The Experience source could not be saved.')
        ;(failure as Error & { definite: boolean }).definite = true
        throw failure
      }
    }
    let definite: Error | null = null
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await postProvenance()
        return
      } catch (error) {
        const reason = error instanceof Error ? error : new Error('The Experience source could not be saved.')
        if ('definite' in reason && reason.definite === true) {
          definite = reason
          break
        }
      }
    }
    if (definite) {
      const fileProblem = await removeUploaded(path)
      throw new Error(cleanupMessage(definite.message, fileProblem ? [fileProblem] : []))
    }
    const existing = await supabase.from('concepts').select('id').eq('id', concept.id).eq('user_id', userId).maybeSingle()
    if (!existing.error && existing.data) return
    if (!existing.error) {
      const fileProblem = await removeUploaded(path)
      throw new Error(cleanupMessage('The concept was not saved.', fileProblem ? [fileProblem] : []))
    }
    throw new Error('The save could not be confirmed. Open the library before trying again. Nothing was shown as saved.')
  }

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
