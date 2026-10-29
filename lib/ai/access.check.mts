import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { considerHttp, imagesHttp, titlesHttp } from './http.ts'
import { authenticateAiUser, reserveAiEndpoint, type AiEndpoint, type AiSession } from './policy.ts'
import { readPublicSupabaseEnv } from '../supabase/env.ts'

function readPublicEnvSource() {
  return readFileSync(new URL('../supabase/env.ts', import.meta.url), 'utf8')
}

type Stamp = { userId: string; endpoint: string; at: number }

class ReservationLedger {
  private rows: Stamp[] = []
  private chains = new Map<string, Promise<void>>()
  private limits: Record<string, { max: number; windowMs: number }>

  constructor(limits: Record<string, { max: number; windowMs: number }>) {
    this.limits = limits
  }

  reserve(userId: string, endpoint: string, now: number) {
    const key = `${userId}\u001f${endpoint}`
    const previous = this.chains.get(key) ?? Promise.resolve()
    const run = previous.then(() => {
      const policy = this.limits[endpoint]
      const cutoff = now - policy.windowMs
      const mine = this.rows.filter((row) => row.userId === userId && row.endpoint === endpoint && row.at > cutoff)
      if (mine.length >= policy.max) {
        const oldest = Math.min(...mine.map((row) => row.at))
        return { allowed: false, retry_after_seconds: Math.max(1, Math.ceil((oldest + policy.windowMs - now) / 1000)) }
      }
      this.rows.push({ userId, endpoint, at: now })
      return { allowed: true, retry_after_seconds: 0 }
    })
    this.chains.set(key, run.then(() => undefined, () => undefined))
    return run
  }
}

function sessionFor(userId: string | null, ledger: ReservationLedger, now: number): AiSession {
  return {
    auth: {
      getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: userId ? null : { message: 'expired' } }),
    },
    rpc: async (name, args) => {
      assert.equal(name, 'reserve_ai_request')
      if (!userId) return { data: null, error: { message: 'not authenticated' } }
      return { data: [await ledger.reserve(userId, args.p_endpoint, now)], error: null }
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

const limits = {
  consider: { max: 30, windowMs: 3_600_000 },
  titles: { max: 20, windowMs: 3_600_000 },
  images: { max: 3, windowMs: 3_600_000 },
}
const ledger = new ReservationLedger(limits)
const now = Date.parse('2026-10-28T20:00:00.000Z')
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
  const session = sessionFor(userId, ledger, now)
  return { session, authenticate: authenticateAiUser, reserve: reserveAiEndpoint }
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
      ? await considerHttp(request, gateFor(null), consider)
      : endpoint === 'images'
        ? await imagesHttp(request, gateFor(null), interpret)
        : await titlesHttp(request, gateFor(null))
    assert.equal(response.status, 401)
    assert.equal(providerCalls, 0)
  }

  providerCalls = 0
  const invalid = await imagesHttp(post('/api/images', { consideredText: '' }), gateFor('user-a'), interpret)
  assert.equal(invalid.status, 400)
  const malformed = await considerHttp(post('/api/consider', '{', true), gateFor('user-a'), consider)
  assert.equal(malformed.status, 400)
  const missingTitle = await titlesHttp(post('/api/titles', { metaphor: 'only' }), gateFor('user-a'))
  assert.equal(missingTitle.status, 400)
  assert.equal(providerCalls, 0)

  providerCalls = 0
  const imageResults = await Promise.all(Array.from({ length: 8 }, () => imagesHttp(
    post('/api/images', { consideredText: 'Who should I ask about Citrix?' }),
    gateFor('user-a'),
    interpret,
  )))
  const allowedImages = imageResults.filter((response) => response.status === 200)
  const limitedImages = imageResults.filter((response) => response.status === 429)
  assert.equal(allowedImages.length, 3)
  assert.equal(limitedImages.length, 5)
  assert.equal(providerCalls, 3)
  const limitedBody = await limitedImages[0].json() as { error?: string; retryAfterSeconds?: number }
  assert.equal(typeof limitedBody.error, 'string')
  assert.equal(typeof limitedBody.retryAfterSeconds, 'number')
  assert.equal(limitedImages[0].headers.get('retry-after'), String(limitedBody.retryAfterSeconds))

  const otherUser = await imagesHttp(
    post('/api/images', { consideredText: 'Who should I ask about Citrix?' }),
    gateFor('user-b'),
    interpret,
  )
  assert.equal(otherUser.status, 200)
  assert.equal(providerCalls, 4)

  const otherEndpoint = await considerHttp(
    post('/api/consider', { originalText: 'How can I be more productive?', attempt: 0 }),
    gateFor('user-a'),
    consider,
  )
  assert.equal(otherEndpoint.status, 200)

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
  const broken: AiSession = {
    auth: { getUser: async () => ({ data: { user: { id: 'user-d' } }, error: null }) },
    rpc: async () => ({ data: null, error: { message: 'function public.reserve_ai_request does not exist' } }),
  }
  const blocked = await imagesHttp(
    post('/api/images', { consideredText: 'Who should I ask about Citrix?' }),
    { session: broken, authenticate: authenticateAiUser, reserve: reserveAiEndpoint },
    interpret,
  )
  assert.equal(blocked.status, 503)
  assert.equal(providerCalls, 0)

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
