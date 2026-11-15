import { experienceTurnHttp } from '@/lib/ai/experience-turn'
import { openAiSession } from '@/lib/ai/guard'
import { authenticateAiUser, experienceWouldCallProvider } from '@/lib/ai/policy'
import { requestFacilitation } from '@/lib/providers/experience-facilitator'
import { configuredTextModel } from '@/lib/providers/title-suggestions'
import { loadFacilitationContext } from '@/lib/questions/experience-context'
import { experienceRouteWriteTarget } from '@/lib/questions/experience-production'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await openAiSession()
  if (session instanceof Response) return session
  const model = configuredTextModel({
    OPENAI_TEXT_MODEL: process.env.OPENAI_TEXT_MODEL,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  })
  return experienceTurnHttp(request, {
    session,
    authenticate: authenticateAiUser,
  }, {
    writeTarget: () => experienceRouteWriteTarget(),
    loadContext: loadFacilitationContext,
    wouldCall: () => experienceWouldCallProvider(model),
    complete: async ({ messages }) => requestFacilitation({
      apiKey: process.env.OPENAI_API_KEY?.trim() ?? '',
      model,
      messages,
    }),
  })
}
