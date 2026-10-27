import type { Disposition, QuestionRecord } from '@/lib/questions/types'

const dispositions: Disposition[] = ['gathered', 'retained', 'parked', 'discarded']
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type ImportSkip = {
  id: string
  text: string
  reason: string
}

export type ImportItem = {
  question: QuestionRecord
  note: string | null
}

function characterLength(text: string) {
  return Array.from(text).length
}

function storedText(value: string) {
  const text = value.trim()
  if (!text || characterLength(text) > 2000) return null
  return text
}

function isDisposition(value: string): value is Disposition {
  return dispositions.includes(value as Disposition)
}

function pointerAt(local: Map<string, string | null>, remote: Map<string, string | null>, id: string) {
  if (local.has(id)) return local.get(id) ?? null
  return remote.get(id) ?? null
}

export function planQuestionImport(local: QuestionRecord[], remote: QuestionRecord[]) {
  const skipped: ImportSkip[] = []
  const remoteIds = new Set(remote.map((item) => item.id))
  const remotePointers = new Map(remote.map((item) => [item.id, item.mergedIntoId]))
  const prepared: QuestionRecord[] = []

  for (const item of local) {
    const label = item.originalText.trim() || item.id
    if (remoteIds.has(item.id)) {
      skipped.push({ id: item.id, text: label, reason: 'Already in the account. The account wording was left unchanged.' })
      continue
    }
    if (!uuidPattern.test(item.id)) {
      skipped.push({ id: item.id, text: label, reason: 'The id is not a UUID the account can store.' })
      continue
    }
    const originalText = storedText(item.originalText)
    if (!originalText) {
      skipped.push({ id: item.id, text: label, reason: 'The original wording is empty or longer than 2000 characters.' })
      continue
    }
    if (!isDisposition(item.disposition)) {
      skipped.push({ id: item.id, text: originalText, reason: 'The curation state is not one this account stores.' })
      continue
    }
    let consideredText: string | null = null
    if (item.consideredText !== null) {
      consideredText = storedText(item.consideredText)
      if (!consideredText) {
        skipped.push({ id: item.id, text: originalText, reason: 'The considered wording is empty or longer than 2000 characters.' })
        continue
      }
    }
    const note = originalText === item.originalText && consideredText === item.consideredText
      ? null
      : 'Surrounding spaces were removed, which is the same check used when a question is captured.'
    prepared.push({
      ...item,
      originalText,
      consideredText,
      mergedIntoId: item.mergedIntoId,
      note,
    } as QuestionRecord & { note?: string })
  }

  const notes = new Map<string, string | null>(prepared.map((item) => [item.id, (item as QuestionRecord & { note?: string }).note ?? null]))
  const questions = prepared.map((item) => {
    const { note: _note, ...question } = item as QuestionRecord & { note?: string }
    return question
  })
  const localIds = new Set(questions.map((item) => item.id))
  const pointers = new Map(questions.map((item) => [item.id, item.mergedIntoId]))

  for (const question of questions) {
    const target = question.mergedIntoId
    if (!target) continue
    if (target === question.id || !uuidPattern.test(target) || (!localIds.has(target) && !remoteIds.has(target))) {
      pointers.set(question.id, null)
      notes.set(question.id, target === question.id
        ? 'A question cannot be merged into itself, so it was kept on its own.'
        : 'The merge target is not available, so the question was kept on its own.')
    }
  }

  for (const question of questions) {
    let walk = pointers.get(question.id) ?? null
    const seen = new Set<string>([question.id])
    let depth = 0
    let unsafe = false
    while (walk) {
      depth += 1
      if (walk === question.id || seen.has(walk) || depth > 64) {
        unsafe = true
        break
      }
      seen.add(walk)
      walk = pointerAt(pointers, remotePointers, walk)
    }
    if (unsafe) {
      for (const id of seen) {
        pointers.set(id, null)
        notes.set(id, 'The merge would loop or is too deep, so the question was kept on its own.')
      }
    }
  }

  const items: ImportItem[] = questions.map((question) => ({
    question: { ...question, mergedIntoId: pointers.get(question.id) ?? null },
    note: notes.get(question.id) ?? null,
  }))

  return { items, skipped }
}
