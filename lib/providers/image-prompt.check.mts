import assert from 'node:assert/strict'
import { considerHttp } from '../ai/http.ts'
import { authenticateAiUser, considerWouldCallProvider, reserveAiEndpoint, type AiSession } from '../ai/policy.ts'
import { requestImagePrompt } from './image-prompt.ts'

const questionId = '11111111-1111-4111-8111-111111111111'
const curiosityId = '22222222-2222-4222-8222-222222222222'
const savedKey = process.env.OPENAI_API_KEY
const savedText = process.env.OPENAI_TEXT_MODEL
const savedModel = process.env.OPENAI_MODEL

function restoreEnv() {
  if (savedKey === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = savedKey
  if (savedText === undefined) delete process.env.OPENAI_TEXT_MODEL
  else process.env.OPENAI_TEXT_MODEL = savedText
  if (savedModel === undefined) delete process.env.OPENAI_MODEL
  else process.env.OPENAI_MODEL = savedModel
}

function post(body: unknown) {
  return new Request('http://localhost/api/consider', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function session(userId: string | null): AiSession {
  return {
    auth: {
      getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }),
    },
    rpc: async () => ({ data: [{ allowed: true, retry_after_seconds: 0 }], error: null }),
  }
}

function gate(userId: string | null) {
  return { session: session(userId), authenticate: authenticateAiUser, reserve: reserveAiEndpoint }
}

const calls: { url: string; question: string; system: string }[] = []

function fetchImpl(url: string, init?: RequestInit) {
  const body = JSON.parse(String(init?.body)) as { messages: { role: string; content: string }[] }
  const question = body.messages.find((message) => message.role === 'user')?.content ?? ''
  const system = body.messages.find((message) => message.role === 'system')?.content ?? ''
  calls.push({ url, question, system })
  if (question.includes('fail')) {
    return Promise.resolve(new Response(JSON.stringify({ error: { message: 'unavailable' } }), { status: 500 }))
  }
  return Promise.resolve(new Response(JSON.stringify({
    choices: [{ finish_reason: 'stop', message: { content: `An intimate still image exploring the tension of: ${question}` } }],
  }), { status: 200, headers: { 'content-type': 'application/json' } }))
}

try {
  process.env.OPENAI_API_KEY = 'test-not-a-real-key'
  delete process.env.OPENAI_TEXT_MODEL
  process.env.OPENAI_MODEL = 'gpt-6-luna'
  assert.equal(considerWouldCallProvider(), true)

  const conduct = 'Is my conduct being well received?'
  const balance = 'How can I keep balance among sensitive colleagues?'
  const first = await requestImagePrompt({ apiKey: 'test-not-a-real-key', model: 'gpt-6-luna', question: conduct, fetchImpl })
  const second = await requestImagePrompt({ apiKey: 'test-not-a-real-key', model: 'gpt-6-luna', question: balance, fetchImpl })
  assert.equal('proposal' in first && first.proposal.includes(conduct), true)
  assert.equal('proposal' in second && second.proposal.includes(balance), true)
  assert.notEqual('proposal' in first && first.proposal, 'proposal' in second && second.proposal)
  assert.equal(calls[0]?.url, 'https://api.openai.com/v1/chat/completions')
  assert.equal(calls[0]?.question, conduct)
  assert.equal(calls[1]?.question, balance)
  assert.equal(calls[0]?.system.includes('focal subject'), true)
  assert.equal(calls[0]?.system.includes('ripples travelling across a still pool'), false)
  assert.equal(JSON.stringify(first).includes('Demo proposal'), false)

  const failed = await requestImagePrompt({ apiKey: 'test-not-a-real-key', model: 'gpt-6-luna', question: 'fail this question', fetchImpl })
  assert.equal('proposal' in failed, false)
  assert.equal('error' in failed, true)

  const thrown = await requestImagePrompt({
    apiKey: 'test-not-a-real-key',
    model: 'gpt-6-luna',
    question: conduct,
    fetchImpl: async () => { throw new Error('network') },
  })
  assert.equal('error' in thrown && thrown.error.includes('did not finish'), true)

  const callsBefore = calls.length
  const disconnected = await requestImagePrompt({ apiKey: '', model: '', question: conduct, fetchImpl })
  assert.equal('error' in disconnected, true)
  assert.equal(calls.length, callsBefore)

  let loaded = 0
  let considered = 0
  const signedOut = await considerHttp(
    post({ questionId, curiosityId }),
    gate(null),
    async () => { considered += 1; return { proposal: 'unused' } },
    async () => { loaded += 1; return conduct },
  )
  assert.equal(signedOut.status, 401)
  assert.equal(loaded, 0)
  assert.equal(considered, 0)

  const missing = await considerHttp(
    post({ questionId, curiosityId }),
    gate('user-a'),
    async () => { considered += 1; return { proposal: 'unused' } },
    async () => null,
  )
  assert.equal(missing.status, 404)
  const missingBody = await missing.json() as { proposal?: string; error?: string }
  assert.equal(missingBody.proposal, undefined)
  assert.equal(String(missingBody.error).includes('Demo'), false)
  assert.equal(considered, 0)

  let seen = ''
  const owned = await considerHttp(
    post({ questionId, curiosityId, originalText: 'A different question the browser invented' }),
    gate('user-a'),
    async (question) => { seen = question; considered += 1; return { proposal: 'A quiet pool holding one ripple.' } },
    async () => conduct,
  )
  assert.equal(owned.status, 200)
  assert.equal(seen, conduct)
  const ownedBody = await owned.json() as { proposal?: string }
  assert.equal(ownedBody.proposal, 'A quiet pool holding one ripple.')
  assert.equal(considered, 1)

  console.log('image prompt checks passed')
} finally {
  restoreEnv()
}
