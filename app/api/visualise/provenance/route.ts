import { openAiSession } from '@/lib/ai/guard'
import { authenticateAiUser } from '@/lib/ai/policy'
import { experienceProvenanceHttp } from '@/lib/ai/visualisation-http'
import { saveExperienceVisualisationProvenance } from '@/lib/questions/experience-provenance'
import { locateVisualisationSource } from '@/lib/questions/experience-visualisation-source'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await openAiSession()
  if (session instanceof Response) return session
  return experienceProvenanceHttp(request, {
    session,
    authenticate: authenticateAiUser,
  }, {
    locateSource: locateVisualisationSource,
    save: saveExperienceVisualisationProvenance,
  })
}
