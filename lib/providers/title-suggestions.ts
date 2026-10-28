export function configuredTextModel(env: { OPENAI_TEXT_MODEL?: string; OPENAI_MODEL?: string }) {
  return env.OPENAI_TEXT_MODEL?.trim() || env.OPENAI_MODEL?.trim() || ''
}

type CompletionBody = {
  choices?: {
    finish_reason?: string
    message?: { content?: unknown; refusal?: unknown }
  }[]
}

function assistantText(message: { content?: unknown; refusal?: unknown } | undefined) {
  const content = message?.content
  if (typeof content === 'string') return content.trim()
  if (!Array.isArray(content)) return ''
  return content.flatMap((part) => {
    if (!part || typeof part !== 'object') return []
    const record = part as { type?: unknown; text?: unknown }
    return record.type === 'text' && typeof record.text === 'string' ? [record.text] : []
  }).join('').trim()
}

async function providerError(response: Response) {
  let detail = ''
  try {
    const body = await response.json() as { error?: { message?: unknown } }
    if (typeof body.error?.message === 'string') {
      detail = body.error.message.replace(/\s+/g, ' ').trim().slice(0, 180)
    }
  } catch {
    detail = ''
  }
  const extra = detail ? ` ${detail}` : ''
  return { error: `The text model did not return titles.${extra} Your title was left unchanged.` }
}

export type TitleTransport = {
  httpStatus: number | null
  ok: boolean
  finishReason: string | null
  contentPresent: boolean
  contentType: 'string' | 'array' | 'null' | 'object' | 'other' | 'missing'
}

const emptyTransport: TitleTransport = {
  httpStatus: null,
  ok: false,
  finishReason: null,
  contentPresent: false,
  contentType: 'missing',
}

function contentTypeOf(content: unknown): TitleTransport['contentType'] {
  if (content === undefined) return 'missing'
  if (content === null) return 'null'
  if (typeof content === 'string') return 'string'
  if (Array.isArray(content)) return 'array'
  if (typeof content === 'object') return 'object'
  return 'other'
}

export async function requestTitleSuggestions(input: {
  apiKey: string
  model: string
  prompt: string
  imageUrl: string | null
  fetchImpl?: typeof fetch
}): Promise<({ content: string } & TitleTransport) | ({ error: string } & TitleTransport)> {
  if (!input.apiKey.trim() || !input.model.trim()) {
    return { ...emptyTransport, error: 'No text model is connected. Type a one- or two-word title yourself.' }
  }
  const fetchImpl = input.fetchImpl ?? fetch
  const textPart = { type: 'text' as const, text: input.prompt }
  const userContent = input.imageUrl
    ? [textPart, { type: 'image_url' as const, image_url: { url: input.imageUrl, detail: 'low' as const } }]
    : input.prompt
  try {
    const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${input.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: input.model,
        // Completion tokens include reasoning tokens. "none" leaves the budget for the JSON titles.
        reasoning_effort: 'none',
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'concept_titles',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['titles'],
              properties: {
                titles: {
                  type: 'array',
                  minItems: 3,
                  maxItems: 3,
                  description: 'Exactly three different titles.',
                  items: {
                    type: 'string',
                    description: 'One word, or two words separated by a single space. At most 40 characters.',
                    pattern: '^[^\\s]{1,40}( [^\\s]{1,39})?$',
                  },
                },
              },
            },
          },
        },
        max_completion_tokens: 1200,
        messages: [
          {
            role: 'system',
            content: 'You name concepts. Reply with JSON only. Do not save anything, and do not describe an image-generation request.',
          },
          { role: 'user', content: userContent },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    })
    if (!response.ok) return { ...emptyTransport, httpStatus: response.status, ...(await providerError(response)) }
    const body = await response.json() as CompletionBody
    const choice = body.choices?.[0]
    const rawContent = choice?.message?.content
    const transport: TitleTransport = {
      httpStatus: response.status,
      ok: true,
      finishReason: choice?.finish_reason ?? null,
      contentPresent: rawContent !== undefined && rawContent !== null && rawContent !== '',
      contentType: contentTypeOf(rawContent),
    }
    const content = assistantText(choice?.message)
    if (!content && choice?.finish_reason === 'length') {
      return { ...transport, error: 'The text model stopped before it finished the titles. Your title was left unchanged.' }
    }
    if (!content) return { ...transport, error: 'The text model returned no titles. Your title was left unchanged.' }
    return { ...transport, content }
  } catch {
    return { ...emptyTransport, error: 'The text model did not finish. Your title was left unchanged.' }
  }
}
