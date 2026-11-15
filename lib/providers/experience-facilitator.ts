import { assistantText } from './title-suggestions.ts'
import { providerFailure, readProviderError } from './provider-error.ts'
import {
  acceptFacilitationReading,
  type FacilitationMessage,
  type FacilitationReading,
} from '../questions/experience-facilitator.ts'

const readingSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['say', 'interpretation', 'forces', 'interaction', 'followUp', 'northStar', 'phrases', 'revisions', 'shifts', 'experiment'],
  properties: {
    say: { type: 'string', maxLength: 2000 },
    interpretation: { type: 'string', maxLength: 800 },
    forces: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'why'],
        properties: {
          name: { type: 'string', maxLength: 80 },
          why: { type: 'string', maxLength: 400 },
        },
      },
    },
    northStar: {
      type: 'object',
      additionalProperties: false,
      required: ['wording', 'because'],
      properties: {
        wording: { type: 'string', maxLength: 400 },
        because: { type: 'string', maxLength: 400 },
      },
    },
    phrases: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['circle', 'body', 'because'],
        properties: {
          circle: { type: 'string', enum: ['concern', 'influence', 'control'] },
          body: { type: 'string', maxLength: 240 },
          because: { type: 'string', maxLength: 400 },
        },
      },
    },
    revisions: {
      type: 'array',
      maxItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['itemId', 'body', 'because'],
        properties: {
          itemId: { type: 'string', maxLength: 36 },
          body: { type: 'string', maxLength: 240 },
          because: { type: 'string', maxLength: 400 },
        },
      },
    },
    shifts: {
      type: 'array',
      maxItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['itemId', 'circle', 'because'],
        properties: {
          itemId: { type: 'string', maxLength: 36 },
          circle: { type: 'string', enum: ['concern', 'influence', 'control'] },
          because: { type: 'string', maxLength: 400 },
        },
      },
    },
    experiment: {
      type: 'object',
      additionalProperties: false,
      required: ['invitation', 'why', 'mightReveal', 'sourceLabel', 'sourceQuestionId', 'sourceConceptId'],
      properties: {
        invitation: { type: 'string', maxLength: 280 },
        why: { type: 'string', maxLength: 400 },
        mightReveal: { type: 'string', maxLength: 400 },
        sourceLabel: { type: 'string', maxLength: 160 },
        sourceQuestionId: { type: 'string', maxLength: 36 },
        sourceConceptId: { type: 'string', maxLength: 36 },
      },
    },
    interaction: { type: 'string', maxLength: 800 },
    followUp: { type: 'string', maxLength: 400 },
  },
} as const

export type FacilitationTransport = {
  httpStatus: number | null
  finishReason: string | null
  sayLength: number
  forceCount: number
}

const unchanged = 'Your landscape is unchanged. Nothing was retried.'

function failure(status: number, code: string) {
  const specific = providerFailure(status, '', code, 'text model', 'Your landscape is unchanged. ')
  if (specific) return specific
  return `The text model could not reply. ${unchanged}`
}

export async function requestFacilitation(input: {
  apiKey: string
  model: string
  messages: readonly FacilitationMessage[]
  fetchImpl?: typeof fetch
}): Promise<({ reading: FacilitationReading } & FacilitationTransport) | ({ error: string } & FacilitationTransport)> {
  const empty = { httpStatus: null, finishReason: null, sayLength: 0, forceCount: 0 }
  if (!input.apiKey.trim() || !input.model.trim()) {
    return { ...empty, error: `No text model is connected. You can keep writing on the landscape. ${unchanged}` }
  }
  const fetchImpl = input.fetchImpl ?? fetch
  let response: Response
  try {
    response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${input.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: input.model,
        reasoning_effort: 'low',
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'experience_reading',
            strict: true,
            schema: readingSchema,
          },
        },
        max_completion_tokens: 4000,
        messages: input.messages,
      }),
      signal: AbortSignal.timeout(60_000),
    })
  } catch {
    return { ...empty, error: `The text model did not finish. ${unchanged}` }
  }
  if (!response.ok) {
    let code = ''
    try {
      code = readProviderError(await response.json()).code
    } catch {
      code = ''
    }
    return { ...empty, httpStatus: response.status, error: failure(response.status, code) }
  }
  let choice: { finish_reason?: string; message?: { content?: unknown; refusal?: unknown } } | undefined
  try {
    const body = await response.json() as { choices?: { finish_reason?: string; message?: { content?: unknown; refusal?: unknown } }[] }
    choice = body.choices?.[0]
  } catch {
    return { ...empty, httpStatus: response.status, error: `The reading could not be understood. ${unchanged}` }
  }
  const content = assistantText(choice?.message)
  const transport = { httpStatus: response.status, finishReason: choice?.finish_reason ?? null, sayLength: 0, forceCount: 0 }
  if (!content && choice?.finish_reason === 'length') {
    return { ...transport, error: `The reading stopped early. ${unchanged}` }
  }
  if (!content) return { ...transport, error: `The text model returned no reading. ${unchanged}` }
  const accepted = acceptFacilitationReading(content)
  if ('error' in accepted) return { ...transport, error: accepted.error }
  console.info(JSON.stringify({
    experienceReading: {
      model: input.model,
      httpStatus: transport.httpStatus,
      finishReason: transport.finishReason,
      sayLength: accepted.reading.say.length,
      forceCount: accepted.reading.forces.length,
    },
  }))
  return {
    ...transport,
    sayLength: accepted.reading.say.length,
    forceCount: accepted.reading.forces.length,
    reading: accepted.reading,
  }
}
