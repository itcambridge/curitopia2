import { assistantText } from './title-suggestions.ts'

const systemPrompt = [
  'You write one image-generation prompt for a single still image.',
  'Interpret what the question is really exploring, then turn that meaning into a visual concept.',
  'Do not answer the question, and do not restate its words.',
  'Choose one strong focal subject and an original metaphor.',
  'Give the image a coherent composition, depth, balance, light, atmosphere, colour, and texture.',
  'Make it distinctive and emotionally specific. Keep the scene rich, but not crowded with competing subjects.',
  'No text, lettering, typography, captions, logos, or watermarks.',
  'No generic stock photography, corporate scenes, or a literal illustration of the nouns in the question.',
  'Avoid a familiar cliché when a more particular metaphor is available.',
  'Reply with the image prompt only.',
].join(' ')

type CompletionBody = {
  choices?: {
    finish_reason?: string
    message?: { content?: unknown; refusal?: unknown }
  }[]
}

function fitPrompt(text: string) {
  const trimmed = text.trim().replace(/^["“]|["”]$/g, '').trim()
  if (trimmed.length <= 2000) return trimmed
  const cut = trimmed.slice(0, 2000)
  const sentence = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('。'))
  return sentence > 400 ? cut.slice(0, sentence + 1).trim() : cut.trim()
}

async function providerError(response: Response) {
  let detail = ''
  try {
    const body = await response.json() as { error?: { message?: unknown } }
    if (typeof body.error?.message === 'string') detail = body.error.message.replace(/\s+/g, ' ').trim().slice(0, 180)
  } catch {
    detail = ''
  }
  const extra = detail ? ` ${detail}` : ''
  return `The text model did not return an image prompt.${extra} Your prompt was left unchanged.`
}

export async function requestImagePrompt(input: {
  apiKey: string
  model: string
  question: string
  fetchImpl?: typeof fetch
}): Promise<{ proposal: string } | { error: string }> {
  if (!input.apiKey.trim() || !input.model.trim()) {
    return { error: 'No text model is connected. Write the image prompt yourself. Nothing was sent.' }
  }
  const fetchImpl = input.fetchImpl ?? fetch
  try {
    const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${input.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: input.model,
        reasoning_effort: 'none',
        max_completion_tokens: 1200,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input.question },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    })
    if (!response.ok) return { error: await providerError(response) }
    const body = await response.json() as CompletionBody
    const proposal = fitPrompt(assistantText(body.choices?.[0]?.message))
    if (!proposal) return { error: 'The text model returned no image prompt. Your prompt was left unchanged.' }
    console.info(JSON.stringify({
      imagePrompt: {
        model: input.model,
        httpStatus: response.status,
        ok: true,
        finishReason: body.choices?.[0]?.finish_reason ?? null,
        length: proposal.length,
      },
    }))
    return { proposal }
  } catch {
    return { error: 'The text model did not finish. Your prompt was left unchanged. Nothing was retried.' }
  }
}
