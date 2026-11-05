import type { StageId } from '@/lib/questions/types'

export const createCuriosityChoice = 'new'

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

// A switch from the selector opens that curiosity's Garden. A direct link
// resumes the stage that curiosity last saved. Revising a concept still opens Distil.
export function stageAfterCuriosityOpen(savedStage: StageId, openGarden: boolean, revising: boolean): StageId {
  if (revising) return 'distil'
  if (openGarden) return 'gather'
  return savedStage
}
