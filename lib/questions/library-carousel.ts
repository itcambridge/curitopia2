import type { ConceptRecord, ConceptSource, QuestionRecord } from '@/lib/questions/types'

export function orderedConcepts<T extends { id: string; updatedAt: string }>(concepts: T[]): T[] {
  return [...concepts].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id))
}

export function selectedConceptIndex(concepts: { id: string }[], focusId: string | null): number {
  if (concepts.length === 0) return -1
  const index = concepts.findIndex((concept) => concept.id === focusId)
  return index === -1 ? 0 : index
}

export function stepConceptIndex(index: number, count: number, direction: -1 | 1): number {
  if (count <= 0) return -1
  if (count === 1) return 0
  const next = index + direction
  if (next < 0) return count - 1
  if (next >= count) return 0
  return next
}

// Shortest step around the filtered collection. The records stay unique;
// only the displayed neighbour changes when browsing wraps.
export function carouselOffset(index: number, selected: number, count: number): number {
  if (count <= 1) return index === selected ? 0 : index - selected
  let delta = index - selected
  const half = count / 2
  if (delta > half) delta -= count
  if (delta < -half) delta += count
  return delta
}

export function conceptQuestionCopy(
  concept: Pick<ConceptRecord, 'sources' | 'questionIds'>,
  questions: Pick<QuestionRecord, 'id' | 'originalText'>[],
): { questions: string[] } {
  const fromSources = concept.sources.map((source) => source.originalText.trim()).filter(Boolean)
  const fromQuestions = concept.questionIds.flatMap((id) => {
    const question = questions.find((item) => item.id === id)
    return question?.originalText.trim() ? [question.originalText.trim()] : []
  })
  const originals = fromSources.length > 0 ? fromSources : fromQuestions
  return { questions: [...new Set(originals)] }
}

export const questionNotRecorded = 'Question not recorded'

// The originating question is the one whose saved image-prompt snapshot matches
// the concept. A single live link, or the anchor recorded at save time, is used
// when that match is absent. Several live links and no unique match stay unresolved.
export function originatingQuestionId(concept: {
  anchorQuestionId: string | null
  forConsideredText?: string
  sources: Pick<ConceptSource, 'questionId' | 'consideredText'>[]
}): string | null {
  const prompt = concept.forConsideredText?.trim() ?? ''
  const live = concept.sources.filter((source) => source.questionId)
  const matched = [...new Set(live.flatMap((source) => {
    if (!source.questionId || !prompt || (source.consideredText?.trim() ?? '') !== prompt) return []
    return [source.questionId]
  }))]
  if (matched.length === 1) return matched[0]
  if (live.length === 1) return live[0].questionId
  if (live.length === 0) return concept.anchorQuestionId
  if (concept.anchorQuestionId && live.some((source) => source.questionId === concept.anchorQuestionId)) return concept.anchorQuestionId
  return null
}

export function questionDispositionMap(
  loaded: { id: string; disposition: string }[],
  current: { id: string; disposition: string }[] = [],
) {
  const dispositions = new Map<string, string>()
  for (const question of loaded) dispositions.set(question.id, question.disposition)
  for (const question of current) dispositions.set(question.id, question.disposition)
  return dispositions
}

// A concept leaves the Library only while its originating question is discarded.
// A missing live question, or an unresolved origin, stays visible. Other contributors do not hide it.
export function conceptRemainsVisible(
  concept: {
    anchorQuestionId: string | null
    forConsideredText?: string
    sources: Pick<ConceptSource, 'questionId' | 'consideredText'>[]
  },
  dispositions: ReadonlyMap<string, string>,
) {
  const origin = originatingQuestionId(concept)
  if (!origin) return true
  return dispositions.get(origin) !== 'discarded'
}

// The card shows the person's original question, preferring the wording saved
// with the concept. A later edit to the live question stays off the card.
// The image prompt in considered text is not the question.
export function conceptCardQuestion(
  concept: Pick<ConceptRecord, 'anchorQuestionId' | 'sources' | 'questionIds'> & { forConsideredText?: string },
  questions: Pick<QuestionRecord, 'id' | 'originalText'>[],
): string {
  const origin = originatingQuestionId(concept)
  const anchorSource = origin
    ? concept.sources.find((source) => source.questionId === origin)
    : undefined
  const anchorText = anchorSource?.originalText.trim()
  if (anchorText) return anchorText
  const snapshot = concept.sources.map((source) => source.originalText.trim()).find(Boolean)
  if (snapshot) return snapshot
  const ids = [
    ...(origin ? [origin] : []),
    ...concept.questionIds.filter((id) => id !== origin),
  ]
  for (const id of ids) {
    const text = questions.find((item) => item.id === id)?.originalText.trim()
    if (text) return text
  }
  return questionNotRecorded
}
