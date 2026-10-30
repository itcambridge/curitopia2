import { openAiSession } from '@/lib/ai/guard'
import { authenticateAiUser, reserveAiEndpoint } from '@/lib/ai/policy'
import { considerHttp } from '@/lib/ai/http'
import { requestImagePrompt } from '@/lib/providers/image-prompt'
import { configuredTextModel } from '@/lib/providers/title-suggestions'
import { loadOwnedQuestionText } from '@/lib/questions/owned-question'

export const dynamic = 'force-dynamic'

async function consider(original: string) {
  return requestImagePrompt({
    apiKey: process.env.OPENAI_API_KEY?.trim() ?? '',
    model: configuredTextModel({
      OPENAI_TEXT_MODEL: process.env.OPENAI_TEXT_MODEL,
      OPENAI_MODEL: process.env.OPENAI_MODEL,
    }),
    question: original,
  })
}

export async function POST(request: Request) {
  const session = await openAiSession()
  if (session instanceof Response) return session
  return considerHttp(request, {
    session,
    authenticate: authenticateAiUser,
    reserve: reserveAiEndpoint,
  }, consider, loadOwnedQuestionText)
}
