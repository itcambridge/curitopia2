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

function suggestionText(item: unknown) {
  if (typeof item === 'string') return item
  if (!item || typeof item !== 'object') return null
  const record = item as { title?: unknown; text?: unknown }
  if (typeof record.title === 'string') return record.title
  if (typeof record.text === 'string') return record.text
  return null
}

function normalizeSuggestedTitle(value: string) {
  return value
    .trim()
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/^[-*•]\s+/, '')
}

function preparedTitle(item: unknown): { kind: TitleRejection } | { kind: 'ok'; title: string } {
  const raw = suggestionText(item)
  if (raw === null) return { kind: 'malformed' }
  const title = cleanTitle(normalizeSuggestedTitle(raw))
  if (!title) return { kind: 'empty' }
  if (title.length > maxTitleLength) return { kind: 'tooLong' }
  if (title.split(/\s+/).length > 2) return { kind: 'wordCount' }
  return { kind: 'ok', title }
}

export type TitleRejection = 'empty' | 'tooLong' | 'wordCount' | 'duplicate' | 'malformed'

export function inspectTitleSuggestions(value: unknown) {
  const rejected: Record<TitleRejection, number> = { empty: 0, tooLong: 0, wordCount: 0, duplicate: 0, malformed: 0 }
  let parsed = false
  let extracted = 0
  let passed = 0
  if (typeof value !== 'string') return { parsed, extracted, passed, rejected }
  const stripped = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  let data: unknown
  try {
    data = JSON.parse(stripped)
    parsed = true
  } catch {
    return { parsed, extracted, passed, rejected }
  }
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { titles?: unknown }).titles)
      ? (data as { titles: unknown[] }).titles
      : null
  if (!list) return { parsed, extracted, passed, rejected }
  extracted = list.length
  const seen = new Set<string>()
  for (const item of list) {
    const prepared = preparedTitle(item)
    if (prepared.kind !== 'ok') {
      rejected[prepared.kind] += 1
      continue
    }
    const key = prepared.title.toLocaleLowerCase()
    if (seen.has(key)) {
      rejected.duplicate += 1
      continue
    }
    seen.add(key)
    passed += 1
  }
  return { parsed, extracted, passed, rejected }
}

export function acceptTitleSuggestions(value: unknown): { titles: [string, string, string] } | { error: string } {
  let parsed = value
  if (typeof value === 'string') {
    const stripped = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    try {
      parsed = JSON.parse(stripped)
    } catch {
      return { error: 'The text model did not return titles. Your title was left unchanged.' }
    }
  }
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { titles?: unknown }).titles)
      ? (parsed as { titles: unknown[] }).titles
      : null
  if (!list) return { error: 'The text model did not return titles. Your title was left unchanged.' }
  const titles: string[] = []
  const seen = new Set<string>()
  for (const item of list) {
    const prepared = preparedTitle(item)
    if (prepared.kind !== 'ok') continue
    const title = prepared.title
    if (titleProblem(title)) continue
    const key = title.toLocaleLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    titles.push(title)
    if (titles.length === 3) break
  }
  if (titles.length !== 3) return { error: 'The suggestions were not three distinct one- or two-word titles. Your title was left unchanged.' }
  return { titles: [titles[0], titles[1], titles[2]] }
}

export function titleSuggestionPrompt(input: {
  consideredText: string
  metaphor: string | null
  questions: { originalText: string; consideredText: string | null }[]
  sawImage: boolean
}) {
  const questions = input.questions.slice(0, 8).map((question, index) => {
    const considered = question.consideredText?.trim()
    return `${index + 1}. Original: ${question.originalText.trim()}${considered ? `\n   Considered: ${considered}` : ''}`
  })
  return [
    'Propose exactly three titles for one concept.',
    'Each title is one word or two words. Never more. One word is valid.',
    'The three titles must be different interpretations, not small variations of one phrase.',
    'Make them distinctive, evocative, faithful to the material, and easy to remember beside other concepts.',
    'Do not invent a meaning the question and image do not support. Do not use obscure wording for its own sake.',
    'These examples show the length and specificity only. Do not copy them: "Spacetime Fusion", "Russian Blackholes".',
    'Reply with JSON only, in this shape: {"titles":["First Title","Second","Third Title"]}',
    '',
    `Considered wording the image was made for: ${input.consideredText.trim()}`,
    input.metaphor?.trim() ? `Visual metaphor: ${input.metaphor.trim()}` : 'No separate metaphor instruction was stored.',
    input.sawImage ? 'The selected image is attached. Name what it communicates with the question, not a literal inventory of objects.' : 'No image is attached. Use only the wording and metaphor above, and do not pretend you have seen a picture.',
    'Source questions:',
    questions.join('\n') || 'None supplied.',
  ].join('\n')
}
