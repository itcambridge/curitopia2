import { configuredTextModel, requestTitleSuggestions } from '@/lib/providers/title-suggestions'
import { acceptTitleSuggestions, inspectTitleSuggestions, titleImageUrl, titleSuggestionPrompt } from '@/lib/questions/title'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type QuestionInput = { originalText?: unknown; consideredText?: unknown }

function questionInput(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const record = value as QuestionInput
  const originalText = typeof record.originalText === 'string' ? record.originalText.trim() : ''
  const considered = typeof record.consideredText === 'string' ? record.consideredText.trim() : ''
  if (!originalText || originalText.length > 2000 || considered.length > 2000) return null
  return { originalText, consideredText: considered || null }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data, error: userError } = await supabase.auth.getUser()
  if (userError || !data.user) {
    return Response.json({ error: 'Sign in again before asking for titles. You can still type a title.' }, { status: 401 })
  }

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

  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? ''
  const model = configuredTextModel({
    OPENAI_TEXT_MODEL: process.env.OPENAI_TEXT_MODEL,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  })
  if (!apiKey || !model) {
    return Response.json({ error: 'No text model is connected. Type a one- or two-word title yourself.' })
  }

  const image = titleImageUrl(model, imageSrc)
  const requested = await requestTitleSuggestions({
    apiKey,
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
