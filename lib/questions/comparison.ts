import { plantedQuestion } from './workspace.ts'

export type ComparisonPair = {
  leftId: string
  rightId: string
}

export function toggleComparisonPick(current: string[], conceptId: string) {
  if (current.includes(conceptId)) {
    return { picks: current.filter((id) => id !== conceptId), status: 'removed' as const }
  }
  if (current.length >= 2) return { picks: current, status: 'full' as const }
  const picks = [...current, conceptId]
  return { picks, status: picks.length === 2 ? 'ready' as const : 'added' as const }
}

export function swapComparison(pair: ComparisonPair): ComparisonPair {
  return { leftId: pair.rightId, rightId: pair.leftId }
}

export function replaceComparison(pair: ComparisonPair, side: 'left' | 'right', conceptId: string): ComparisonPair | null {
  const otherId = side === 'left' ? pair.rightId : pair.leftId
  if (conceptId === otherId || conceptId === pair[side === 'left' ? 'leftId' : 'rightId']) return null
  if (side === 'left') return { leftId: conceptId, rightId: pair.rightId }
  return { leftId: pair.leftId, rightId: conceptId }
}

export function filterComparisonConcepts<T>(concepts: T[], query: string, textFor: (concept: T) => string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return concepts
  return concepts.filter((concept) => textFor(concept).toLowerCase().includes(needle))
}

export function questionFromReflection(text: string): { ok: false; error: string } | { ok: true; text: string } {
  const planted = plantedQuestion(text)
  if (!planted) return { ok: false, error: 'Write the question you want to keep.' }
  if (planted.length > 2000) return { ok: false, error: 'Keep a question within 2000 characters.' }
  return { ok: true, text: planted }
}
