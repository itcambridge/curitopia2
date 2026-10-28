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
  concept: Pick<ConceptRecord, 'forConsideredText' | 'sources' | 'questionIds'>,
  questions: Pick<QuestionRecord, 'id' | 'originalText'>[],
): { count: number; lead: string; supporting: string[]; hidden: number } {
  const fromSources = concept.sources.map((source) => source.originalText.trim()).filter(Boolean)
  const fromQuestions = concept.questionIds.flatMap((id) => {
    const question = questions.find((item) => item.id === id)
    return question?.originalText.trim() ? [question.originalText.trim()] : []
  })
  const originals = fromSources.length > 0 ? fromSources : fromQuestions
  const considered = concept.forConsideredText.trim()
  const lead = considered || originals[0] || ''
  const unique = [...new Set(originals.filter((text) => text !== lead))]
  return {
    count: concept.sources.length || concept.questionIds.length,
    lead,
    supporting: unique.slice(0, 3),
    hidden: Math.max(0, unique.length - 3),
  }
}
