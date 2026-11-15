import { beginAiTurn, type AiSession } from './policy.ts'
import {
  facilitationMessages,
  groundReading,
  readFacilitationRequest,
  type FacilitationContext,
  type FacilitationReading,
} from '../questions/experience-facilitator.ts'
import type { ExperienceWriteTarget } from '../questions/experience.ts'

type Gate = {
  session: AiSession
  authenticate: (endpoint: 'experience', session: AiSession) => Promise<Response | { userId: string }>
}

const productionNotice = 'This copy is connected to the production database. The curiosity stays as it is. Nothing was sent.'
const refusedNotice = 'Experience records are stored only for the development project named in the allowlist. Nothing was sent.'

export async function experienceTurnHttp(
  request: Request,
  gate: Gate,
  deps: {
    writeTarget: () => ExperienceWriteTarget
    loadContext: (input: {
      curiosityId: string
      experienceId: string
      questionIds: readonly string[]
      conceptIds: readonly string[]
    }) => Promise<FacilitationContext | null>
    wouldCall: () => boolean
    complete: (input: { messages: ReturnType<typeof facilitationMessages> }) => Promise<{ reading: FacilitationReading } | { error: string }>
  },
) {
  const auth = await gate.authenticate('experience', gate.session)
  if (auth instanceof Response) return auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'The request could not be read. Nothing was sent.' }, { status: 400 })
  }
  const parsed = readFacilitationRequest(body)
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 })

  const target = deps.writeTarget()
  if (target !== 'allowed') {
    return Response.json({ error: target === 'production' ? productionNotice : refusedNotice }, { status: 403 })
  }

  let context: FacilitationContext | null
  try {
    context = await deps.loadContext({
      curiosityId: parsed.value.curiosityId,
      experienceId: parsed.value.experienceId,
      questionIds: parsed.value.questionIds,
      conceptIds: parsed.value.conceptIds,
    })
  } catch {
    return Response.json({ error: 'The experience could not be read. Nothing was sent.' }, { status: 503 })
  }
  if (!context) {
    return Response.json({ error: 'That experience is not in this curiosity. Nothing was sent.' }, { status: 404 })
  }
  if (!deps.wouldCall()) {
    return Response.json({ error: 'No text model is connected. You can keep writing on the landscape. Your landscape is unchanged.' }, { status: 503 })
  }

  const turn = beginAiTurn(auth.userId, 'experience')
  if (turn instanceof Response) return turn
  try {
    const result = await deps.complete({
      messages: facilitationMessages({
        context,
        turns: parsed.value.turns,
        message: parsed.value.message,
      }),
    })
    if ('error' in result) return Response.json({ error: result.error }, { status: 502 })
    return Response.json({ reading: groundReading(result.reading, context) })
  } catch {
    return Response.json({ error: 'The conversation could not continue. Your landscape is unchanged. Nothing was retried.' }, { status: 502 })
  } finally {
    turn()
  }
}
