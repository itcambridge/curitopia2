import { considerQuestion } from '@/lib/providers/openai-images'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let body: { originalText?: unknown; attempt?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'The request could not be read.' }, { status: 400 })
  }
  const originalText = typeof body.originalText === 'string' ? body.originalText.trim() : ''
  const attempt = typeof body.attempt === 'number' && Number.isInteger(body.attempt) && body.attempt >= 0 ? body.attempt : 0
  if (!originalText || originalText.length > 2000) {
    return Response.json({ error: 'Write a question of 1 to 2000 characters first.' }, { status: 400 })
  }
  const result = await considerQuestion(originalText, attempt)
  return Response.json(result)
}
