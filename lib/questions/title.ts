const maxTitleLength = 40

export function titleProblem(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return 'Add a one- or two-word title.'
  if (trimmed.length > maxTitleLength) return 'Keep the title within 40 characters.'
  const words = trimmed.split(/\s+/)
  if (words.length > 2) return 'Use one or two words.'
  return null
}

export function cleanTitle(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

const verifiedImageInputModels = new Set(['gpt-6-luna'])

export function textModelCanSeeImages(model: string) {
  const id = model.trim().toLowerCase()
  return verifiedImageInputModels.has(id) || id.startsWith('gpt-6-luna-')
}

export function titleImageUrl(model: string, src: string | null | undefined) {
  if (!src?.trim()) return { url: null, reason: 'missing' as const }
  if (!textModelCanSeeImages(model)) return { url: null, reason: 'model' as const }
  const trimmed = src.trim()
  if (trimmed.length > 12_000_000) return { url: null, reason: 'unsupported' as const }
  if (/^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(trimmed)) return { url: trimmed, reason: 'seen' as const }
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'https:' && /\.(png|jpe?g|webp|gif)$/i.test(parsed.pathname)) return { url: trimmed, reason: 'seen' as const }
  } catch {
    return { url: null, reason: 'unsupported' as const }
  }
  return { url: null, reason: 'unsupported' as const }
}

export function titleSuggestionPrompt(input: {
  consideredText: string
  metaphor: string | null
  questions: { originalText: string; consideredText: string | null }[]
  sawImage: boolean
  sourceLabel?: string
}) {
  const questions = input.questions.slice(0, 8).map((question, index) => {
    const considered = question.consideredText?.trim()
    return `${index + 1}. Original: ${question.originalText.trim()}${considered ? `\n   Considered: ${considered}` : ''}`
  })
  return [
    'Name the metaphor. Do not write a slogan, a sentence, or a description of the whole concept.',
    'Propose exactly three different titles.',
    'Each title is one natural English word, or two natural English words separated by a single space. One word is valid.',
    'Use ordinary words. Do not invent a compound, concatenate words, use camel case, or compress a phrase into one token.',
    'Make each title evocative and memorable.',
    'Avoid a leading "The" unless the title is weaker without it.',
    input.sourceLabel === 'Source topic:'
      ? 'Stay faithful to the selected image and the source topic. Do not invent a meaning they do not support.'
      : 'Stay faithful to the selected image and the source questions. Do not invent a meaning they do not support.',
    'These show the style only. Do not copy them unless the material itself asks for those words: "Kindness", "Gentle Guidance", "Clear Paths", "Quiet Confidence", "Clarity", "New Beginnings".',
    'Reply with JSON only, in this shape: {"titles":["First Title","Second","Third Title"]}',
    '',
    `Considered wording the image was made for: ${input.consideredText.trim()}`,
    input.metaphor?.trim() ? `Visual metaphor: ${input.metaphor.trim()}` : 'No separate metaphor instruction was stored.',
    input.sawImage ? 'The selected image is attached. Name what it communicates with the question, not a literal inventory of objects.' : 'No image is attached. Use only the wording and metaphor above, and do not pretend you have seen a picture.',
    input.sourceLabel ?? 'Source questions:',
    questions.join('\n') || 'None supplied.',
  ].join('\n')
}
