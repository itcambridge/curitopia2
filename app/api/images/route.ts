import { interpretQuestion } from '@/lib/providers/openai-images'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let body: { consideredText?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'The request could not be read.' }, { status: 400 })
  }
  const consideredText = typeof body.consideredText === 'string' ? body.consideredText.trim() : ''
  if (!consideredText || consideredText.length > 2000) {
    return Response.json({ error: 'Save a considered question before asking for images.' }, { status: 400 })
  }
  const result = await interpretQuestion(consideredText, request.signal)
  return Response.json(result)
}
