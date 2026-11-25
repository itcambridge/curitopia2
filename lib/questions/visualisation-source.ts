import { circleById, circleName, type CircleName } from './experience-content.ts'
import type { ExperienceConceptSource } from './types.ts'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ExperienceTopicRequest = {
  curiosityId: string
  experienceId: string
  itemId: string
}

export type { ExperienceConceptSource }

export function isUuid(value: string) {
  return uuidPattern.test(value)
}

export function readExperienceTopicRequest(value: unknown): ExperienceTopicRequest | { error: string } {
  if (!value || typeof value !== 'object') return { error: 'Choose a saved topic before asking for a creative direction.' }
  const record = value as { kind?: unknown; curiosityId?: unknown; experienceId?: unknown; itemId?: unknown }
  if (record.kind !== 'experience-topic') return { error: 'That source is not an Experience topic. Nothing was sent.' }
  const curiosityId = typeof record.curiosityId === 'string' ? record.curiosityId : ''
  const experienceId = typeof record.experienceId === 'string' ? record.experienceId : ''
  const itemId = typeof record.itemId === 'string' ? record.itemId : ''
  if (!isUuid(curiosityId) || !isUuid(experienceId) || !isUuid(itemId)) {
    return { error: 'Choose a saved topic before asking for a creative direction.' }
  }
  return { curiosityId, experienceId, itemId }
}

export function experienceConceptSource(input: {
  linkId: string
  curiosityId: string
  experienceId: string | null
  itemId: string | null
  circle: string
  originalText: string
}): ExperienceConceptSource | null {
  const circle = circleName(input.circle)
  const originalText = input.originalText.trim()
  if (!circle || !originalText || originalText.length > 240) return null
  if (!isUuid(input.curiosityId)) return null
  if (input.experienceId && !isUuid(input.experienceId)) return null
  if (input.itemId && !isUuid(input.itemId)) return null
  return {
    linkId: input.linkId,
    experienceId: input.experienceId,
    itemId: input.itemId,
    curiosityId: input.curiosityId,
    circle,
    originalText,
  }
}

export function conceptOriginLabel(circle: CircleName) {
  return `Experience · ${circleById(circle).label}`
}
