import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { considerHttp, imagesHttp, titlesHttp } from '../ai/http.ts'
import { discardVisualisationHttp, experienceProvenanceHttp, openVisualisationHttp } from '../ai/visualisation-http.ts'
import { authenticateAiUser, type AiSession } from '../ai/policy.ts'
import { imagePrompt, metaphorDirections } from '../providers/prompts.ts'
import { creativeDirectionSystemPrompt } from '../providers/image-prompt.ts'
import { directionsForCount } from '../providers/image-count.ts'
import { conceptCardQuestion, conceptRemainsVisible } from './library-carousel.ts'
import { titleSuggestionPrompt } from './title.ts'
import { updateConcept, emptyWorkspace } from './workspace.ts'
import { conceptOriginLabel, experienceConceptSource, readExperienceTopicRequest } from './visualisation-source.ts'
import { signVisualisationSnapshot, verifyVisualisationSnapshot, visualisationSnapshotSecret, type VisualisationSnapshot } from './visualisation-snapshot.ts'
import { shouldReleaseVisualisationSource } from './visualisation-lifecycle.ts'
import type { ImageSetResult } from '../providers/types.ts'
import type { ConceptRecord } from './types.ts'

const curiosityId = '11111111-1111-4111-8111-111111111111'
const experienceId = '22222222-2222-4222-8222-222222222222'
const otherExperienceId = '33333333-3333-4333-8333-333333333333'
const otherCuriosityId = '44444444-4444-4444-8444-444444444444'
const concernId = '55555555-5555-4555-8555-555555555555'
const influenceId = '66666666-6666-4666-8666-666666666666'
const controlId = '77777777-7777-4777-8777-777777777777'
const questionId = '88888888-8888-4888-8888-888888888888'
const userId = '99999999-9999-4999-8999-999999999999'

const snapshotSecret = 'test-visualisation-snapshot-secret-32'
const previousSnapshotSecret = process.env.VISUALISATION_SNAPSHOT_SECRET
process.env.VISUALISATION_SNAPSHOT_SECRET = snapshotSecret

const concernText = 'Whether a market narrative gathers force and reshapes expectations'
const influenceText = 'Test a market story for what could break it'
const controlText = 'Keep developing the parts of the app I enjoy'

function session(id: string | null): AiSession {
  return {
    auth: {
      getUser: async () => ({ data: { user: id ? { id } : null }, error: id ? null : { message: 'expired' } }),
    },
  }
}

function gate(id: string | null) {
  return { session: session(id), authenticate: authenticateAiUser }
}

function post(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function topicRequest(itemId: string, curiosity = curiosityId, experience = experienceId) {
  return { curiosityId: curiosity, experienceId: experience, itemId }
}

function tokenSource(token: string) {
  return { kind: 'experience-topic', token }
}

function conceptPayload(concept: string, token: string, curiosity = curiosityId) {
  return {
    conceptId: concept,
    curiosityId: curiosity,
    token,
    title: 'Held Force',
    consideredText: 'A held tension between expectation and evidence.',
    imagePath: `${userId}/${concept}/kept.webp`,
    imageModel: 'gpt-image-2.5-flare',
    promptVersion: 'image-eval-1',
  }
}

let signs = 0
function countingSign(snapshot: VisualisationSnapshot) {
  signs += 1
  return signVisualisationSnapshot(snapshot, visualisationSnapshotSecret())
}

async function openTopic(itemId: string, curiosity = curiosityId, experience = experienceId, user: string | null = userId) {
  return openVisualisationHttp(
    post('/api/visualise/source', topicRequest(itemId, curiosity, experience)),
    gate(user),
    loadTopic,
    captureSource,
    countingSign,
  )
}

const owned = new Map([
  [`${curiosityId}:${experienceId}:${concernId}`, { originalText: concernText, circle: 'concern' as const }],
  [`${curiosityId}:${experienceId}:${influenceId}`, { originalText: influenceText, circle: 'influence' as const }],
  [`${curiosityId}:${experienceId}:${controlId}`, { originalText: controlText, circle: 'control' as const }],
])

let topicLoads = 0
async function loadTopic(curiosity: string, experience: string, item: string) {
  topicLoads += 1
  return owned.get(`${curiosity}:${experience}:${item}`) ?? null
}

type HeldSource = {
  userId: string
  curiosityId: string
  experienceId: string | null
  itemId: string | null
  circle: 'concern' | 'influence' | 'control'
  originalText: string
}
const sources = new Map<string, HeldSource>()

async function captureSource(input: {
  userId: string
  curiosityId: string
  experienceId: string
  itemId: string
  circle: 'concern' | 'influence' | 'control'
  originalText: string
}) {
  const live = owned.get(`${input.curiosityId}:${input.experienceId}:${input.itemId}`)
  if (!live || input.userId !== userId) return null
  const sourceId = crypto.randomUUID()
  const stored: HeldSource = {
    userId: input.userId,
    curiosityId: input.curiosityId,
    experienceId: input.experienceId,
    itemId: input.itemId,
    circle: live.circle,
    originalText: live.originalText,
  }
  sources.set(sourceId, stored)
  return { sourceId, originalText: stored.originalText, circle: stored.circle }
}

async function locateSource(snapshot: VisualisationSnapshot) {
  const stored = sources.get(snapshot.sourceId)
  if (!stored) return 'absent' as const
  if (stored.userId !== snapshot.userId) return 'mismatch' as const
  const matches = stored.curiosityId === snapshot.curiosityId
    && stored.circle === snapshot.circle
    && stored.originalText === snapshot.originalText
  return matches ? 'match' as const : 'mismatch' as const
}

async function confirmSource(snapshot: VisualisationSnapshot) {
  return await locateSource(snapshot) === 'match'
}

let providerCalls = 0
async function consider(original: string) {
  providerCalls += 1
  return { proposal: `Direction for ${original}` }
}

async function loadQuestion(id: string, curiosity: string) {
  return id === questionId && curiosity === curiosityId ? 'When should the garden stay a question?' : null
}

const imageCalls: { question?: string; noun?: string; direction?: string }[] = []
async function interpret(considered: string, _signal?: AbortSignal, direction?: string, question?: string, noun?: 'question' | 'topic'): Promise<ImageSetResult> {
  providerCalls += 1
  imageCalls.push({ question, noun, direction })
  return {
    source: 'openai',
    notice: considered,
    candidates: [],
    reportedCostUsd: 0,
    stoppedBecause: 'complete',
    model: 'gpt-image-2.5-flare',
    promptVersion: 'image-eval-1',
  }
}

const savedKey = process.env.OPENAI_API_KEY
const savedText = process.env.OPENAI_TEXT_MODEL
const savedModel = process.env.OPENAI_MODEL
process.env.OPENAI_API_KEY = 'test-key'
process.env.OPENAI_TEXT_MODEL = 'gpt-test'
delete process.env.OPENAI_MODEL

const signedOut = await openTopic(concernId, curiosityId, experienceId, null)
assert.equal(signedOut.status, 401)
assert.equal(providerCalls, 0)
assert.equal(topicLoads, 0)
assert.equal(signs, 0)

const invalid = await openVisualisationHttp(post('/api/visualise/source', { curiosityId: 'not-an-id', experienceId, itemId: concernId }), gate(userId), loadTopic, captureSource, countingSign)
assert.equal(invalid.status, 400)
assert.equal(providerCalls, 0)
assert.equal(topicLoads, 0)
assert.equal(signs, 0)

const otherExperience = await openTopic(concernId, curiosityId, otherExperienceId)
assert.equal(otherExperience.status, 404)
assert.equal(providerCalls, 0)
assert.equal(signs, 0)

const otherCuriosity = await openTopic(concernId, otherCuriosityId, experienceId)
assert.equal(otherCuriosity.status, 404)
assert.equal(providerCalls, 0)
assert.equal(signs, 0)

const foreignTopic = await openTopic('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
assert.equal(foreignTopic.status, 404)
assert.equal(providerCalls, 0)
assert.equal(signs, 0)

const openedTokens = new Map<string, string>()
const openedSources = new Map<string, string>()
for (const itemId of [concernId, influenceId, controlId]) {
  const response = await openTopic(itemId)
  assert.equal(response.status, 200)
  const body = await response.json() as { token: string; sourceId: string; originalText: string; circle: string }
  assert.equal(body.originalText, owned.get(`${curiosityId}:${experienceId}:${itemId}`)?.originalText)
  assert.equal(sources.get(body.sourceId)?.originalText, body.originalText)
  assert.equal(sources.get(body.sourceId)?.circle, body.circle)
  openedTokens.set(itemId, body.token)
  openedSources.set(itemId, body.sourceId)
}
assert.equal(signs, 3)
assert.equal(providerCalls, 0)
const loadsAfterOpen = topicLoads

owned.set(`${curiosityId}:${experienceId}:${concernId}`, { originalText: 'A later edit of the concern', circle: 'influence' })
const concernToken = openedTokens.get(concernId) ?? ''
const afterMove = await considerHttp(post('/api/consider', { source: tokenSource(concernToken) }), gate(userId), consider, loadQuestion, undefined, confirmSource)
assert.equal(afterMove.status, 200)
const movedBody = await afterMove.json() as { proposal: string }
assert.equal(movedBody.proposal, `Direction for ${concernText}`)
assert.equal(movedBody.proposal.includes('A later edit of the concern'), false)
assert.equal(topicLoads, loadsAfterOpen)
assert.equal(providerCalls, 1)

const unsigned = await considerHttp(post('/api/consider', { source: { kind: 'experience-topic', curiosityId, experienceId, itemId: concernId, originalText: 'A forged topic' } }), gate(userId), consider, loadQuestion)
assert.equal(unsigned.status, 400)
assert.equal(providerCalls, 1)

const flipped = `${concernToken.slice(0, -1)}${concernToken.endsWith('a') ? 'b' : 'a'}`
const tampered = await considerHttp(post('/api/consider', { source: tokenSource(flipped) }), gate(userId), consider, loadQuestion)
assert.equal(tampered.status, 400)
assert.equal(providerCalls, 1)

const [payload, signature] = concernToken.split('.')
const rewritten = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { originalText: string; circle: string }
rewritten.originalText = 'A forged topic the browser wrote'
rewritten.circle = 'control'
const forgedToken = `${Buffer.from(JSON.stringify(rewritten)).toString('base64url')}.${signature}`
const forgedConsider = await considerHttp(post('/api/consider', { source: tokenSource(forgedToken) }), gate(userId), consider, loadQuestion)
assert.equal(forgedConsider.status, 400)
assert.equal(providerCalls, 1)

const garden = await considerHttp(post('/api/consider', { questionId, curiosityId }), gate(userId), consider, loadQuestion)
assert.equal(garden.status, 200)
const gardenBody = await garden.json() as { proposal: string }
assert.equal(gardenBody.proposal, 'Direction for When should the garden stay a question?')
assert.equal(providerCalls, 2)

const forgedImage = await imagesHttp(post('/api/images', {
  consideredText: 'A held tension between expectation and evidence.',
  originalText: 'A forged topic the server must ignore.',
  direction: 'tension',
  source: tokenSource(openedTokens.get(influenceId) ?? ''),
}), gate(userId), interpret, undefined, confirmSource)
assert.equal(forgedImage.status, 200)
assert.equal(imageCalls.at(-1)?.question, influenceText)
assert.equal(imageCalls.at(-1)?.noun, 'topic')
assert.equal(imageCalls.at(-1)?.direction, 'tension')
assert.equal(topicLoads, loadsAfterOpen)

const rejectedImage = await imagesHttp(post('/api/images', {
  consideredText: 'A held tension between expectation and evidence.',
  direction: 'trace',
  source: tokenSource(flipped),
}), gate(userId), interpret)
assert.equal(rejectedImage.status, 400)
assert.equal(imageCalls.length, 1)
assert.equal(providerCalls, 3)

for (const direction of ['tension', 'trace', 'scale', 'relation']) {
  const response = await imagesHttp(post('/api/images', {
    consideredText: 'A held tension between expectation and evidence.',
    direction,
    source: tokenSource(openedTokens.get(controlId) ?? ''),
  }), gate(userId), interpret, undefined, confirmSource)
  assert.equal(response.status, 200)
  assert.equal(imageCalls.at(-1)?.direction, direction)
  assert.equal(imageCalls.at(-1)?.question, controlText)
  assert.equal(imageCalls.at(-1)?.noun, 'topic')
}

const gardenImage = await imagesHttp(post('/api/images', {
  consideredText: 'A held tension between expectation and evidence.',
  originalText: 'When should the garden stay a question?',
  direction: 'scale',
}), gate(userId), interpret)
assert.equal(gardenImage.status, 200)
assert.equal(imageCalls.at(-1)?.question, 'When should the garden stay a question?')
assert.equal(imageCalls.at(-1)?.noun, 'question')
assert.equal(topicLoads, loadsAfterOpen)

const callsBeforeTitles = providerCalls
const titleFetches: string[] = []
const originalFetch = globalThis.fetch
globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
  titleFetches.push(String(init?.body ?? ''))
  return new Response(JSON.stringify({
    choices: [{ finish_reason: 'stop', message: { content: '{"titles":["Kindness","Gentle Guidance","Clear Paths"]}' } }],
  }), { status: 200, headers: { 'content-type': 'application/json' } })
}) as typeof fetch

const rejectedTitles = await titlesHttp(post('/api/titles', {
  consideredText: 'A held tension between expectation and evidence.',
  metaphor: 'Begin from two concrete forces in the same frame. Neither wins.',
  imageSrc: 'data:image/webp;base64,aaaa',
  questions: [{ originalText: 'A forged topic the server must ignore.', consideredText: null }],
  source: tokenSource(flipped),
}), gate(userId))
assert.equal(rejectedTitles.status, 400)
assert.equal(titleFetches.length, 0)
assert.equal(providerCalls, callsBeforeTitles)

const topicTitles = await titlesHttp(post('/api/titles', {
  consideredText: 'A held tension between expectation and evidence.',
  metaphor: 'Begin from two concrete forces in the same frame. Neither wins.',
  imageSrc: null,
  questions: [{ originalText: 'A forged topic the server must ignore.', consideredText: null }],
  source: tokenSource(concernToken),
}), gate(userId), undefined, confirmSource)
assert.equal(topicTitles.status, 200)
assert.equal(titleFetches.length, 1)
assert.equal(titleFetches[0].includes(concernText), true)
assert.equal(titleFetches[0].includes('Source topic:'), true)
assert.equal(titleFetches[0].includes('A forged topic the server must ignore.'), false)
assert.equal(titleFetches[0].includes('A later edit of the concern'), false)
assert.equal(titleFetches[0].includes('source topic'), true)
assert.equal(topicLoads, loadsAfterOpen)
globalThis.fetch = originalFetch

const conceptId = '12121212-1212-4121-8121-121212121212'
const otherConceptId = '13131313-1313-4131-8131-131313131313'
const topicConceptId = '14141414-1414-4141-8141-141414141414'
const experienceConceptId = '15151515-1515-4151-8151-151515151515'
const concernSourceId = openedSources.get(concernId) ?? ''
const concernSource = sources.get(concernSourceId)
assert.ok(concernSource)
const kept: { conceptId?: string; circle?: string; originalText?: string; experienceId?: string | null; itemId?: string | null }[] = []
let saveCalls = 0
const savedBySource = new Map<string, { conceptId?: string; circle?: string; originalText?: string; experienceId?: string | null; itemId?: string | null }>()
async function copySource(input: { conceptId: string; sourceId: string; title: string; imagePath: string }) {
  saveCalls += 1
  assert.equal(input.title, 'Held Force')
  assert.equal(input.imagePath, `${userId}/${input.conceptId}/kept.webp`)
  const prior = savedBySource.get(input.sourceId)
  if (prior) {
    if (prior.conceptId === input.conceptId) return prior
    return { error: 'that visualisation has already been saved' }
  }
  const source = sources.get(input.sourceId)
  if (!source || source.userId !== userId) return { error: 'that visualisation source is not available' }
  const row = {
    conceptId: input.conceptId,
    circle: source.circle,
    originalText: source.originalText,
    experienceId: source.experienceId,
    itemId: source.itemId,
  }
  savedBySource.set(input.sourceId, row)
  kept.push(row)
  return row
}

const movedSave = await experienceProvenanceHttp(post('/api/visualise/provenance', {
  ...conceptPayload(conceptId, concernToken),
  originalText: 'A forged topic the browser wrote',
  circle: 'control',
}), gate(userId), {
  locateSource,
  save: copySource,
})
assert.equal(movedSave.status, 200)
assert.equal(kept[0]?.originalText, concernText)
assert.equal(kept[0]?.circle, 'concern')
assert.equal(kept[0]?.itemId, concernId)
assert.equal(kept[0]?.experienceId, experienceId)

const retrySave = await experienceProvenanceHttp(post('/api/visualise/provenance', conceptPayload(conceptId, concernToken)), gate(userId), {
  locateSource,
  save: copySource,
})
assert.equal(retrySave.status, 200)
assert.equal(kept.length, 1)
const reusedSave = await experienceProvenanceHttp(post('/api/visualise/provenance', conceptPayload(otherConceptId, concernToken)), gate(userId), {
  locateSource,
  save: copySource,
})
assert.equal(reusedSave.status, 400)
assert.equal(kept.length, 1)

const influenceSource = sources.get(openedSources.get(influenceId) ?? '')
assert.ok(influenceSource)
influenceSource.itemId = null
const topicDeletedSave = await experienceProvenanceHttp(post('/api/visualise/provenance', conceptPayload(topicConceptId, openedTokens.get(influenceId) ?? '')), gate(userId), {
  locateSource,
  save: copySource,
})
assert.equal(topicDeletedSave.status, 200)
assert.equal(kept[1]?.originalText, influenceText)
assert.equal(kept[1]?.circle, 'influence')
assert.equal(kept[1]?.experienceId, experienceId)
assert.equal(kept[1]?.itemId, null)

const controlSource = sources.get(openedSources.get(controlId) ?? '')
assert.ok(controlSource)
controlSource.experienceId = null
controlSource.itemId = null
const experienceDeletedSave = await experienceProvenanceHttp(post('/api/visualise/provenance', conceptPayload(experienceConceptId, openedTokens.get(controlId) ?? '')), gate(userId), {
  locateSource,
  save: copySource,
})
assert.equal(experienceDeletedSave.status, 200)
assert.equal(kept[2]?.originalText, controlText)
assert.equal(kept[2]?.circle, 'control')
assert.equal(kept[2]?.experienceId, null)
assert.equal(kept[2]?.itemId, null)

const callsBeforeRejection = saveCalls
const rejectedSave = await experienceProvenanceHttp(post('/api/visualise/provenance', conceptPayload(conceptId, forgedToken)), gate(userId), {
  locateSource,
  save: copySource,
})
assert.equal(rejectedSave.status, 400)
assert.equal(saveCalls, callsBeforeRejection)

const stolen = { ...concernSource, userId: '88888888-8888-4888-8888-888888888888' }
sources.set(concernSourceId, stolen)
const otherUser = await experienceProvenanceHttp(post('/api/visualise/provenance', conceptPayload(conceptId, concernToken)), gate(userId), {
  locateSource,
  save: copySource,
})
assert.equal(otherUser.status, 400)
assert.equal(saveCalls, callsBeforeRejection)
sources.set(concernSourceId, concernSource)

const otherCuriositySave = await experienceProvenanceHttp(post('/api/visualise/provenance', conceptPayload(otherConceptId, concernToken, otherCuriosityId)), gate(userId), {
  locateSource,
  save: copySource,
})
assert.equal(otherCuriositySave.status, 400)
assert.equal(saveCalls, callsBeforeRejection)

sources.delete(concernSourceId)
const retryAfterRelease = await experienceProvenanceHttp(post('/api/visualise/provenance', conceptPayload(conceptId, concernToken)), gate(userId), {
  locateSource,
  save: copySource,
})
assert.equal(retryAfterRelease.status, 200)
const releasedBody = await retryAfterRelease.json() as { originalText?: string; circle?: string }
assert.equal(releasedBody.originalText, concernText)
assert.equal(releasedBody.circle, 'concern')
assert.equal(kept.length, 3)
const otherAfterRelease = await experienceProvenanceHttp(post('/api/visualise/provenance', conceptPayload(otherConceptId, concernToken)), gate(userId), {
  locateSource,
  save: copySource,
})
assert.equal(otherAfterRelease.status, 400)
assert.equal(kept.length, 3)

const missingSourceId = '16161616-1616-4161-8161-161616161616'
const missingToken = signVisualisationSnapshot({
  sourceId: missingSourceId,
  userId,
  curiosityId,
  experienceId,
  itemId: concernId,
  circle: 'concern',
  originalText: concernText,
}, snapshotSecret)
assert.ok(missingToken)
const missingConceptId = '17171717-1717-4171-8171-171717171717'
const missingSave = await experienceProvenanceHttp(post('/api/visualise/provenance', conceptPayload(missingConceptId, missingToken)), gate(userId), {
  locateSource,
  save: copySource,
})
assert.equal(missingSave.status, 400)
assert.equal(kept.some((row) => row.conceptId === missingConceptId), false)

let released = ''
const closed = await discardVisualisationHttp(post('/api/visualise/source', { token: concernToken }), gate(userId), undefined, async (sourceId, owner) => {
  released = `${owner}:${sourceId}`
  return true
})
assert.equal(closed.status, 200)
assert.equal(released, `${userId}:${concernSourceId}`)
const expiredToken = signVisualisationSnapshot({
  sourceId: concernSourceId,
  userId,
  curiosityId,
  experienceId,
  itemId: concernId,
  circle: 'concern',
  originalText: concernText,
}, snapshotSecret, Date.now() - 8 * 24 * 60 * 60 * 1000)
assert.equal(expiredToken === null, false)
assert.equal(verifyVisualisationSnapshot(expiredToken ?? '', snapshotSecret), null)
assert.equal(verifyVisualisationSnapshot(concernToken, 'another-test-visualisation-secret-32'), null)
assert.equal(concernToken.includes(snapshotSecret), false)
delete process.env.VISUALISATION_SNAPSHOT_SECRET
assert.equal(visualisationSnapshotSecret(), null)
assert.equal(signVisualisationSnapshot({
  sourceId: concernSourceId,
  userId,
  curiosityId,
  experienceId,
  itemId: concernId,
  circle: 'concern',
  originalText: concernText,
}, null), null)
process.env.VISUALISATION_SNAPSHOT_SECRET = snapshotSecret

const gardenPrompt = titleSuggestionPrompt({
  consideredText: 'A held tension.',
  metaphor: 'Trace',
  questions: [{ originalText: 'When should the garden stay a question?', consideredText: null }],
  sawImage: false,
})
assert.equal(gardenPrompt.includes('Source questions:'), true)
assert.equal(gardenPrompt.includes('source questions'), true)
assert.equal(gardenPrompt.includes('Source topic:'), false)

const topicPrompt = imagePrompt(concernText, 'A held tension.', metaphorDirections[0].instruction, 'topic')
const gardenPromptImage = imagePrompt(concernText, 'A held tension.', metaphorDirections[0].instruction)
assert.equal(topicPrompt.includes(`Topic: "${concernText}"`), true)
assert.equal(topicPrompt.includes('interprets the topic below'), true)
assert.equal(gardenPromptImage.includes(`Question: "${concernText}"`), true)
assert.equal(gardenPromptImage.includes('interprets the question below'), true)
assert.equal(gardenPromptImage.includes('Topic:'), false)
assert.equal(creativeDirectionSystemPrompt.includes('Do not describe a finished picture.'), true)
assert.equal(creativeDirectionSystemPrompt.includes('Leave the choice of visual metaphor open'), true)
assert.deepEqual(directionsForCount(1).map((direction) => direction.id), ['tension'])
assert.deepEqual(directionsForCount(2).map((direction) => direction.id), ['tension', 'trace'])
assert.deepEqual(directionsForCount(4).map((direction) => direction.id), ['tension', 'trace', 'scale', 'relation'])
assert.deepEqual(metaphorDirections.map((direction) => direction.label), ['Tension', 'Trace', 'Scale', 'Relation'])

assert.equal('error' in readExperienceTopicRequest({ kind: 'garden' }), true)
const parsed = readExperienceTopicRequest({ kind: 'experience-topic', ...topicRequest(controlId) })
assert.equal('error' in parsed, false)

const savedSource = experienceConceptSource({
  linkId: 'abababab-abab-4bab-8bab-abababababab',
  curiosityId,
  experienceId,
  itemId: concernId,
  circle: 'concern',
  originalText: concernText,
})
assert.ok(savedSource)
assert.equal(conceptOriginLabel(savedSource.circle), 'Experience · Concern')
assert.equal(conceptOriginLabel('influence'), 'Experience · Influence')
assert.equal(conceptOriginLabel('control'), 'Experience · Control')

const liveTopic = { circle: 'influence' as const, originalText: 'A later edit' }
assert.equal(savedSource.circle, 'concern')
assert.equal(savedSource.originalText, concernText)
assert.notEqual(savedSource.circle, liveTopic.circle)
assert.notEqual(savedSource.originalText, liveTopic.originalText)

const experienceConcept: ConceptRecord = {
  id: 'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd',
  title: 'Held Force',
  imageSrc: 'data:image/webp;base64,aaaa',
  imagePath: null,
  imageLabel: 'Tension',
  imageSource: 'openai',
  model: 'gpt-image-2.5-flare',
  promptVersion: 'image-eval-1',
  forConsideredText: 'A held tension between expectation and evidence.',
  anchorQuestionId: null,
  questionIds: [],
  sources: [],
  experienceSource: savedSource,
  createdAt: '2026-11-24T00:00:00.000Z',
  updatedAt: '2026-11-24T00:00:00.000Z',
}
assert.equal(conceptCardQuestion(experienceConcept, [{ id: questionId, originalText: 'A garden question' }]), concernText)
assert.equal(conceptRemainsVisible(experienceConcept, new Map([[questionId, 'discarded']])), true)
const renamed = updateConcept({ ...emptyWorkspace(), concepts: [experienceConcept] }, experienceConcept.id, 'Quiet Force', [])
assert.equal(renamed.concepts[0].title, 'Quiet Force')
assert.equal(renamed.concepts[0].experienceSource?.originalText, concernText)
assert.equal(renamed.concepts[0].experienceSource?.circle, 'concern')
assert.deepEqual(renamed.concepts[0].questionIds, [])

const store = readFileSync(new URL('./store.ts', import.meta.url), 'utf8')
assert.equal(store.includes('isExperienceSource'), true)
assert.equal(store.includes('concept.experienceSource ? true'), true)

const migration = readFileSync(new URL('../../supabase/migrations/20261124190000_concept_experience_sources.sql', import.meta.url), 'utf8')
assert.equal(migration.includes('create table public.concept_experience_sources'), true)
assert.equal(migration.includes('on delete cascade'), true)
assert.equal(migration.includes('on delete set null (experience_id)'), true)
assert.equal(migration.includes('on delete set null (item_id)'), true)
assert.equal(migration.includes("circle in ('concern', 'influence', 'control')"), true)
assert.equal(migration.includes('char_length(original_text_snapshot) between 1 and 240'), true)
assert.equal(migration.includes('create table public.experience_visualisation_sources'), true)
assert.equal(migration.includes('save_experience_visualisation_provenance'), true)
assert.ok(migration.indexOf('create table public.concept_experience_sources') < migration.indexOf('create or replace function public.save_experience_visualisation_provenance'))
assert.equal(migration.includes('check_function_bodies'), false)
assert.equal(migration.includes('origin_source_id uuid not null'), true)
assert.equal(migration.includes('new.created_at := pg_catalog.now()'), true)
assert.equal(migration.includes('clear_experience_visualisation_links'), true)
assert.equal(migration.includes('security definer'), true)
assert.equal(migration.includes('for update'), true)
assert.equal(/create policy [^;]*\bfor update\b/i.test(migration), false)
assert.equal(migration.includes('grant select, insert, delete on table public.experience_visualisation_sources to authenticated'), true)
assert.equal(migration.includes('grant select on table public.concept_experience_sources to authenticated'), true)
assert.equal(migration.includes('grant insert on table public.concept_experience_sources'), false)
assert.equal(migration.includes('concept_experience_sources_delete'), false)
assert.equal(migration.includes('auth.uid()'), true)
assert.equal(migration.includes('references public.concept_questions'), false)
assert.equal(migration.includes('insert into public.concept_questions'), false)

const concepts = readFileSync(new URL('./supabase-concepts.ts', import.meta.url), 'utf8')
const updater = concepts.slice(concepts.indexOf('export async function updateStoredConcept'))
assert.equal(updater.includes('concept_experience_sources'), false)
assert.equal(concepts.includes("from('concept_experience_sources')"), true)
assert.equal(concepts.includes('token: snapshotToken'), true)
assert.equal(concepts.includes('ownedTopicForSave'), false)
const experienceSave = concepts.slice(concepts.indexOf('if (concept.experienceSource)'), concepts.indexOf("const inserted = await supabase.from('concepts').insert"))
assert.equal(experienceSave.includes(".from('concepts').insert"), false)
assert.equal(experienceSave.includes('token: snapshotToken'), true)
assert.equal(experienceSave.includes('title: concept.title.trim()'), true)
assert.equal(experienceSave.includes('imagePath: path'), true)
assert.equal(experienceSave.includes('originalText'), false)
assert.equal(experienceSave.includes('circle'), false)
const gardenSave = concepts.slice(concepts.indexOf("const inserted = await supabase.from('concepts').insert"))
assert.equal(gardenSave.includes("from('concept_questions')"), true)
assert.equal(concepts.includes("error.code === '42P01'"), true)
assert.equal(concepts.includes("error.code === 'PGRST205'"), true)

const clearing = readFileSync(new URL('../../components/studio/experience-clearing.tsx', import.meta.url), 'utf8')
const region = clearing.slice(clearing.indexOf('{circles.map'), clearing.indexOf('{relationshipVisitNote}'))
assert.equal(region.includes('Visualise'), true)
assert.equal(region.includes('ImagePlus'), true)
assert.equal(clearing.includes('fetch('), false)
assert.equal(clearing.includes('/api/'), false)
assert.equal(clearing.includes('setVisualisingId(null)'), true)
assert.equal(clearing.includes('Give this topic a visual form.'), false)

const overlay = readFileSync(new URL('../../components/studio/experience-visualise.tsx', import.meta.url), 'utf8')
assert.equal(overlay.includes('Give this topic a visual form.'), true)
assert.equal(overlay.includes('Back to this topic'), true)
assert.equal(overlay.includes('ExperienceTopicVisualisation'), true)
assert.equal(overlay.includes("method: 'DELETE'"), true)
assert.equal(overlay.includes('keepalive'), false)
assert.equal(overlay.includes('onSavingChange={noteSaving}'), true)
assert.equal(overlay.includes('shouldReleaseVisualisationSource'), true)
assert.equal(overlay.includes('disabled={saving}'), true)
assert.equal(overlay.includes('releasedRef.current = false'), true)
assert.equal(overlay.includes('Promise<void> | void'), false)
assert.equal(overlay.includes('(concept: ConceptRecord) => Promise<void>'), true)
assert.equal(shouldReleaseVisualisationSource({ saving: true, alreadyReleased: false }), false)
assert.equal(shouldReleaseVisualisationSource({ saving: false, alreadyReleased: false }), true)
assert.equal(shouldReleaseVisualisationSource({ saving: false, alreadyReleased: true }), false)

const stage = readFileSync(new URL('../../components/studio/visualise-stage.tsx', import.meta.url), 'utf8')
assert.equal(stage.includes('onSavingChange?.(true)'), true)
assert.equal(stage.includes('onSavingChange?.(false)'), true)
assert.equal(stage.includes('originalText: question.originalText'), true)
assert.equal((stage.match(/<textarea/g) ?? []).length, 1)
assert.equal(stage.includes('kind: \'experience-topic\''), true)
assert.equal(stage.includes('Back to this topic'), true)
assert.equal(stage.includes('.from(\'questions\')'), false)

const screen = readFileSync(new URL('../../components/studio/experience-screen.tsx', import.meta.url), 'utf8')
assert.equal(screen.includes('onRecordConcept'), true)
assert.equal(screen.includes('await account.write'), true)
const library = readFileSync(new URL('../../components/studio/library-view.tsx', import.meta.url), 'utf8')
assert.equal(library.includes('conceptOriginLabel'), true)
const editor = readFileSync(new URL('../../components/studio/concept-editor.tsx', import.meta.url), 'utf8')
assert.equal(editor.includes('Original topic'), true)
assert.equal(editor.includes('Original question'), true)

const sourceRoute = readFileSync(new URL('../../app/api/visualise/source/route.ts', import.meta.url), 'utf8')
assert.equal(sourceRoute.includes('loadOwnedExperienceTopic'), true)
assert.equal(sourceRoute.includes('captureExperienceVisualisationSource'), true)
const provenanceFile = readFileSync(new URL('./experience-provenance.ts', import.meta.url), 'utf8')
assert.equal(provenanceFile.includes('body'), false)
assert.equal(provenanceFile.includes('save_experience_visualisation_provenance'), true)
assert.equal(provenanceFile.includes('p_source_id: input.sourceId'), true)
assert.equal(provenanceFile.includes('p_title: input.title'), true)
assert.equal(provenanceFile.includes('original_text_snapshot'), true)
const signer = readFileSync(new URL('./visualisation-snapshot.ts', import.meta.url), 'utf8')
assert.equal(signer.includes('randomBytes'), false)
assert.equal(signer.includes('VISUALISATION_SNAPSHOT_SECRET'), true)
assert.equal(signer.includes('visualisationSnapshotTtlSeconds'), true)
const sourceFile = readFileSync(new URL('./experience-visualisation-source.ts', import.meta.url), 'utf8')
assert.equal(sourceFile.includes('service_role'), false)
assert.equal(sourceFile.includes(".from('experience_visualisation_sources')"), true)
assert.equal(sourceFile.includes(".from('experience_circle_items')"), false)
assert.equal(sourceFile.includes('original_text_snapshot'), true)
for (const route of ['../../app/api/consider/route.ts', '../../app/api/images/route.ts', '../../app/api/titles/route.ts']) {
  const file = readFileSync(new URL(route, import.meta.url), 'utf8')
  assert.equal(file.includes('loadOwnedExperienceTopic'), false)
}
const loader = readFileSync(new URL('./owned-experience-topic.ts', import.meta.url), 'utf8')
assert.equal(loader.includes(".from('experiences')"), true)
assert.equal(loader.includes(".eq('curiosity_id', curiosityId)"), true)
assert.equal(loader.includes(".from('experience_circle_items')"), true)
assert.equal(loader.includes(".eq('experience_id', experienceId)"), true)
assert.equal(loader.includes('service_role'), false)

if (savedKey === undefined) delete process.env.OPENAI_API_KEY
else process.env.OPENAI_API_KEY = savedKey
if (savedText === undefined) delete process.env.OPENAI_TEXT_MODEL
else process.env.OPENAI_TEXT_MODEL = savedText
if (savedModel === undefined) delete process.env.OPENAI_MODEL
else process.env.OPENAI_MODEL = savedModel
if (previousSnapshotSecret === undefined) delete process.env.VISUALISATION_SNAPSHOT_SECRET
else process.env.VISUALISATION_SNAPSHOT_SECRET = previousSnapshotSecret

console.log('experience visualisation checks passed')
