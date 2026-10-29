export const aiEndpoints = ['consider', 'images', 'titles'] as const

export type AiEndpoint = (typeof aiEndpoints)[number]

const signedOut: Record<AiEndpoint, string> = {
  consider: 'Sign in again before asking for a proposal. Nothing was sent.',
  images: 'Sign in again before asking for images. Nothing was sent.',
  titles: 'Sign in again before asking for titles. You can still type a title.',
}

export function accountsNotConfigured(): Response {
  return Response.json({ error: 'Accounts are not configured on this server. Nothing was sent.' }, { status: 503 })
}

export function signedOutResponse(endpoint: AiEndpoint): Response {
  return Response.json({ error: signedOut[endpoint] }, { status: 401 })
}

function retryPhrase(seconds: number) {
  if (seconds >= 120) return `${Math.ceil(seconds / 60)} minutes`
  if (seconds >= 60) return '1 minute'
  return seconds === 1 ? '1 second' : `${seconds} seconds`
}

export function limitedResponse(retryAfterSeconds: number): Response {
  const retry = Math.max(1, Math.ceil(retryAfterSeconds))
  return Response.json(
    {
      error: `This account has reached its limit for now. Try again in ${retryPhrase(retry)}. Nothing was sent.`,
      retryAfterSeconds: retry,
    },
    { status: 429, headers: { 'retry-after': String(retry) } },
  )
}

export function reserveUnavailable(): Response {
  return Response.json({ error: 'The request could not be checked, so nothing was sent.' }, { status: 503 })
}

type UserResult = {
  data: { user: { id: string } | null }
  error: { message?: string } | null
}

type ReserveResult = {
  data: unknown
  error: { message?: string } | null
}

export type AiSession = {
  auth: { getUser: () => Promise<UserResult> }
  rpc: (name: 'reserve_ai_request', args: { p_endpoint: AiEndpoint }) => Promise<ReserveResult>
}

export function reservationFromRpc(endpoint: AiEndpoint, result: ReserveResult): Response | null {
  if (result.error) {
    if (/not authenticated/i.test(result.error.message ?? '')) return signedOutResponse(endpoint)
    return reserveUnavailable()
  }
  const row = Array.isArray(result.data) ? result.data[0] : result.data
  if (!row || typeof row !== 'object') return reserveUnavailable()
  const record = row as { allowed?: unknown; retry_after_seconds?: unknown }
  if (record.allowed === true) return null
  if (record.allowed !== false) return reserveUnavailable()
  const retry = typeof record.retry_after_seconds === 'number' && Number.isFinite(record.retry_after_seconds)
    ? record.retry_after_seconds
    : 1
  return limitedResponse(retry)
}

export async function authenticateAiUser(endpoint: AiEndpoint, session: AiSession): Promise<Response | { userId: string }> {
  const { data, error } = await session.auth.getUser()
  if (error || !data.user?.id) return signedOutResponse(endpoint)
  return { userId: data.user.id }
}

export async function reserveAiEndpoint(endpoint: AiEndpoint, session: AiSession): Promise<Response | null> {
  const result = await session.rpc('reserve_ai_request', { p_endpoint: endpoint })
  return reservationFromRpc(endpoint, result)
}

export function considerWouldCallProvider() {
  return Boolean(process.env.OPENAI_API_KEY?.trim() && process.env.OPENAI_TEXT_MODEL?.trim())
}

export function imagesWouldCallProvider() {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

export function titlesWouldCallProvider(model: string) {
  return Boolean(process.env.OPENAI_API_KEY?.trim() && model.trim())
}
