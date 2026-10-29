import { openAiSession } from '@/lib/ai/guard'
import { authenticateAiUser, reserveAiEndpoint } from '@/lib/ai/policy'
import { considerHttp } from '@/lib/ai/http'
import { considerQuestion } from '@/lib/providers/openai-images'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await openAiSession()
  if (session instanceof Response) return session
  return considerHttp(request, {
    session,
    authenticate: authenticateAiUser,
    reserve: reserveAiEndpoint,
  }, considerQuestion)
}
