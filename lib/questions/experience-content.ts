export const circles = [
  { id: 'concern', label: 'Concern', depth: 'Far', hint: 'Matters to me, and I cannot determine the outcome.' },
  { id: 'influence', label: 'Influence', depth: 'Middle', hint: 'I can shape this, and I cannot guarantee it.' },
  { id: 'control', label: 'Control', depth: 'Near', hint: 'I can choose, do, practise, or manage this.' },
] as const

export type CircleName = (typeof circles)[number]['id']

export const northStarMaxLength = 400
export const circleItemMaxLength = 240

export type CircleItem = {
  id: string
  circle: CircleName
  body: string
  createdAt: string
}

export type ExperienceContent = {
  northStar: string | null
  items: CircleItem[]
}

export function circleName(value: string): CircleName | null {
  if (value === 'concern' || value === 'influence' || value === 'control') return value
  return null
}

export function prepareNorthStar(value: string): { value: string | null } | { error: string } {
  const text = value.trim()
  if (!text) return { value: null }
  if (text.length > northStarMaxLength) return { error: `Keep the North Star to ${northStarMaxLength} characters.` }
  return { value: text }
}

export function prepareCircleText(value: string): { value: string } | { error: string } {
  const text = value.trim()
  if (!text) return { error: 'Write a few words first.' }
  if (text.length > circleItemMaxLength) return { error: `Keep this to ${circleItemMaxLength} characters.` }
  return { value: text }
}

export function itemsByCircle(items: readonly CircleItem[]): Record<CircleName, CircleItem[]> {
  const grouped: Record<CircleName, CircleItem[]> = { concern: [], influence: [], control: [] }
  for (const item of items) grouped[item.circle].push(item)
  return grouped
}

export function experienceContentView(content: ExperienceContent): ExperienceContent {
  return {
    northStar: content.northStar,
    items: [...content.items].sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)),
  }
}

export function movedCircleItem(item: CircleItem, circle: CircleName): CircleItem {
  return { ...item, circle }
}

export const relationshipLimit = 3
export const relationshipVisitNote = 'Connections are held for this visit.'
export const relationshipCapMessage = 'Three connections are on the ground. Remove one to add another.'

export type PhraseRelationship = {
  id: string
  fromId: string
  toId: string
  kind: 'affect' | 'shape'
}

export function circleById(circle: CircleName) {
  const found = circles.find((entry) => entry.id === circle)
  if (!found) throw new Error('Choose Concern, Influence, or Control.')
  return found
}

export function relationshipKind(left: CircleName, right: CircleName): PhraseRelationship['kind'] | null {
  if (left === right) return null
  const pair = [left, right].sort().join(':')
  if (pair === 'concern:influence') return 'affect'
  if (pair === 'control:influence') return 'shape'
  return null
}

function samePair(link: PhraseRelationship, leftId: string, rightId: string) {
  return (link.fromId === leftId && link.toId === rightId) || (link.fromId === rightId && link.toId === leftId)
}

export function relationshipSentence(link: PhraseRelationship, items: readonly CircleItem[]): string | null {
  const from = items.find((item) => item.id === link.fromId)
  const to = items.find((item) => item.id === link.toId)
  if (!from || !to) return null
  if (relationshipKind(from.circle, to.circle) !== link.kind) return null
  if (link.kind === 'affect') {
    const influence = from.circle === 'influence' ? from : to
    const concern = from.circle === 'concern' ? from : to
    return `${influence.body} may affect ${concern.body}.`
  }
  const choice = from.circle === 'control' ? from : to
  const influence = from.circle === 'influence' ? from : to
  return `${choice.body} may shape ${influence.body}.`
}

export function proposeRelationship(
  from: CircleItem,
  to: CircleItem,
  existing: readonly PhraseRelationship[],
): { link: PhraseRelationship } | { error: string } {
  if (from.id === to.id) return { error: 'Choose another phrase.' }
  if (existing.length >= relationshipLimit) return { error: relationshipCapMessage }
  const kind = relationshipKind(from.circle, to.circle)
  if (!kind) return { error: 'A concern connects through an influence.' }
  if (existing.some((link) => samePair(link, from.id, to.id))) return { error: 'That connection is already on the ground.' }
  const id = [from.id, to.id].sort().join(':')
  return { link: { id, fromId: from.id, toId: to.id, kind } }
}

export function eligibleLinkPartners(
  item: CircleItem,
  items: readonly CircleItem[],
  links: readonly PhraseRelationship[],
): CircleItem[] {
  if (links.length >= relationshipLimit) return []
  return items.filter((other) => {
    if (other.id === item.id) return false
    const proposed = proposeRelationship(item, other, links)
    return !('error' in proposed)
  })
}

export function relationshipsForPhrase(links: readonly PhraseRelationship[], phraseId: string) {
  return links.filter((link) => link.fromId === phraseId || link.toId === phraseId)
}

export function withoutPhrase(links: readonly PhraseRelationship[], phraseId: string) {
  return links.filter((link) => link.fromId !== phraseId && link.toId !== phraseId)
}

export function reconcileRelationships(links: readonly PhraseRelationship[], items: readonly CircleItem[]) {
  return links.filter((link) => relationshipSentence(link, items) !== null)
}
