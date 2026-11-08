import { metaphorDirections } from './prompts.ts'
import type { MetaphorId } from './types.ts'

export const imageCounts = [1, 2, 4] as const

export type ImageCount = (typeof imageCounts)[number]

export const imageCountKey = 'curitopia-image-count'

export type ImageSlotStatus = 'waiting' | 'generating' | 'ready' | 'failed'

export type ImageSlot = {
  id: MetaphorId
  status: ImageSlotStatus
  error: string | null
}

export function parseImageCount(value: string | null): ImageCount {
  if (value === '2') return 2
  if (value === '4') return 4
  return 1
}

export function readImageCount(storage: Pick<Storage, 'getItem'> | null): ImageCount {
  if (!storage) return 1
  return parseImageCount(storage.getItem(imageCountKey))
}

export function writeImageCount(storage: Pick<Storage, 'setItem'>, count: ImageCount) {
  storage.setItem(imageCountKey, String(count))
}

export function directionsForCount(count: ImageCount) {
  return metaphorDirections.slice(0, count)
}

export function initialSlots(count: ImageCount): ImageSlot[] {
  return directionsForCount(count).map((direction, index) => ({
    id: direction.id,
    status: index === 0 ? 'generating' : 'waiting',
    error: null,
  }))
}

export function markSlot(slots: ImageSlot[], id: MetaphorId, status: ImageSlotStatus, error: string | null = null): ImageSlot[] {
  return slots.map((slot) => slot.id === id ? { ...slot, status, error: status === 'failed' ? error : null } : slot)
}

export const imageCountdownSeconds = 30

export function remainingImageSeconds(startedAt: number, now: number, total = imageCountdownSeconds): number {
  const elapsed = now - startedAt
  if (!Number.isFinite(elapsed) || elapsed <= 0) return total
  return Math.max(0, total - Math.floor(elapsed / 1000))
}

export function millisecondsUntilNextImageSecond(startedAt: number, now: number): number {
  const elapsed = now - startedAt
  if (!Number.isFinite(elapsed) || elapsed < 0) return 1000
  const into = elapsed % 1000
  return into === 0 ? 1000 : 1000 - into
}

export function imageCountdownCopy(remaining: number): string {
  return remaining > 0 ? 'Usually around 30 seconds. Sometimes quicker!' : 'Taking a little longer than usual…'
}

export function imageCountdownShowsNumber(remaining: number): boolean {
  return remaining > 0
}

export function nextImageCountdown(startedAt: number, now: number) {
  const remaining = remainingImageSeconds(startedAt, now)
  return {
    remaining,
    copy: imageCountdownCopy(remaining),
    showNumber: imageCountdownShowsNumber(remaining),
    waitMs: remaining === 0 ? 0 : millisecondsUntilNextImageSecond(startedAt, now),
  }
}
