import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { requestTitleSuggestions } from '../providers/title-suggestions.ts'
import { acceptTitleSuggestions, resolveTitleSuggestions, suggestedTitleProblem } from './suggested-titles.ts'
import { isEnglishWord, isJoinedEnglishWords } from './title-dictionary.ts'
import { cleanTitle, textModelCanSeeImages, titleImageUrl, titleProblem, titleSuggestionPrompt } from './title.ts'

const accepted = acceptTitleSuggestions('{"titles":["Quiet Threshold","Second Glance","Held Apart","Extra Phrase"]}')
assert.deepEqual(accepted, { titles: ['Quiet Threshold', 'Second Glance', 'Held Apart'] })
if (!('error' in accepted)) {
  assert.equal(accepted.titles.length, 3)
  assert.equal(new Set(accepted.titles.map((title) => title.toLocaleLowerCase())).size, 3)
  for (const title of accepted.titles) assert.equal(titleProblem(title), null)
}

assert.deepEqual(acceptTitleSuggestions({ titles: ['One Two Three', 'Quiet Threshold', 'Held Apart'] }), { titles: ['Quiet Threshold', 'Held Apart'] })
assert.deepEqual(acceptTitleSuggestions({ titles: ['', 'Quiet Threshold', 'Held Apart'] }), { titles: ['Quiet Threshold', 'Held Apart'] })
assert.equal('error' in acceptTitleSuggestions('not json'), true)
assert.deepEqual(acceptTitleSuggestions({ titles: ['Quiet Threshold', 'quiet threshold', 'Held Apart'] }), { titles: ['Quiet Threshold', 'Held Apart'] })
assert.equal('error' in acceptTitleSuggestions({ note: 'no titles' }), true)
assert.deepEqual(
  acceptTitleSuggestions({ titles: [{ title: 'Quiet Threshold' }, { text: 'Second Glance' }, 'Held Apart'] }),
  { titles: ['Quiet Threshold', 'Second Glance', 'Held Apart'] },
)
assert.deepEqual(
  acceptTitleSuggestions({ titles: ['1. Quiet Threshold', '"Second Glance"', '- Held Apart'] }),
  { titles: ['Quiet Threshold', 'Second Glance', 'Held Apart'] },
)
assert.deepEqual(
  acceptTitleSuggestions({ titles: [{ title: 'One Two Three' }, { title: 'Quiet Threshold' }, { title: 'Held Apart' }] }),
  { titles: ['Quiet Threshold', 'Held Apart'] },
)

const manual = 'Spacetime Fusion'
assert.equal(titleProblem(manual), null)
assert.equal(titleProblem('HelpfulBalance'), null)
assert.equal(cleanTitle(manual), 'Spacetime Fusion')
for (const title of ['Kindness', 'Gentle Guidance', 'Clear Paths', 'Quiet Confidence', 'Another', 'Inside', 'Without', 'New Beginnings']) {
  assert.equal(suggestedTitleProblem(title), null, title)
}
for (const word of ['another', 'inside', 'without', 'kindness', 'spacetime']) {
  assert.equal(isEnglishWord(word), true, word)
  assert.equal(isJoinedEnglishWords(word), false, word)
  assert.equal(suggestedTitleProblem(word[0].toUpperCase() + word.slice(1)), null, word)
}
assert.equal(isEnglishWord('space'), true)
assert.equal(isEnglishWord('time'), true)
assert.equal(isEnglishWord('an'), true)
assert.equal(isEnglishWord('other'), true)
assert.equal(isEnglishWord('in'), true)
assert.equal(isEnglishWord('side'), true)
assert.equal(isEnglishWord('with'), true)
assert.equal(isEnglishWord('out'), true)
assert.equal(suggestedTitleProblem('Spacetime'), null)
assert.equal(isEnglishWord('clearpaths'), false)
assert.equal(isJoinedEnglishWords('clearpaths'), true)
assert.equal(isEnglishWord('askindness'), false)
assert.equal(isJoinedEnglishWords('askindness'), true)
assert.equal(isEnglishWord('vellune'), false)
assert.equal(isJoinedEnglishWords('vellune'), false)
assert.equal(suggestedTitleProblem('Vellune'), null)
for (const title of ['HelpfulBalance', 'WithoutClutter', 'askindness', 'clearpaths', 'Clarity askindness', 'A New Perspective', 'ClearPaths']) {
  assert.notEqual(suggestedTitleProblem(title), null, title)
}
assert.equal('error' in acceptTitleSuggestions({ titles: ['Clarity askindness', 'The HelpfulBalance', 'Guidance WithoutClutter'] }), true)
assert.deepEqual(
  acceptTitleSuggestions({ titles: ['The HelpfulBalance', 'Kindness', 'Gentle Guidance', 'Clear Paths'] }),
  { titles: ['Kindness', 'Gentle Guidance', 'Clear Paths'] },
)
assert.equal('error' in acceptTitleSuggestions(null), true)
assert.equal(titleProblem(manual), null)

assert.equal(textModelCanSeeImages('gpt-6-luna'), true)
assert.equal(textModelCanSeeImages('gpt-6-luna-2026-05-18'), true)
assert.equal(textModelCanSeeImages('some-text-only-model'), false)

const png = 'data:image/png;base64,iVBORw0KGgo='
assert.equal(titleImageUrl('gpt-6-luna', png).reason, 'seen')
assert.equal(titleImageUrl('some-text-only-model', png).reason, 'model')
assert.equal(titleImageUrl('gpt-6-luna', 'data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E').reason, 'unsupported')
assert.equal(titleImageUrl('gpt-6-luna', 'https://example.com/kept.webp?token=1').url, 'https://example.com/kept.webp?token=1')

const calls: { url: string; body: string }[] = []
const failed = await requestTitleSuggestions({
  apiKey: '',
  model: 'gpt-6-luna',
  prompt: 'unused',
  imageUrl: null,
  fetchImpl: async () => {
    throw new Error('missing configuration must not call the provider')
  },
})
assert.equal(calls.length, 0)
assert.equal('error' in failed, true)

const missing = await requestTitleSuggestions({
  apiKey: 'test-key',
  model: 'gpt-6-luna',
  prompt: 'Name it',
  imageUrl: png,
  fetchImpl: async (url, init) => {
    calls.push({ url: String(url), body: String(init?.body) })
    return new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), { status: 200 })
  },
})
assert.equal('error' in missing, true)
assert.equal(calls.length, 1)
assert.equal(calls[0].url, 'https://api.openai.com/v1/chat/completions')
assert.equal(calls[0].url.includes('images/generations'), false)
assert.equal(calls[0].body.includes('images/generations'), false)
assert.equal(calls[0].body.includes('gpt-image'), false)
assert.equal(calls[0].body.includes(png), true)
const sent = JSON.parse(calls[0].body) as {
  reasoning_effort: string
  max_completion_tokens: number
  response_format: { type: string; json_schema: { name: string; strict: boolean } }
}
assert.equal(sent.reasoning_effort, 'none')
assert.equal(sent.max_completion_tokens, 1200)
assert.equal(sent.response_format.type, 'json_schema')
assert.equal(sent.response_format.json_schema.name, 'concept_titles')
assert.equal(sent.response_format.json_schema.strict, true)

calls.length = 0
const providerDown = await requestTitleSuggestions({
  apiKey: 'test-key',
  model: 'gpt-6-luna',
  prompt: 'Name it',
  imageUrl: null,
  fetchImpl: async (url, init) => {
    calls.push({ url: String(url), body: String(init?.body) })
    return new Response('no', { status: 503 })
  },
})
assert.equal('error' in providerDown, true)
assert.equal(calls[0].body.includes('image_url'), false)

const parts = await requestTitleSuggestions({
  apiKey: 'test-key',
  model: 'gpt-6-luna',
  prompt: 'Name it',
  imageUrl: null,
  fetchImpl: async () => new Response(JSON.stringify({
    choices: [{
      finish_reason: 'stop',
      message: { content: [{ type: 'text', text: '{"titles":["Quiet Threshold","Second Glance","Held Apart"]}' }] },
    }],
  }), { status: 200 }),
})
assert.equal('content' in parts, true)
if ('content' in parts) {
  assert.deepEqual(acceptTitleSuggestions(parts.content), { titles: ['Quiet Threshold', 'Second Glance', 'Held Apart'] })
}

const truncated = await requestTitleSuggestions({
  apiKey: 'test-key',
  model: 'gpt-6-luna',
  prompt: 'Name it',
  imageUrl: null,
  fetchImpl: async () => new Response(JSON.stringify({
    choices: [{ finish_reason: 'length', message: { content: null } }],
  }), { status: 200 }),
})
assert.equal('error' in truncated && truncated.error.includes('stopped before'), true)

const rejected = await requestTitleSuggestions({
  apiKey: 'sk-test-secret',
  model: 'gpt-6-luna',
  prompt: 'Name it',
  imageUrl: null,
  fetchImpl: async () => new Response(JSON.stringify({
    error: { message: 'Unsupported parameter: reasoning_effort.' },
  }), { status: 400 }),
})
assert.equal('error' in rejected && rejected.error.includes('Unsupported parameter'), true)
assert.equal('error' in rejected && rejected.error.includes('sk-test-secret'), false)

let titleProviderCalls = 0
const titleLimited = await requestTitleSuggestions({
  apiKey: 'test-key',
  model: 'gpt-6-luna',
  prompt: 'Name it',
  imageUrl: null,
  fetchImpl: async () => {
    titleProviderCalls += 1
    return new Response(JSON.stringify({ error: { code: 'rate_limit_exceeded', message: 'Rate limit reached for requests.' } }), { status: 429 })
  },
})
assert.equal(titleProviderCalls, 1)
assert.equal('error' in titleLimited && titleLimited.error.includes('rate limiting'), true)
assert.equal('error' in titleLimited && titleLimited.error.includes('60 minutes'), false)

const titleUnpaid = await requestTitleSuggestions({
  apiKey: 'test-key',
  model: 'gpt-6-luna',
  prompt: 'Name it',
  imageUrl: null,
  fetchImpl: async () => new Response(JSON.stringify({ error: { code: 'insufficient_quota', message: 'You exceeded your current quota.' } }), { status: 429 }),
})
assert.equal('error' in titleUnpaid && titleUnpaid.error.includes('no remaining credit'), true)
assert.equal('error' in titleUnpaid && titleUnpaid.error.includes('60 minutes'), false)

const route = readFileSync(new URL('../../app/api/titles/route.ts', import.meta.url), 'utf8')
const provider = readFileSync(new URL('../providers/title-suggestions.ts', import.meta.url), 'utf8')
const dictionarySource = readFileSync(new URL('./title-dictionary.ts', import.meta.url), 'utf8')
const suggestionSource = readFileSync(new URL('./suggested-titles.ts', import.meta.url), 'utf8')
const titlesHttp = readFileSync(new URL('../ai/http.ts', import.meta.url), 'utf8')
assert.equal(route.includes('images/generations'), false)
assert.equal(route.includes('interpretQuestion'), false)
assert.equal(route.includes("from('concepts')"), false)
assert.equal(provider.includes('images/generations'), false)
assert.equal(provider.includes('https://api.openai.com/v1/chat/completions'), true)
assert.equal(dictionarySource.includes('api.openai.com'), false)
assert.equal(suggestionSource.includes('api.openai.com'), false)
assert.equal(titlesHttp.includes('requestTitleSuggestions'), true)
const prompt = titleSuggestionPrompt({
  consideredText: 'What remains when a model of space is pictured as a dark well?',
  metaphor: 'Show one ordinary object at the wrong scale.',
  questions: [{ originalText: 'How do we picture the universe?', consideredText: null }],
  sawImage: true,
})
assert.equal(prompt.includes('How do we picture the universe?'), true)
assert.equal(prompt.includes('Show one ordinary object at the wrong scale.'), true)
assert.equal(prompt.includes('images/generations'), false)
assert.equal(prompt.includes('Name the metaphor.'), true)
assert.equal(prompt.includes('Do not write a slogan'), true)
assert.equal(prompt.includes('concatenate words, use camel case'), true)
assert.equal(prompt.includes('selected image and the source questions'), true)
assert.equal(prompt.includes('New Beginnings'), true)
const titleRequest = JSON.parse(calls[0].body) as { response_format: { json_schema: { schema: { properties: { titles: { items: { pattern: string } } } } } } }
assert.equal(titleRequest.response_format.json_schema.schema.properties.titles.items.pattern.includes('[a-z]'), true)

let titleAsks = 0
const prompts: string[] = []
const filled = await resolveTitleSuggestions(async (text) => {
  titleAsks += 1
  prompts.push(text)
  if (titleAsks === 1) return { content: '{"titles":["Kindness","Gentle Guidance","HelpfulBalance"]}' }
  return { content: '{"titles":["Clear Paths","Kindness","Gentle Guidance"]}' }
}, prompt)
assert.equal(titleAsks, 2)
assert.equal(prompts[1].includes(prompt), true)
assert.equal(prompts[1].includes('Keep these titles, and do not repeat them: Kindness, Gentle Guidance.'), true)
assert.equal(prompts[1].includes('Supply one new title'), true)
assert.deepEqual(filled, { titles: ['Kindness', 'Gentle Guidance', 'Clear Paths'] })

titleAsks = 0
const complete = await resolveTitleSuggestions(async () => {
  titleAsks += 1
  return { content: '{"titles":["Quiet Threshold","Second Glance","Held Apart"]}' }
}, prompt)
assert.equal(titleAsks, 1)
assert.deepEqual(complete, { titles: ['Quiet Threshold', 'Second Glance', 'Held Apart'] })

titleAsks = 0
const retained = await resolveTitleSuggestions(async () => {
  titleAsks += 1
  if (titleAsks === 1) return { content: '{"titles":["Kindness","Gentle Guidance","HelpfulBalance"]}' }
  return { content: '{"titles":["HelpfulBalance","askindness","WithoutClutter"]}' }
}, prompt)
assert.equal(titleAsks, 2)
assert.deepEqual(retained, { titles: ['Kindness', 'Gentle Guidance'] })

titleAsks = 0
const unique = await resolveTitleSuggestions(async () => {
  titleAsks += 1
  if (titleAsks === 1) return { content: '{"titles":["Kindness","Gentle Guidance","HelpfulBalance"]}' }
  return { content: '{"titles":["kindness","Gentle Guidance","Quiet Confidence"]}' }
}, prompt)
assert.equal(titleAsks, 2)
assert.deepEqual(unique, { titles: ['Kindness', 'Gentle Guidance', 'Quiet Confidence'] })

titleAsks = 0
const stopped = await resolveTitleSuggestions(async () => {
  titleAsks += 1
  return { error: 'The text model did not return titles. Your title was left unchanged.' }
}, prompt)
assert.equal(titleAsks, 1)
assert.equal('error' in stopped, true)

titleAsks = 0
const retryFailed = await resolveTitleSuggestions(async () => {
  titleAsks += 1
  if (titleAsks === 1) return { content: '{"titles":["Kindness","Gentle Guidance","HelpfulBalance"]}' }
  return { error: 'The text model did not finish. Your title was left unchanged.' }
}, prompt)
assert.equal(titleAsks, 2)
assert.deepEqual(retryFailed, { titles: ['Kindness', 'Gentle Guidance'] })

console.log('title suggestion checks passed')
