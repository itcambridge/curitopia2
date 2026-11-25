import type { AiEndpoint, AiSession } from './policy.ts'
import { readExperienceTopicRequest } from '../questions/visualisation-source.ts'
import {
  readSignedVisualisationSnapshot,
  signVisualisationSnapshot,
  visualisationSnapshotSecret,
  type VisualisationSnapshot,
} from '../questions/visualisation-snapshot.ts'
import type { CircleName } from '../questions/experience-content.ts'

type Gate = {
  session: AiSession
  authenticate: (endpoint: AiEndpoint, session: AiSession) => Promise<Response | { userId: string }>
}

type TopicLoader = (curiosityId: string, experienceId: string, itemId: string) => Promise<{ originalText: string; circle: CircleName } | null>

export type CapturedVisualisationSource = {
  sourceId: string
  originalText: string
  circle: CircleName
}

type SourceCapture = (input: {
  userId: string
  curiosityId: string
  experienceId: string
  itemId: string
  circle: CircleName
  originalText: string
}) => Promise<CapturedVisualisationSource | null>

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function signOwnedSnapshot(snapshot: VisualisationSnapshot) {
  return signVisualisationSnapshot(snapshot, visualisationSnapshotSecret())
}

export type ExperienceConceptSave = {
  conceptId: string
  sourceId: string
  title: string
  consideredText: string
  imagePath: string
  imageModel: string
  promptVersion: string
}

export async function openVisualisationHttp(
  request: Request,
  gate: Gate,
  loadTopic: TopicLoader,
  captureSource: SourceCapture,
  sign: (snapshot: VisualisationSnapshot) => string | null = signOwnedSnapshot,
) {
  const auth = await gate.authenticate('consider', gate.session)
  if (auth instanceof Response) return auth
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'The request could not be read.' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Choose a saved topic before asking for a creative direction.' }, { status: 400 })
  }
  const topic = readExperienceTopicRequest({ ...body, kind: 'experience-topic' })
  if ('error' in topic) return Response.json({ error: topic.error }, { status: 400 })
  const owned = await loadTopic(topic.curiosityId, topic.experienceId, topic.itemId)
  const originalText = owned?.originalText.trim() ?? ''
  if (!owned || !originalText) {
    return Response.json({ error: 'That topic is not in this experience. Nothing was sent.' }, { status: 404 })
  }
  const captured = await captureSource({
    userId: auth.userId,
    curiosityId: topic.curiosityId,
    experienceId: topic.experienceId,
    itemId: topic.itemId,
    circle: owned.circle,
    originalText,
  })
  if (!captured || !uuidPattern.test(captured.sourceId) || !captured.originalText.trim()) {
    return Response.json({ error: 'Visualisation could not be opened. Nothing was sent.' }, { status: 503 })
  }
  const snapshot: VisualisationSnapshot = {
    sourceId: captured.sourceId,
    userId: auth.userId,
    curiosityId: topic.curiosityId,
    experienceId: topic.experienceId,
    itemId: topic.itemId,
    circle: captured.circle,
    originalText: captured.originalText.trim(),
  }
  const token = sign(snapshot)
  if (!token) return Response.json({ error: 'Visualisation could not be opened. Nothing was sent.' }, { status: 503 })
  return Response.json({
    token,
    sourceId: snapshot.sourceId,
    originalText: snapshot.originalText,
    circle: snapshot.circle,
    curiosityId: snapshot.curiosityId,
    experienceId: snapshot.experienceId,
    itemId: snapshot.itemId,
  })
}

export type VisualisationSourcePlace = 'match' | 'mismatch' | 'absent'

type ProvenanceDeps = {
  readSnapshot?: (token: string, userId: string) => VisualisationSnapshot | null
  locateSource?: (snapshot: VisualisationSnapshot) => Promise<VisualisationSourcePlace>
  save: (input: ExperienceConceptSave) => Promise<{
    circle: VisualisationSnapshot['circle']
    originalText: string
    experienceId: string | null
    itemId: string | null
  } | { error: string }>
}

export async function experienceProvenanceHttp(request: Request, gate: Gate, deps: ProvenanceDeps) {
  const auth = await gate.authenticate('consider', gate.session)
  if (auth instanceof Response) return auth
  let body: {
    conceptId?: unknown
    curiosityId?: unknown
    token?: unknown
    title?: unknown
    consideredText?: unknown
    imagePath?: unknown
    imageModel?: unknown
    promptVersion?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'The request could not be read.' }, { status: 400 })
  }
  const conceptId = typeof body.conceptId === 'string' ? body.conceptId : ''
  const curiosityId = typeof body.curiosityId === 'string' ? body.curiosityId : ''
  const token = typeof body.token === 'string' ? body.token : ''
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const consideredText = typeof body.consideredText === 'string' ? body.consideredText.trim() : ''
  const imagePath = typeof body.imagePath === 'string' ? body.imagePath.trim() : ''
  const imageModel = typeof body.imageModel === 'string' ? body.imageModel.trim() : ''
  const promptVersion = typeof body.promptVersion === 'string' ? body.promptVersion.trim() : ''
  if (!uuidPattern.test(conceptId) || !uuidPattern.test(curiosityId) || !token || !title || title.length > 40 || !consideredText || consideredText.length > 2000 || !imageModel || imageModel.length > 80 || !promptVersion || promptVersion.length > 40) {
    return Response.json({ error: 'The visualisation source could not be verified. Nothing was kept.' }, { status: 400 })
  }
  if (imagePath !== `${auth.userId}/${conceptId}/${imagePath.split('/').at(-1)}` || !/\.(png|jpeg|jpg|webp)$/i.test(imagePath)) {
    return Response.json({ error: 'The visualisation source could not be verified. Nothing was kept.' }, { status: 400 })
  }
  const readSnapshot = deps.readSnapshot ?? readSignedVisualisationSnapshot
  const snapshot = readSnapshot(token, auth.userId)
  if (!snapshot || snapshot.curiosityId !== curiosityId) {
    return Response.json({ error: 'The visualisation source could not be verified. Nothing was kept.' }, { status: 400 })
  }
  const locateSource = deps.locateSource ?? (async (candidate: VisualisationSnapshot) => {
    const { locateVisualisationSource } = await import('@/lib/questions/experience-visualisation-source')
    return locateVisualisationSource(candidate)
  })
  const place = await locateSource(snapshot)
  if (place === 'mismatch') {
    return Response.json({ error: 'The visualisation source could not be verified. Nothing was kept.' }, { status: 400 })
  }
  const saved = await deps.save({
    conceptId,
    sourceId: snapshot.sourceId,
    title,
    consideredText,
    imagePath,
    imageModel,
    promptVersion,
  })
  if ('error' in saved) return Response.json({ error: saved.error }, { status: 400 })
  return Response.json({
    circle: saved.circle,
    originalText: saved.originalText,
    experienceId: saved.experienceId,
    itemId: saved.itemId,
  })
}

export async function discardVisualisationHttp(
  request: Request,
  gate: Gate,
  readSnapshot: (token: string, userId: string) => VisualisationSnapshot | null = readSignedVisualisationSnapshot,
  release: (sourceId: string, userId: string) => Promise<boolean> = async (sourceId, userId) => {
    const { releaseExperienceVisualisationSource } = await import('@/lib/questions/experience-visualisation-source')
    return releaseExperienceVisualisationSource(sourceId, userId)
  },
) {
  const auth = await gate.authenticate('consider', gate.session)
  if (auth instanceof Response) return auth
  let body: { token?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'The request could not be read.' }, { status: 400 })
  }
  const token = typeof body.token === 'string' ? body.token : ''
  const snapshot = token ? readSnapshot(token, auth.userId) : null
  if (!snapshot) return Response.json({ released: false }, { status: 200 })
  await release(snapshot.sourceId, auth.userId)
  return Response.json({ released: true })
}
