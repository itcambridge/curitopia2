import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { considerHttp, imagesHttp, titlesHttp } from './http.ts'
import { authenticateAiUser, type AiEndpoint, type AiSession } from './policy.ts'
import { providerFailure } from '../providers/provider-error.ts'
import { readPublicSupabaseEnv } from '../supabase/env.ts'

function readPublicEnvSource() {
  return readFileSync(new URL('../supabase/env.ts', import.meta.url), 'utf8')
}

function sessionFor(userId: string | null): AiSession {
  return {
    auth: {
      getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: userId ? null : { message: 'expired' } }),
    },
  }
}

function post(path: string, body: unknown, raw = false) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? String(body) : JSON.stringify(body),
  })
}

const savedKey = process.env.OPENAI_API_KEY
const savedModel = process.env.OPENAI_MODEL
const savedTextModel = process.env.OPENAI_TEXT_MODEL
const savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const savedPublishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

function restoreEnv() {
  if (savedKey === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = savedKey
  if (savedModel === undefined) delete process.env.OPENAI_MODEL
  else process.env.OPENAI_MODEL = savedModel
  if (savedTextModel === undefined) delete process.env.OPENAI_TEXT_MODEL
  else process.env.OPENAI_TEXT_MODEL = savedTextModel
  if (savedUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
  else process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl
  if (savedPublishable === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = savedPublishable
}

process.env.OPENAI_API_KEY = 'test-not-a-real-key'
process.env.OPENAI_MODEL = 'gpt-6-luna'
process.env.OPENAI_TEXT_MODEL = 'gpt-6-luna'

let providerCalls = 0
const originalFetch = globalThis.fetch
globalThis.fetch = async () => {
  providerCalls += 1
  return new Response(JSON.stringify({
    choices: [{ finish_reason: 'stop', message: { content: '{"titles":["Quiet Threshold","Second Glance","Held Apart"]}' } }],
  }), { status: 200, headers: { 'content-type': 'application/json' } })
}

function gateFor(userId: string | null) {
  return { session: sessionFor(userId), authenticate: authenticateAiUser }
}

const consider = async (original: string) => {
  providerCalls += 1
  return { source: 'demo' as const, proposal: `What remains of ${original}?`, notice: 'checked' }
}
const interpret = async () => {
  providerCalls += 1
  return {
    source: 'openai' as const,
    notice: 'checked',
    candidates: [],
    reportedCostUsd: 0,
    stoppedBecause: 'complete' as const,
    model: 'gpt-image-2.5-flare',
    promptVersion: 'image-eval-1',
  }
}

try {
  const endpoints: AiEndpoint[] = ['consider', 'images', 'titles']
  for (const endpoint of endpoints) {
    providerCalls = 0
    const request = endpoint === 'consider'
      ? post('/api/consider', { originalText: 'How can I be more productive?' })
      : endpoint === 'images'
        ? post('/api/images', { consideredText: 'How can I be more productive?' })
        : post('/api/titles', { consideredText: 'How can I be more productive?', questions: [] })
    const response = endpoint === 'consider'
      ? await considerHttp(request, gateFor(null), consider, async () => 'How can I be more productive?')
      : endpoint === 'images'
        ? await imagesHttp(request, gateFor(null), interpret)
        : await titlesHttp(request, gateFor(null))
    assert.equal(response.status, 401)
    assert.equal(providerCalls, 0)
  }

  providerCalls = 0
  const invalid = await imagesHttp(post('/api/images', { consideredText: '' }), gateFor('user-a'), interpret)
  assert.equal(invalid.status, 400)
  const malformed = await considerHttp(post('/api/consider', '{', true), gateFor('user-a'), consider, async () => 'How can I be more productive?')
  assert.equal(malformed.status, 400)
  const missingTitle = await titlesHttp(post('/api/titles', { metaphor: 'only' }), gateFor('user-a'))
  assert.equal(missingTitle.status, 400)
  assert.equal(providerCalls, 0)

  providerCalls = 0
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const repeated = await imagesHttp(
      post('/api/images', { consideredText: 'Who should I ask about Citrix?' }),
      gateFor('user-a'),
      interpret,
    )
    assert.equal(repeated.status, 200)
    const body = await repeated.json() as { error?: string }
    assert.equal(body.error, undefined)
  }
  assert.equal(providerCalls, 3)

  let releaseHeld: () => void = () => {}
  let started: () => void = () => {}
  const startedPromise = new Promise<void>((resolve) => { started = resolve })
  const held = imagesHttp(
    post('/api/images', { consideredText: 'Who should I ask about Citrix?' }),
    gateFor('user-a'),
    () => new Promise((resolve) => {
      started()
      releaseHeld = () => resolve({
        source: 'openai' as const,
        notice: 'checked',
        candidates: [],
        reportedCostUsd: 0,
        stoppedBecause: 'complete' as const,
        model: 'gpt-image-2.5-flare',
        promptVersion: 'image-eval-1',
      })
    }),
  )
  await startedPromise
  const overlapping = await imagesHttp(
    post('/api/images', { consideredText: 'Who should I ask about Citrix?' }),
    gateFor('user-a'),
    interpret,
  )
  assert.equal(overlapping.status, 409)
  const overlappingBody = await overlapping.json() as { error?: string }
  assert.equal(overlappingBody.error, 'Another request is already running. Nothing extra was sent.')
  assert.equal(String(overlappingBody.error).includes('60 minutes'), false)
  assert.equal(overlapping.headers.get('retry-after'), null)
  const otherUserDuring = await imagesHttp(
    post('/api/images', { consideredText: 'Who should I ask about Citrix?' }),
    gateFor('user-b'),
    interpret,
  )
  assert.equal(otherUserDuring.status, 200)
  const promptDuringImages = await considerHttp(
    post('/api/consider', {
      questionId: '11111111-1111-4111-8111-111111111111',
      curiosityId: '22222222-2222-4222-8222-222222222222',
    }),
    gateFor('user-a'),
    consider,
    async () => 'How can I be more productive?',
  )
  assert.equal(promptDuringImages.status, 200)
  releaseHeld()
  assert.equal((await held).status, 200)
  const afterHeld = await imagesHttp(
    post('/api/images', { consideredText: 'Who should I ask about Citrix?' }),
    gateFor('user-a'),
    interpret,
  )
  assert.equal(afterHeld.status, 200)

  providerCalls = 0
  const firstTitles = await titlesHttp(
    post('/api/titles', { consideredText: 'How can I be more productive?', questions: [{ originalText: 'How can I be more productive?' }] }),
    gateFor('user-c'),
  )
  assert.equal(firstTitles.status, 200)
  const titleBody = await firstTitles.json() as { titles?: string[] }
  assert.deepEqual(titleBody.titles, ['Quiet Threshold', 'Second Glance', 'Held Apart'])
  assert.equal(providerCalls, 1)

  providerCalls = 0
  const secondTitles = await titlesHttp(
    post('/api/titles', { consideredText: 'How can I be more productive?', questions: [{ originalText: 'How can I be more productive?' }] }),
    gateFor('user-c'),
  )
  assert.equal(secondTitles.status, 200)
  assert.equal(providerCalls, 1)

  const secondPrompt = await considerHttp(
    post('/api/consider', {
      questionId: '11111111-1111-4111-8111-111111111111',
      curiosityId: '22222222-2222-4222-8222-222222222222',
    }),
    gateFor('user-a'),
    consider,
    async () => 'How can I be more productive?',
  )
  assert.equal(secondPrompt.status, 200)

  const httpSource = readFileSync(new URL('./http.ts', import.meta.url), 'utf8')
  const policySource = readFileSync(new URL('./policy.ts', import.meta.url), 'utf8')
  assert.equal(httpSource.includes('reserve_ai_request'), false)
  assert.equal(httpSource.includes('reached its limit'), false)
  assert.equal(policySource.includes('reached its limit'), false)
  assert.equal(policySource.includes('reserve_ai_request'), false)

  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  assert.equal(readPublicSupabaseEnv(), null)
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co/rest/v1/'
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-test-key'
  assert.equal(readPublicSupabaseEnv()?.url, 'https://example.supabase.co')
  assert.equal(readPublicSupabaseEnv()?.publishableKey, 'publishable-test-key')

  const envSource = readPublicEnvSource()
  assert.equal(envSource.includes('process.env.NEXT_PUBLIC_SUPABASE_URL'), true)
  assert.equal(envSource.includes('process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'), true)
  assert.equal(envSource.includes('process.env[supabaseUrlName]'), false)
  assert.equal(envSource.includes('process.env[publishableKeyName]'), false)
  assert.equal(envSource.includes('OPENAI_API_KEY'), false)

  const unpaidImages = providerFailure(429, 'You exceeded your current quota, please check your plan and billing details.', 'insufficient_quota', 'image provider', '')
  assert.equal(unpaidImages.includes('no remaining credit'), true)
  assert.equal(unpaidImages.includes('60 minutes'), false)
  const providerLimited = providerFailure(429, 'Rate limit reached for requests.', 'rate_limit_exceeded', 'image provider', '')
  assert.equal(providerLimited.includes('rate limiting'), true)
  assert.equal(providerLimited.includes('60 minutes'), false)
  const imageSource = readFileSync(new URL('../providers/openai-images.ts', import.meta.url), 'utf8')
  assert.equal(imageSource.includes('imageFailure(response)'), true)
  assert.equal(imageSource.includes('Nothing was retried.'), true)
  assert.equal(imageSource.includes('reached its limit'), false)

  const sql = readFileSync(new URL('../../supabase/migrations/20261028210000_ai_request_reservations.sql', import.meta.url), 'utf8')
  assert.equal(sql.includes('security definer'), true)
  assert.equal(sql.includes("set search_path = ''"), true)
  assert.equal(sql.includes('auth.uid()'), true)
  assert.equal(sql.includes('pg_advisory_xact_lock'), true)
  assert.equal(sql.includes("('images', 3, 3600)"), true)
  assert.equal(sql.includes("('consider', 30, 3600)"), true)
  assert.equal(sql.includes("('titles', 20, 3600)"), true)
  assert.equal(sql.includes('grant execute on function public.reserve_ai_request(text) to authenticated'), true)
  assert.equal(sql.includes('revoke all on function public.reserve_ai_request(text) from public, anon, service_role'), true)
  assert.equal(sql.includes('revoke all on table public.ai_request_reservations from public, anon, authenticated, service_role'), true)
  assert.equal(sql.includes('enable row level security'), true)
  assert.equal(sql.includes('SUPABASE_SERVICE_ROLE'), false)
  assert.equal(sql.includes('pg_catalog.greatest'), false)
  assert.equal(sql.includes('pg_catalog.extract'), false)
  assert.equal(sql.includes('greatest('), true)
  assert.equal(sql.includes('extract(epoch from'), true)
  assert.equal(sql.includes('revoke all on sequence public.ai_request_reservations_id_seq from public, anon, authenticated, service_role'), true)
} finally {
  globalThis.fetch = originalFetch
  restoreEnv()
}
