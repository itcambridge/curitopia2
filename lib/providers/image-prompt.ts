import { providerFailure, readProviderError } from './provider-error.ts'
import { assistantText } from './title-suggestions.ts'

export const creativeDirectionSystemPrompt = [
  'You write one editable creative direction for a set of images.',
  'Interpret what the question is really exploring: the idea, feeling, tension, or relationship underneath it.',
  'Be specific and meaningful, not generic. A person should be able to read the direction, understand it, and edit it.',
  'Do not answer the question, and do not restate it as a slogan.',
  'Do not describe a finished picture.',
  'Do not choose a focal object, a physical scene, a setting, a metaphor, a composition, a camera angle, or a collection of visual elements.',
  'Leave the choice of visual metaphor open, so each image can interpret the direction independently.',
  'Reply with the creative direction only.',
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
  let code = ''
  try {
    const read = readProviderError(await response.json())
    detail = read.detail
    code = read.code
  } catch {
    detail = ''
  }
  const specific = providerFailure(response.status, detail, code, 'text model', 'Your prompt was left unchanged. ')
  if (specific) return specific
  const extra = detail ? ` ${detail}` : ''
  return `The text model did not return a creative direction.${extra} Your direction was left unchanged.`
}

export async function requestImagePrompt(input: {
  apiKey: string
  model: string
  question: string
  fetchImpl?: typeof fetch
}): Promise<{ proposal: string } | { error: string }> {
  if (!input.apiKey.trim() || !input.model.trim()) {
    return { error: 'No text model is connected. Write the creative direction yourself. Nothing was sent.' }
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
          { role: 'system', content: creativeDirectionSystemPrompt },
          { role: 'user', content: input.question },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    })
    if (!response.ok) return { error: await providerError(response) }
    const body = await response.json() as CompletionBody
    const proposal = fitPrompt(assistantText(body.choices?.[0]?.message))
    if (!proposal) return { error: 'The text model returned no creative direction. Your direction was left unchanged.' }
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
