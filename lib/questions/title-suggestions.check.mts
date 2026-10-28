import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { requestTitleSuggestions } from '../providers/title-suggestions.ts'
import { acceptTitleSuggestions, cleanTitle, textModelCanSeeImages, titleImageUrl, titleProblem, titleSuggestionPrompt } from './title.ts'

const accepted = acceptTitleSuggestions('{"titles":["Quiet Threshold","Second Glance","Held Apart","Extra Phrase"]}')
assert.deepEqual(accepted, { titles: ['Quiet Threshold', 'Second Glance', 'Held Apart'] })
if (!('error' in accepted)) {
  assert.equal(accepted.titles.length, 3)
  assert.equal(new Set(accepted.titles.map((title) => title.toLocaleLowerCase())).size, 3)
  for (const title of accepted.titles) assert.equal(titleProblem(title), null)
}

assert.equal('error' in acceptTitleSuggestions({ titles: ['One Two Three', 'Quiet Threshold', 'Held Apart'] }), true)
assert.equal('error' in acceptTitleSuggestions({ titles: ['', 'Quiet Threshold', 'Held Apart'] }), true)
assert.equal('error' in acceptTitleSuggestions('not json'), true)
assert.equal('error' in acceptTitleSuggestions({ titles: ['Quiet Threshold', 'quiet threshold', 'Held Apart'] }), true)
assert.equal('error' in acceptTitleSuggestions({ note: 'no titles' }), true)
assert.deepEqual(
  acceptTitleSuggestions({ titles: [{ title: 'Quiet Threshold' }, { text: 'Second Glance' }, 'Held Apart'] }),
  { titles: ['Quiet Threshold', 'Second Glance', 'Held Apart'] },
)
assert.deepEqual(
  acceptTitleSuggestions({ titles: ['1. Quiet Threshold', '"Second Glance"', '- Held Apart'] }),
  { titles: ['Quiet Threshold', 'Second Glance', 'Held Apart'] },
)
assert.equal('error' in acceptTitleSuggestions({ titles: [{ title: 'One Two Three' }, { title: 'Quiet Threshold' }, { title: 'Held Apart' }] }), true)

const manual = 'Spacetime Fusion'
assert.equal(titleProblem(manual), null)
assert.equal(cleanTitle(manual), 'Spacetime Fusion')
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

const route = readFileSync(new URL('../../app/api/titles/route.ts', import.meta.url), 'utf8')
const provider = readFileSync(new URL('../providers/title-suggestions.ts', import.meta.url), 'utf8')
assert.equal(route.includes('images/generations'), false)
assert.equal(route.includes('interpretQuestion'), false)
assert.equal(route.includes("from('concepts')"), false)
assert.equal(provider.includes('images/generations'), false)
const prompt = titleSuggestionPrompt({
  consideredText: 'What remains when a model of space is pictured as a dark well?',
  metaphor: 'Show one ordinary object at the wrong scale.',
  questions: [{ originalText: 'How do we picture the universe?', consideredText: null }],
  sawImage: true,
})
assert.equal(prompt.includes('How do we picture the universe?'), true)
assert.equal(prompt.includes('images/generations'), false)

console.log('title suggestion checks passed')
