import { considerWouldCallProvider, imagesWouldCallProvider, titlesWouldCallProvider, type AiEndpoint, type AiSession } from './policy.ts'
import { configuredTextModel, requestTitleSuggestions } from '../providers/title-suggestions.ts'
import type { ConsiderResult, ImageSetResult } from '../providers/types.ts'
import { acceptTitleSuggestions, inspectTitleSuggestions, titleImageUrl, titleSuggestionPrompt } from '../questions/title.ts'

type Gate = {
  session: AiSession
  authenticate: (endpoint: AiEndpoint, session: AiSession) => Promise<Response | { userId: string }>
  reserve: (endpoint: AiEndpoint, session: AiSession) => Promise<Response | null>
}

export async function considerHttp(
  request: Request,
  gate: Gate,
  consider: (original: string, attempt: number) => Promise<ConsiderResult>,
) {
  const auth = await gate.authenticate('consider', gate.session)
  if (auth instanceof Response) return auth

  let body: { originalText?: unknown; attempt?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'The request could not be read.' }, { status: 400 })
  }
  const originalText = typeof body.originalText === 'string' ? body.originalText.trim() : ''
  const attempt = typeof body.attempt === 'number' && Number.isInteger(body.attempt) && body.attempt >= 0 ? body.attempt : 0
  if (!originalText || originalText.length > 2000) {
    return Response.json({ error: 'Write a question of 1 to 2000 characters first.' }, { status: 400 })
  }
  if (considerWouldCallProvider()) {
    const limited = await gate.reserve('consider', gate.session)
    if (limited) return limited
  }
  return Response.json(await consider(originalText, attempt))
}

export async function imagesHttp(
  request: Request,
  gate: Gate,
  interpret: (considered: string, signal?: AbortSignal) => Promise<ImageSetResult>,
) {
  const auth = await gate.authenticate('images', gate.session)
  if (auth instanceof Response) return auth

  let body: { consideredText?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'The request could not be read.' }, { status: 400 })
  }
  const consideredText = typeof body.consideredText === 'string' ? body.consideredText.trim() : ''
  if (!consideredText || consideredText.length > 2000) {
    return Response.json({ error: 'Save a considered question before asking for images.' }, { status: 400 })
  }
  if (imagesWouldCallProvider()) {
    const limited = await gate.reserve('images', gate.session)
    if (limited) return limited
  }
  return Response.json(await interpret(consideredText, request.signal))
}

type QuestionInput = { originalText?: unknown; consideredText?: unknown }

function questionInput(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const record = value as QuestionInput
  const originalText = typeof record.originalText === 'string' ? record.originalText.trim() : ''
  const considered = typeof record.consideredText === 'string' ? record.consideredText.trim() : ''
  if (!originalText || originalText.length > 2000 || considered.length > 2000) return null
  return { originalText, consideredText: considered || null }
}

export async function titlesHttp(request: Request, gate: Gate) {
  const auth = await gate.authenticate('titles', gate.session)
  if (auth instanceof Response) return auth

  let body: { consideredText?: unknown; metaphor?: unknown; imageSrc?: unknown; questions?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'The request could not be read. Your title was left unchanged.' }, { status: 400 })
  }

  const consideredText = typeof body.consideredText === 'string' ? body.consideredText.trim() : ''
  const metaphor = typeof body.metaphor === 'string' ? body.metaphor.trim() : ''
  const imageSrc = typeof body.imageSrc === 'string' ? body.imageSrc : null
  const questions = Array.isArray(body.questions) ? body.questions.flatMap((item) => {
    const question = questionInput(item)
    return question ? [question] : []
  }).slice(0, 8) : []
  if (!consideredText || consideredText.length > 2000 || metaphor.length > 2000) {
    return Response.json({ error: 'A considered question is needed before titles can be suggested. You can still type a title.' }, { status: 400 })
  }

  const model = configuredTextModel({
    OPENAI_TEXT_MODEL: process.env.OPENAI_TEXT_MODEL,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  })
  if (titlesWouldCallProvider(model)) {
    const limited = await gate.reserve('titles', gate.session)
    if (limited) return limited
  }
  if (!process.env.OPENAI_API_KEY?.trim() || !model) {
    return Response.json({ error: 'No text model is connected. Type a one- or two-word title yourself.' })
  }

  const image = titleImageUrl(model, imageSrc)
  const requested = await requestTitleSuggestions({
    apiKey: process.env.OPENAI_API_KEY?.trim() ?? '',
    model,
    imageUrl: image.url,
    prompt: titleSuggestionPrompt({
      consideredText,
      metaphor: metaphor || null,
      questions,
      sawImage: image.reason === 'seen',
    }),
  })
  console.info(JSON.stringify({
    titleSuggestion: {
      model,
      httpStatus: requested.httpStatus,
      ok: requested.ok,
      finishReason: requested.finishReason,
      contentPresent: requested.contentPresent,
      contentType: requested.contentType,
      ...('content' in requested ? inspectTitleSuggestions(requested.content) : { parsed: false, extracted: 0, passed: 0 }),
    },
  }))
  if ('error' in requested) return Response.json({ error: requested.error })

  const accepted = acceptTitleSuggestions(requested.content)
  if ('error' in accepted) return Response.json({ error: accepted.error })

  const notice = image.reason === 'seen'
    ? 'These suggestions used the selected image and the source questions. Choosing one only fills the title. Nothing is saved until you save the concept.'
    : image.reason === 'model'
      ? 'These suggestions used the wording only. This text model was not given the image, because that capability is not confirmed for it. Nothing is saved until you save the concept.'
      : 'These suggestions used the wording and metaphor only. This image was not shown to the text model. Nothing is saved until you save the concept.'
  return Response.json({ titles: accepted.titles, notice, sawImage: image.reason === 'seen' })
}
