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

export type ComparisonScopeResult =
  | { mode: 'idle' }
  | { mode: 'pair'; pair: ComparisonPair }
  | { mode: 'select'; picks: string[]; notice: string | null }
  | { mode: 'browse'; notice: string }

export function comparisonScopeNotice(scopeLabel: string | null) {
  if (scopeLabel) return `Choose concepts from ${scopeLabel}.`
  return 'Choose concepts from the library now in view.'
}

export function comparisonTooFewNotice(scopeLabel: string | null) {
  if (scopeLabel) return `${scopeLabel} does not have enough saved concepts to compare. Choose All curiosities to compare across the library.`
  return 'There are not enough saved concepts to compare yet.'
}

// Library Show decides which concepts may be compared. A pair stays only when
// both concepts remain in the new scope. One remaining concept returns to
// selection. Fewer than two concepts in scope leaves comparison entirely.
export function reconcileComparisonScope(
  pair: ComparisonPair | null,
  picks: string[] | null,
  allowedIds: ReadonlySet<string>,
  availableCount: number,
  scopeLabel: string | null,
): ComparisonScopeResult {
  if (!pair && !picks) return { mode: 'idle' }
  if (availableCount < 2) return { mode: 'browse', notice: comparisonTooFewNotice(scopeLabel) }
  if (pair) {
    const left = allowedIds.has(pair.leftId)
    const right = allowedIds.has(pair.rightId)
    if (left && right) return { mode: 'pair', pair }
    return {
      mode: 'select',
      picks: [pair.leftId, pair.rightId].filter((id) => allowedIds.has(id)),
      notice: comparisonScopeNotice(scopeLabel),
    }
  }
  const current = picks ?? []
  const kept = current.filter((id) => allowedIds.has(id))
  return {
    mode: 'select',
    picks: kept,
    notice: kept.length === current.length ? null : comparisonScopeNotice(scopeLabel),
  }
}

export function questionFromReflection(text: string): { ok: false; error: string } | { ok: true; text: string } {
  const planted = plantedQuestion(text)
  if (!planted) return { ok: false, error: 'Write the question you want to keep.' }
  if (planted.length > 2000) return { ok: false, error: 'Keep a question within 2000 characters.' }
  return { ok: true, text: planted }
}
