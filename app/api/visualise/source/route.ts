import { openAiSession } from '@/lib/ai/guard'
import { authenticateAiUser } from '@/lib/ai/policy'
import { discardVisualisationHttp, openVisualisationHttp } from '@/lib/ai/visualisation-http'
import { captureExperienceVisualisationSource } from '@/lib/questions/experience-visualisation-source'
import { loadOwnedExperienceTopic } from '@/lib/questions/owned-experience-topic'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await openAiSession()
  if (session instanceof Response) return session
  return openVisualisationHttp(request, {
    session,
    authenticate: authenticateAiUser,
  }, loadOwnedExperienceTopic, captureExperienceVisualisationSource)
}

export async function DELETE(request: Request) {
  const session = await openAiSession()
  if (session instanceof Response) return session
  return discardVisualisationHttp(request, {
    session,
    authenticate: authenticateAiUser,
  })
}
