import { openAiSession } from '@/lib/ai/guard'
import { authenticateAiUser, reserveAiEndpoint } from '@/lib/ai/policy'
import { titlesHttp } from '@/lib/ai/http'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await openAiSession()
  if (session instanceof Response) return session
  return titlesHttp(request, {
    session,
    authenticate: authenticateAiUser,
    reserve: reserveAiEndpoint,
  })
}
