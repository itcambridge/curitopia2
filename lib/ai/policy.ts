import { configuredTextModel } from '../providers/title-suggestions.ts'

export const aiEndpoints = ['consider', 'images', 'titles'] as const

export type AiEndpoint = (typeof aiEndpoints)[number]

const signedOut: Record<AiEndpoint, string> = {
  consider: 'Sign in again before asking for an image prompt. Nothing was sent.',
  images: 'Sign in again before asking for images. Nothing was sent.',
  titles: 'Sign in again before asking for titles. You can still type a title.',
}

export function accountsNotConfigured(): Response {
  return Response.json({ error: 'Accounts are not configured on this server. Nothing was sent.' }, { status: 503 })
}

export function signedOutResponse(endpoint: AiEndpoint): Response {
  return Response.json({ error: signedOut[endpoint] }, { status: 401 })
}

type UserResult = {
  data: { user: { id: string } | null }
  error: { message?: string } | null
}

export type AiSession = {
  auth: { getUser: () => Promise<UserResult> }
}

const running = new Map<string, number>()

export function beginAiTurn(userId: string, endpoint: AiEndpoint): Response | (() => void) {
  const key = `${endpoint}\u001f${userId}`
  if ((running.get(key) ?? 0) >= 1) {
    return Response.json(
      { error: 'Another request is already running. Nothing extra was sent.' },
      { status: 409 },
    )
  }
  running.set(key, 1)
  return () => {
    running.delete(key)
  }
}

export async function authenticateAiUser(endpoint: AiEndpoint, session: AiSession): Promise<Response | { userId: string }> {
  const { data, error } = await session.auth.getUser()
  if (error || !data.user?.id) return signedOutResponse(endpoint)
  return { userId: data.user.id }
}

export function considerWouldCallProvider() {
  const model = configuredTextModel({
    OPENAI_TEXT_MODEL: process.env.OPENAI_TEXT_MODEL,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  })
  return Boolean(process.env.OPENAI_API_KEY?.trim() && model)
}

export function imagesWouldCallProvider() {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

export function titlesWouldCallProvider(model: string) {
  return Boolean(process.env.OPENAI_API_KEY?.trim() && model.trim())
}
