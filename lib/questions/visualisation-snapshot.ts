import { createHmac, timingSafeEqual } from 'node:crypto'
import { circleName, type CircleName } from './experience-content.ts'

export type VisualisationSnapshot = {
  sourceId: string
  userId: string
  curiosityId: string
  experienceId: string
  itemId: string
  circle: CircleName
  originalText: string
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const minimumSecretLength = 32
const clockSkewSeconds = 60

// Seven days. The database refuses a source older than this, and the cleanup
// function removes those rows. An open visualisation is not expired sooner.
export const visualisationSnapshotTtlSeconds = 7 * 24 * 60 * 60

// The configured secret is the only key. A missing or short value signs nothing.
export function visualisationSnapshotSecret() {
  const configured = process.env.VISUALISATION_SNAPSHOT_SECRET?.trim() ?? ''
  if (configured.length < minimumSecretLength) return null
  return configured
}

function payloadFor(snapshot: VisualisationSnapshot, issuedAt: number) {
  const iat = Math.floor(issuedAt / 1000)
  return JSON.stringify({
    v: 1,
    iat,
    exp: iat + visualisationSnapshotTtlSeconds,
    sourceId: snapshot.sourceId,
    userId: snapshot.userId,
    curiosityId: snapshot.curiosityId,
    experienceId: snapshot.experienceId,
    itemId: snapshot.itemId,
    circle: snapshot.circle,
    originalText: snapshot.originalText,
  })
}

function signatureFor(payload: string, secret: string) {
  return createHmac('sha256', secret).update(`curitopia.visualisation-snapshot.v1\n${payload}`).digest('base64url')
}

export function signVisualisationSnapshot(snapshot: VisualisationSnapshot, secret: string | null, issuedAt = Date.now()) {
  if (!secret || secret.length < minimumSecretLength) return null
  const payload = Buffer.from(payloadFor(snapshot, issuedAt), 'utf8').toString('base64url')
  return `${payload}.${signatureFor(payload, secret)}`
}

export function verifyVisualisationSnapshot(token: string, secret: string | null, now = Date.now()): VisualisationSnapshot | null {
  if (!secret || secret.length < minimumSecretLength || !token) return null
  const split = token.split('.')
  if (split.length !== 2) return null
  const [payload, signature] = split
  if (!payload || !signature) return null
  const expected = signatureFor(payload, secret)
  const given = Buffer.from(signature)
  const actual = Buffer.from(expected)
  if (given.length !== actual.length || !timingSafeEqual(given, actual)) return null
  let parsed: Partial<VisualisationSnapshot> & { v?: unknown; iat?: unknown; exp?: unknown }
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<VisualisationSnapshot> & { v?: unknown; iat?: unknown; exp?: unknown }
  } catch {
    return null
  }
  if (parsed.v !== 1) return null
  if (typeof parsed.iat !== 'number' || typeof parsed.exp !== 'number') return null
  if (!Number.isInteger(parsed.iat) || !Number.isInteger(parsed.exp)) return null
  if (parsed.exp !== parsed.iat + visualisationSnapshotTtlSeconds) return null
  const nowSeconds = Math.floor(now / 1000)
  if (parsed.iat > nowSeconds + clockSkewSeconds) return null
  if (nowSeconds >= parsed.exp) return null
  const circle = typeof parsed.circle === 'string' ? circleName(parsed.circle) : null
  const originalText = typeof parsed.originalText === 'string' ? parsed.originalText.trim() : ''
  if (!circle || !originalText || originalText.length > 240) return null
  if (typeof parsed.sourceId !== 'string' || !uuidPattern.test(parsed.sourceId)) return null
  if (typeof parsed.userId !== 'string' || !uuidPattern.test(parsed.userId)) return null
  if (typeof parsed.curiosityId !== 'string' || !uuidPattern.test(parsed.curiosityId)) return null
  if (typeof parsed.experienceId !== 'string' || !uuidPattern.test(parsed.experienceId)) return null
  if (typeof parsed.itemId !== 'string' || !uuidPattern.test(parsed.itemId)) return null
  return {
    sourceId: parsed.sourceId,
    userId: parsed.userId,
    curiosityId: parsed.curiosityId,
    experienceId: parsed.experienceId,
    itemId: parsed.itemId,
    circle,
    originalText,
  }
}

export function readSignedVisualisationSnapshot(token: string, userId: string, secret = visualisationSnapshotSecret()) {
  const snapshot = verifyVisualisationSnapshot(token, secret)
  if (!snapshot || snapshot.userId !== userId) return null
  return snapshot
}

// Live ids are kept only while those rows still exist. The wording and circle
// always come from the snapshot taken when Visualise opened.
export function provenanceFromSnapshot(
  snapshot: VisualisationSnapshot,
  live: { experienceId: string | null; itemId: string | null },
) {
  const experienceId = live.experienceId === snapshot.experienceId ? snapshot.experienceId : null
  const itemId = experienceId && live.itemId === snapshot.itemId ? snapshot.itemId : null
  return {
    curiosityId: snapshot.curiosityId,
    experienceId,
    itemId,
    circle: snapshot.circle,
    originalText: snapshot.originalText,
  }
}
