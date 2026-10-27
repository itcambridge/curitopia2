import type { QuestionRecord } from '@/lib/questions/types'
import { insertQuestion, updateQuestion, type QuestionPatch } from '@/lib/questions/supabase-questions'

function patchFor(before: QuestionRecord, after: QuestionRecord): QuestionPatch | null {
  const patch: QuestionPatch = {}
  if (before.originalText !== after.originalText) patch.originalText = after.originalText
  if (before.consideredText !== after.consideredText) patch.consideredText = after.consideredText
  if (before.disposition !== after.disposition) patch.disposition = after.disposition
  if (before.mergedIntoId !== after.mergedIntoId) patch.mergedIntoId = after.mergedIntoId
  return Object.keys(patch).length ? patch : null
}

export function questionsEqual(before: QuestionRecord[], after: QuestionRecord[]) {
  if (before.length !== after.length) return false
  const prior = new Map(before.map((item) => [item.id, item]))
  return after.every((item) => {
    const previous = prior.get(item.id)
    return previous ? patchFor(previous, item) === null : false
  })
}

export async function syncQuestionChanges(before: QuestionRecord[], after: QuestionRecord[]) {
  const prior = new Map(before.map((item) => [item.id, item]))
  const afterIds = new Set(after.map((item) => item.id))
  if (before.some((item) => !afterIds.has(item.id))) {
    throw new Error('A question disappeared from the screen. The account copy was left in place.')
  }
  const created = after.filter((item) => !prior.has(item.id))
  const pending = [...created]
  const saved = new Set(before.map((item) => item.id))
  while (pending.length) {
    const index = pending.findIndex((item) => !item.mergedIntoId || saved.has(item.mergedIntoId))
    const [item] = pending.splice(index === -1 ? 0 : index, 1)
    await insertQuestion(item)
    saved.add(item.id)
  }
  for (const item of after) {
    const previous = prior.get(item.id)
    if (!previous) continue
    const patch = patchFor(previous, item)
    if (patch) await updateQuestion(item.id, patch)
  }
}
