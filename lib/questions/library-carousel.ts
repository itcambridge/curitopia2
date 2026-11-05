import type { ConceptRecord, QuestionRecord } from '@/lib/questions/types'

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
  const next = index + direction
  if (next < 0 || next >= count) return index
  return next
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

// The card shows the person's original question, preferring the wording saved
// with the concept. A later edit to the live question stays off the card.
// The image prompt in considered text is not the question.
export function conceptCardQuestion(
  concept: Pick<ConceptRecord, 'anchorQuestionId' | 'sources' | 'questionIds'>,
  questions: Pick<QuestionRecord, 'id' | 'originalText'>[],
): string {
  const anchorSource = concept.anchorQuestionId
    ? concept.sources.find((source) => source.questionId === concept.anchorQuestionId)
    : undefined
  const anchorText = anchorSource?.originalText.trim()
  if (anchorText) return anchorText
  const snapshot = concept.sources.map((source) => source.originalText.trim()).find(Boolean)
  if (snapshot) return snapshot
  const ids = [
    ...(concept.anchorQuestionId ? [concept.anchorQuestionId] : []),
    ...concept.questionIds.filter((id) => id !== concept.anchorQuestionId),
  ]
  for (const id of ids) {
    const text = questions.find((item) => item.id === id)?.originalText.trim()
    if (text) return text
  }
  return questionNotRecorded
}
