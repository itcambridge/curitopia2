import type { ConceptSource } from '@/lib/questions/types'

export function linkChanges(existing: ConceptSource[], nextQuestionIds: string[]) {
  const live = existing.filter((source): source is ConceptSource & { questionId: string } => typeof source.questionId === 'string')
  const next = new Set(nextQuestionIds)
  const seen = new Set<string>()
  return {
    remove: live.filter((source) => !next.has(source.questionId)).map((source) => source.linkId),
    add: nextQuestionIds.filter((id) => {
      if (seen.has(id) || live.some((source) => source.questionId === id)) return false
      seen.add(id)
      return true
    }),
  }
}
