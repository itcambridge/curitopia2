import type { StageId } from '@/lib/questions/types'

export const initialCuriosityName = 'Garden'
const maxCuriosityName = 80

export function cleanCuriosityName(value: string) {
  return value.trim()
}

export function curiosityNameProblem(value: string) {
  const name = cleanCuriosityName(value)
  if (!name) return 'Name the curiosity.'
  if (name.length > maxCuriosityName) return 'Keep the name within 80 characters.'
  return null
}

export function curiosityDraftKey(curiosityId: string) {
  return `curitopia.v2.curiosity.${curiosityId}`
}

export function isPersistedStage(value: string): value is StageId {
  return value === 'gather' || value === 'curate' || value === 'visualise' || value === 'distil' || value === 'library'
}
