import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { imagesHttp } from '../ai/http.ts'
import { authenticateAiUser, type AiSession } from '../ai/policy.ts'
import { shouldApplyReturnedImage, shouldStartNextImage } from './image-run.ts'
import { directionsForCount, imageCountdownCopy, imageCountKey, imageCountdownShowsNumber, imageProgressLabel, initialSlots, markSlot, millisecondsUntilNextImageSecond, nextImageCountdown, parseImageCount, readImageCount, remainingImageSeconds, writeImageCount } from './image-count.ts'
import { interpretQuestion } from './openai-images.ts'
import { imagePrompt, metaphorDirections } from './prompts.ts'

assert.equal(parseImageCount(null), 1)
assert.equal(parseImageCount('1'), 1)
assert.equal(parseImageCount('3'), 1)
assert.equal(parseImageCount('2'), 2)
assert.equal(parseImageCount('4'), 4)

const memory = new Map<string, string>()
const storage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value) },
}
assert.equal(readImageCount(null), 1)
assert.equal(readImageCount(storage), 1)
writeImageCount(storage, 4)
assert.equal(memory.get(imageCountKey), '4')
assert.equal(readImageCount(storage), 4)
writeImageCount(storage, 2)
assert.equal(readImageCount(storage), 2)

assert.deepEqual(directionsForCount(1).map((direction) => direction.id), ['tension'])
assert.deepEqual(directionsForCount(2).map((direction) => direction.id), ['tension', 'trace'])
assert.deepEqual(directionsForCount(4).map((direction) => direction.id), ['tension', 'trace', 'scale', 'relation'])

const started = initialSlots(4)
assert.deepEqual(started.map((slot) => slot.status), ['generating', 'waiting', 'waiting', 'waiting'])
const firstReady = markSlot(started, 'tension', 'ready')
const secondFailed = markSlot(markSlot(firstReady, 'trace', 'generating'), 'trace', 'failed', 'This image did not come back.')
assert.equal(secondFailed[0].status, 'ready')
assert.equal(secondFailed[0].error, null)
assert.equal(secondFailed[1].status, 'failed')
assert.equal(secondFailed[1].error, 'This image did not come back.')
assert.equal(secondFailed[2].status, 'waiting')
const retried = markSlot(secondFailed, 'trace', 'ready')
assert.equal(retried[1].status, 'ready')
assert.equal(retried[1].error, null)
assert.equal(retried[0].status, 'ready')

function progressLabels(slots: ReturnType<typeof initialSlots>) {
  return slots.map((slot, index) => imageProgressLabel(index + 1, slot.status))
}
const waiting = initialSlots(4).map((slot) => ({ ...slot, status: 'waiting' as const, error: null }))
assert.deepEqual(progressLabels(waiting), ['Image 1, waiting.', 'Image 2, waiting.', 'Image 3, waiting.', 'Image 4, waiting.'])
assert.deepEqual(progressLabels(initialSlots(1)), ['Image 1, generating.'])
assert.deepEqual(progressLabels(initialSlots(2)), ['Image 1, generating.', 'Image 2, waiting.'])
const imageOneReady = markSlot(waiting, 'tension', 'ready')
const imageTwoGenerating = markSlot(imageOneReady, 'trace', 'generating')
assert.deepEqual(progressLabels(imageTwoGenerating), ['Image 1, ready.', 'Image 2, generating.', 'Image 3, waiting.', 'Image 4, waiting.'])
const imageTwoReady = markSlot(imageTwoGenerating, 'trace', 'ready')
const imageThreeFailed = markSlot(markSlot(imageTwoReady, 'scale', 'generating'), 'scale', 'failed', 'This image did not come back.')
assert.equal(imageThreeFailed[2].status, 'failed')
assert.notEqual(imageProgressLabel(3, imageThreeFailed[2].status), imageProgressLabel(3, 'ready'))
const imageThreeRetried = markSlot(imageThreeFailed, 'scale', 'ready')
const imageFourReady = markSlot(markSlot(imageThreeRetried, 'relation', 'generating'), 'relation', 'ready')
assert.deepEqual(progressLabels(imageFourReady), ['Image 1, ready.', 'Image 2, ready.', 'Image 3, ready.', 'Image 4, ready.'])

const startedAt = 1_700_000_000_000
assert.equal(nextImageCountdown(startedAt, startedAt).remaining, 30)
assert.equal(nextImageCountdown(startedAt, startedAt + 999).remaining, 30)
assert.equal(nextImageCountdown(startedAt, startedAt + 1000).remaining, 29)
const at18 = nextImageCountdown(startedAt, startedAt + 18_000)
assert.equal(at18.remaining, 12)
assert.equal(at18.showNumber, true)
assert.equal(at18.copy, 'About 30 seconds')
assert.equal(imageCountdownShowsNumber(at18.remaining), true)
const at30 = nextImageCountdown(startedAt, startedAt + 30_000)
assert.equal(at30.remaining, 0)
assert.equal(at30.showNumber, false)
assert.equal(at30.waitMs, 0)
assert.equal(at30.copy, 'Taking a little longer than usual…')
assert.equal(imageCountdownCopy(1), 'About 30 seconds')
const overtime = nextImageCountdown(startedAt, startedAt + 45_000)
assert.equal(overtime.remaining, 0)
assert.equal(overtime.showNumber, false)
assert.equal(overtime.copy, 'Taking a little longer than usual…')
assert.equal(remainingImageSeconds(startedAt, startedAt + 120_000), 0)
assert.equal(remainingImageSeconds(startedAt, startedAt - 500), 30)
const secondStart = startedAt + 18_000
assert.equal(remainingImageSeconds(startedAt, secondStart), 12)
assert.equal(remainingImageSeconds(secondStart, secondStart), 30)
assert.equal(remainingImageSeconds(startedAt, secondStart + 5_000), 7)
assert.equal(remainingImageSeconds(secondStart, secondStart + 5_000), 25)
assert.equal(millisecondsUntilNextImageSecond(startedAt, startedAt + 18_200), 800)
assert.equal(millisecondsUntilNextImageSecond(startedAt, startedAt + 18_000), 1000)

const savedKey = process.env.OPENAI_API_KEY
let calls = 0
const originalFetch = globalThis.fetch
globalThis.fetch = async (_url, init) => {
  calls += 1
  const body = JSON.parse(String(init?.body)) as { n?: number; prompt?: string }
  assert.equal(body.n, 1)
  assert.equal(body.prompt?.includes('two concrete forces'), true)
  return new Response(JSON.stringify({ data: [{ b64_json: 'abc' }], usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200 })
}

try {
  process.env.OPENAI_API_KEY = 'test-not-a-real-key'
  const one = await interpretQuestion('How can someone be present among others and still be unreached?', undefined, 'tension')
  assert.equal(calls, 1)
  assert.equal(one.candidates.length, 1)
  assert.equal(one.candidates[0].id, 'tension')
  assert.equal(one.stoppedBecause, 'complete')

  calls = 0
  globalThis.fetch = async () => {
    calls += 1
    return new Response(JSON.stringify({ error: { message: 'unavailable' } }), { status: 500 })
  }
  const failed = await interpretQuestion('How can someone be present among others and still be unreached?', undefined, 'trace')
  assert.equal(calls, 1)
  assert.equal(failed.candidates.length, 0)
  assert.equal(failed.stoppedBecause, 'error')
  assert.equal(failed.notice.includes('Nothing was retried.'), true)

  delete process.env.OPENAI_API_KEY
  const demo = await interpretQuestion('How can someone be present among others and still be unreached?', undefined, 'scale')
  assert.equal(demo.candidates.length, 1)
  assert.equal(demo.candidates[0].id, 'scale')
  assert.equal(demo.source, 'demo')
} finally {
  globalThis.fetch = originalFetch
  if (savedKey === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = savedKey
}

function session(userId: string): AiSession {
  return { auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) } }
}

let seen: string | undefined
let seenQuestion = ''
let seenDirectionText = ''
const interpret = async (considered: string, _signal?: AbortSignal, direction?: string, question?: string) => {
  seen = direction
  seenQuestion = question ?? ''
  seenDirectionText = considered
  return {
    source: 'openai' as const,
    notice: 'checked',
    candidates: [],
    reportedCostUsd: 0,
    stoppedBecause: 'complete' as const,
    model: null,
    promptVersion: null,
  }
}
const gate = { session: session('image-count-user'), authenticate: authenticateAiUser }
const directed = await imagesHttp(new Request('http://localhost/api/images', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ consideredText: 'What remains unresolved?', direction: 'scale' }),
}), gate, interpret)
assert.equal(directed.status, 200)
assert.equal(seen, 'scale')
assert.equal(seenQuestion, '')
const withQuestion = await imagesHttp(new Request('http://localhost/api/images', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    consideredText: 'Hold the uncertainty between what is experienced and what may be true.',
    originalText: 'Is reality only the part we are able to notice?',
    direction: 'relation',
  }),
}), gate, interpret)
assert.equal(withQuestion.status, 200)
assert.equal(seen, 'relation')
assert.equal(seenQuestion, 'Is reality only the part we are able to notice?')
assert.equal(seenDirectionText, 'Hold the uncertainty between what is experienced and what may be true.')
const tooLongQuestion = await imagesHttp(new Request('http://localhost/api/images', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ consideredText: 'Hold the uncertainty.', originalText: 'x'.repeat(2001), direction: 'tension' }),
}), gate, interpret)
assert.equal(tooLongQuestion.status, 400)
assert.equal(seen, 'relation')
const rejected = await imagesHttp(new Request('http://localhost/api/images', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ consideredText: 'What remains unresolved?', direction: 'more' }),
}), gate, interpret)
assert.equal(rejected.status, 400)

assert.equal(shouldStartNextImage(true), true)
assert.equal(shouldStartNextImage(false), false)
assert.equal(shouldApplyReturnedImage(true), true)
assert.equal(shouldApplyReturnedImage(false), false)

let repeatedCalls = 0
const repeatable = async () => {
  repeatedCalls += 1
  return {
    source: 'openai' as const,
    notice: 'Made 1 image call.',
    candidates: [],
    reportedCostUsd: 2,
    stoppedBecause: 'complete' as const,
    model: 'gpt-image-2.5-flare',
    promptVersion: 'image-eval-1',
  }
}
const repeatGate = { session: session('repeat-image-user'), authenticate: authenticateAiUser }
const repeatRun = '55555555-5555-4555-8555-555555555555'
for (const direction of ['tension', 'trace', 'scale', 'relation']) {
  const response = await imagesHttp(new Request('http://localhost/api/images', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ consideredText: 'What remains unresolved?', direction, runId: repeatRun }),
  }), repeatGate, repeatable)
  assert.equal(response.status, 200)
}
assert.equal(repeatedCalls, 4)
const badRun = await imagesHttp(new Request('http://localhost/api/images', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ consideredText: 'What remains unresolved?', direction: 'tension', runId: 'not-a-run' }),
}), repeatGate, repeatable)
assert.equal(badRun.status, 400)
assert.equal(repeatedCalls, 4)

const view = readFileSync(new URL('../../components/studio/visualise-stage.tsx', import.meta.url), 'utf8')
assert.equal(view.includes('Preparing four images'), false)
assert.equal(view.includes('Visualising your idea'), true)
assert.equal(view.includes('Coming along nicely'), true)
assert.equal(view.includes("We're giving your question a visual form…"), false)
assert.equal(view.includes("showNumber ? 'Coming along nicely'"), false)
assert.equal(view.includes('imageCountdownCopy(remaining)'), true)
assert.equal(view.includes('imageCountdownShowsNumber(remaining)'), true)
assert.equal(view.includes('activeKey={`${slots[active].id}:${attempt}`}'), true)
assert.equal(view.includes('visibilitychange'), true)
assert.equal(view.includes('clearTimeout'), true)
assert.equal(view.includes('removeEventListener'), true)
const requestStart = view.indexOf('async function requestImage')
const requestBody = view.slice(requestStart, view.indexOf('async function askForImages', requestStart))
assert.equal(requestBody.indexOf('setImageAttempt') < requestBody.indexOf('await fetch'), true)
assert.equal(requestBody.includes('addImageCandidate'), true)
assert.equal(requestBody.includes('setTimeout'), false)
assert.equal(requestBody.includes('nextImageCountdown'), false)
assert.equal(view.includes('setSlots(null)'), true)
assert.equal(view.includes('imageAbort.current?.abort()'), true)
assert.equal(view.includes('Try this image again'), true)
assert.equal(view.includes('imageProgressLabel'), true)
assert.equal(view.includes('data-image-progress={slot.status}'), true)
assert.equal(view.includes('motion-safe:animate-pulse'), true)
assert.equal(view.includes('Image {index + 1} of {slots.length}'), false)
assert.equal(view.includes('Creating this image…'), false)
assert.equal(view.includes("role=\"img\""), true)
assert.equal(view.includes('addImageCandidate'), true)
assert.equal(view.includes('beginImageSet'), true)
assert.equal(view.includes('direction'), true)
assert.equal(view.includes('readImageCount'), true)
assert.equal(view.includes('Generate 1 image'), true)
assert.equal(view.includes('Creative direction'), true)
assert.equal(view.includes('Set the idea you want to explore. Each image will interpret it differently.'), true)
assert.equal(view.includes('originalText: question.originalText'), true)
assert.equal(view.includes('directionsForCount(count)'), true)
assert.equal((view.match(/<textarea/g) ?? []).length, 1)
assert.equal(view.includes('Image prompt'), false)
assert.equal(view.includes('role="radiogroup"'), true)
assert.equal(view.includes('IconAction'), true)
assert.equal(view.includes('questionListItemClass'), true)
assert.equal(view.includes('title='), false)
assert.equal(view.includes('Save concept'), true)
assert.equal(view.includes('runId: imageRunId.current'), true)
assert.equal(view.includes("outcome.kind === 'failed'"), true)
assert.equal(view.includes('continue'), true)
assert.equal(view.includes('shouldStartNextImage'), true)
assert.equal(view.includes('shouldApplyReturnedImage'), true)
assert.equal(view.includes('Saving keeps this image and stops any further images from being requested.'), true)
assert.equal(view.includes('An image already being created may still finish.'), true)
const saveStart = view.indexOf('function saveSelected')
const saveBody = view.slice(saveStart, view.indexOf('return (', saveStart))
assert.equal(saveBody.indexOf('saveConcept') < saveBody.indexOf('closeImageRun'), true)
assert.equal(saveBody.includes('abort'), false)
const closeStart = view.indexOf('function closeImageRun')
const closeBody = view.slice(closeStart, view.indexOf('async function requestImage', closeStart))
assert.equal(closeBody.includes('abort'), false)

const httpSource = readFileSync(new URL('../ai/http.ts', import.meta.url), 'utf8')
const imageSource = readFileSync(new URL('./openai-images.ts', import.meta.url), 'utf8')
const costSource = readFileSync(new URL('./cost.ts', import.meta.url), 'utf8')
const policySource = readFileSync(new URL('../ai/policy.ts', import.meta.url), 'utf8')
assert.equal(httpSource.includes('claimImageCall'), false)
assert.equal(httpSource.includes('rememberImageSpend'), false)
assert.equal(httpSource.includes('spendCeiling'), false)
assert.equal(httpSource.includes('startTurn'), true)
assert.equal(imageSource.includes('aboveSpendCeiling'), false)
assert.equal(imageSource.includes('spendCeiling'), false)
assert.equal(imageSource.includes('maxImageCalls'), false)
assert.equal(imageSource.includes('maxRunImageCalls'), false)
assert.equal(costSource.includes('spendCeilingUsd'), false)
assert.equal(costSource.includes('1.5'), false)
assert.equal(costSource.includes('maxImageCalls'), false)
assert.equal(view.includes('aboveSpendCeiling'), false)
assert.equal(view.includes('1.50'), false)
assert.equal(policySource.includes('Another request is already running. Nothing extra was sent.'), true)

const directionText = 'Explore the gap between what is experienced and what may be true. Hold uncertainty, wonder, and the relationship between attention and what remains.'
const samples = [
  'Is what we call reality only the part we are able to notice?',
  'How can someone be present among others and still be unreached?',
  'Why does the kitchen feel smaller after everyone has left?',
]
for (const question of samples) {
  const prompts = metaphorDirections.map((direction) => imagePrompt(question, directionText, direction.instruction))
  assert.equal(new Set(prompts).size, 4)
  for (const direction of metaphorDirections) {
    const prompt = imagePrompt(question, directionText, direction.instruction)
    assert.equal(prompt.includes(question), true)
    assert.equal(prompt.includes(directionText), true)
    assert.equal(prompt.includes(direction.instruction), true)
    assert.equal(prompt.includes('not a scene, subject, setting, or metaphor to copy'), true)
    assert.equal(prompt.includes('Considered question'), false)
    for (const other of metaphorDirections) {
      if (other.id === direction.id) continue
      assert.equal(prompt.includes(other.instruction), false)
    }
  }
}
assert.deepEqual(directionsForCount(1).map((direction) => direction.instruction), [metaphorDirections[0].instruction])
assert.deepEqual(directionsForCount(2).map((direction) => direction.id), ['tension', 'trace'])
assert.deepEqual(directionsForCount(4).map((direction) => direction.id), ['tension', 'trace', 'scale', 'relation'])
const q09 = imagePrompt(samples[1], directionText, metaphorDirections[0].instruction)
const concrete = imagePrompt(samples[2], directionText, metaphorDirections[0].instruction)
assert.equal(q09.includes('empty bench'), true)
assert.equal(concrete.includes('empty bench'), false)
assert.equal(concrete.includes('A literal illustration of the nouns in the question.'), true)
