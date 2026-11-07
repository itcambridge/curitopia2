import type { LibraryConcept } from '@/lib/questions/types'

export const allCuriositiesFocus = 'all'

export function initialLibraryFocus(entry: 'home' | 'curiosity', curiosityId: string | null) {
  if (entry === 'home' || !curiosityId) return allCuriositiesFocus
  return curiosityId
}

export function libraryFocusChoices(curiosities: { id: string; name: string }[]) {
  return [{ id: allCuriositiesFocus, name: 'All curiosities' }, ...curiosities]
}

export function libraryConceptsForFocus<T extends { curiosityId: string }>(concepts: T[], focus: string) {
  if (focus === allCuriositiesFocus) return concepts
  return concepts.filter((concept) => concept.curiosityId === focus)
}

export function libraryCuriosityName(curiosityId: string, names: { id: string; name: string }[]) {
  return names.find((item) => item.id === curiosityId)?.name ?? null
}

export function libraryOriginLabel(focus: string, curiosityName: string | null) {
  if (focus !== allCuriositiesFocus || !curiosityName) return null
  return `From: ${curiosityName}`
}

export function emptyLibraryMessage(focus: string, curiosityName: string | null) {
  if (focus === allCuriositiesFocus) return 'Nothing is saved yet. Keep an image from Visualise and it will appear here.'
  if (curiosityName) return `${curiosityName} has no saved concepts yet.`
  return 'This curiosity has no saved concepts yet.'
}

export function hiddenLibraryMessage() {
  return 'Concepts from discarded questions stay out of the library until those questions are restored.'
}

// Carousel position may be mirrored into the open workspace only when that
// concept is already one of its records. A concept from another curiosity must
// stay out of workspace.concepts.
export function workspaceFocusForLibraryConcept(
  workspaceConcepts: { id: string }[],
  concept: Pick<LibraryConcept, 'id' | 'curiosityId' | 'anchorQuestionId'>,
  openCuriosityId: string | null,
) {
  if (!openCuriosityId || concept.curiosityId !== openCuriosityId) return null
  if (!workspaceConcepts.some((item) => item.id === concept.id)) return null
  return { focusConceptId: concept.id, focusQuestionId: concept.anchorQuestionId }
}
