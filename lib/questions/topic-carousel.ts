import { itemsByCircle, type CircleItem, type CircleName } from './experience-content.ts'
import { stepConceptIndex } from './library-carousel.ts'

export type TopicFocus = Record<CircleName, string | null>

export function initialTopicFocus(): TopicFocus {
  return { concern: null, influence: null, control: null }
}

export function topicIndex(items: readonly { id: string }[], focusId: string | null): number {
  if (items.length === 0) return -1
  const index = items.findIndex((item) => item.id === focusId)
  return index === -1 ? 0 : index
}

export function topicAt(items: readonly { id: string }[], focusId: string | null, direction: -1 | 1): string | null {
  if (items.length === 0) return null
  const next = stepConceptIndex(topicIndex(items, focusId), items.length, direction)
  return items[next]?.id ?? null
}

// A multi-item strip is [clone of last, ...real topics, clone of first].
// The clones are a visual wrap only; callers keep one real topic in the data.
export function topicIndexFromStrip(strip: number, count: number): { index: number; wrapped: boolean } {
  if (count <= 1) return { index: 0, wrapped: false }
  if (strip <= 0) return { index: count - 1, wrapped: true }
  if (strip >= count + 1) return { index: 0, wrapped: true }
  return { index: strip - 1, wrapped: false }
}

export function topicStrip(index: number, count: number): number {
  if (count <= 1) return 0
  return index + 1
}

export function topicWrapStrip(index: number, count: number, direction: -1 | 1): number | null {
  if (count <= 1) return null
  if (direction === 1 && index === count - 1) return count + 1
  if (direction === -1 && index === 0) return 0
  return null
}

export function focusTopic(focus: TopicFocus, circle: CircleName, id: string | null): TopicFocus {
  return { ...focus, [circle]: id }
}

export function focusAddedTopic(focus: TopicFocus, circle: CircleName, id: string): TopicFocus {
  return focusTopic(focus, circle, id)
}

export function focusAfterRemoval(
  focus: TopicFocus,
  removedId: string,
  previous: readonly CircleItem[],
  next: readonly CircleItem[],
): TopicFocus {
  const removed = previous.find((item) => item.id === removedId)
  if (!removed) return focus
  const before = itemsByCircle(previous)[removed.circle]
  const after = itemsByCircle(next)[removed.circle]
  const current = focus[removed.circle]
  if (current !== removedId && after.some((item) => item.id === current)) return focus
  const index = Math.max(0, before.findIndex((item) => item.id === removedId))
  const neighbor = after[Math.min(index, Math.max(after.length - 1, 0))]?.id ?? null
  return focusTopic(focus, removed.circle, neighbor)
}

export function focusMovedTopic(
  focus: TopicFocus,
  itemId: string,
  from: CircleName,
  to: CircleName,
  previous: readonly CircleItem[],
  next: readonly CircleItem[],
): TopicFocus {
  const cleared = focusAfterRemoval(focus, itemId, previous, next)
  return focusTopic(cleared, to, itemId)
}
