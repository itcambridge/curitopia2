import type { StageId } from '@/lib/questions/types'

export const createCuriosityChoice = 'new'

export function curiosityOpenPath(curiosityId: string) {
  return `/?curiosity=${encodeURIComponent(curiosityId)}`
}

export function experiencePath(curiosityId: string) {
  return `/?curiosity=${encodeURIComponent(curiosityId)}&experience=1`
}

export function curiosityGardenPath(curiosityId: string) {
  return `/?curiosity=${encodeURIComponent(curiosityId)}&garden=1`
}

export function curiositySwitchChoices(
  curiosities: { id: string; name: string }[],
  activeId: string,
  activeName: string | null,
) {
  const choices = curiosities.map((item) => ({ id: item.id, name: item.name }))
  if (activeId && !choices.some((item) => item.id === activeId)) {
    choices.unshift({ id: activeId, name: activeName ?? 'This curiosity' })
  }
  return choices
}

// Stored curiosities may still say curate or distil. The screen uses three
// destinations, and those are the only stages new navigation writes.
export function surfaceStage(stage: StageId): 'gather' | 'visualise' | 'library' {
  if (stage === 'visualise') return 'visualise'
  if (stage === 'distil' || stage === 'library') return 'library'
  return 'gather'
}

// A switch from the selector opens that curiosity's Garden. A direct link
// resumes the saved stage, mapped onto Garden, Visualise, or Library.
// Opening a concept for editing resumes in the Library.
export function stageAfterCuriosityOpen(savedStage: StageId, openGarden: boolean, revising: boolean): StageId {
  if (revising) return 'library'
  if (openGarden) return 'gather'
  return surfaceStage(savedStage)
}
