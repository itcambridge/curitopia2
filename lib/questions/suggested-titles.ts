import { isEnglishWord, isJoinedEnglishWords } from './title-dictionary.ts'
import { cleanTitle } from './title.ts'

const maxTitleLength = 40

export type TitleRejection = 'empty' | 'tooLong' | 'wordCount' | 'duplicate' | 'malformed' | 'joined'

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

function ordinaryWord(word: string) {
  return /^[A-Za-z][a-z]*(?:'[a-z]+)?$/.test(word)
}

function suggestionIssue(title: string): TitleRejection | null {
  if (!title) return 'empty'
  if (title.length > maxTitleLength) return 'tooLong'
  const words = title.split(' ')
  if (words.length > 2) return 'wordCount'
  for (const word of words) {
    if (!ordinaryWord(word)) return 'joined'
    if (isEnglishWord(word)) continue
    if (isJoinedEnglishWords(word)) return 'joined'
  }
  return null
}

export function suggestedTitleProblem(value: string) {
  const issue = suggestionIssue(cleanTitle(value))
  if (!issue) return null
  if (issue === 'empty') return 'Add a one- or two-word title.'
  if (issue === 'tooLong') return 'Keep the title within 40 characters.'
  if (issue === 'wordCount') return 'Use one or two words.'
  return 'Use one or two ordinary English words, with a space between them.'
}

function preparedTitle(item: unknown): { kind: TitleRejection } | { kind: 'ok'; title: string } {
  const raw = suggestionText(item)
  if (raw === null) return { kind: 'malformed' }
  const title = cleanTitle(normalizeSuggestedTitle(raw))
  const issue = suggestionIssue(title)
  if (issue) return { kind: issue }
  return { kind: 'ok', title }
}

function titleList(value: unknown) {
  let parsed = value
  if (typeof value === 'string') {
    const stripped = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    try {
      parsed = JSON.parse(stripped)
    } catch {
      return null
    }
  }
  if (Array.isArray(parsed)) return parsed
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { titles?: unknown }).titles)) {
    return (parsed as { titles: unknown[] }).titles
  }
  return null
}

export function inspectTitleSuggestions(value: unknown) {
  const rejected: Record<TitleRejection, number> = { empty: 0, tooLong: 0, wordCount: 0, duplicate: 0, malformed: 0, joined: 0 }
  let parsed = false
  let extracted = 0
  let passed = 0
  if (typeof value !== 'string') return { parsed, extracted, passed, rejected }
  const stripped = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  try {
    JSON.parse(stripped)
    parsed = true
  } catch {
    return { parsed, extracted, passed, rejected }
  }
  const list = titleList(value)
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

export function collectSuggestedTitles(value: unknown, reserved: readonly string[] = []) {
  const list = titleList(value)
  if (!list) return []
  const seen = new Set(reserved.map((title) => title.toLocaleLowerCase()))
  const titles: string[] = []
  for (const item of list) {
    const prepared = preparedTitle(item)
    if (prepared.kind !== 'ok') continue
    const key = prepared.title.toLocaleLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    titles.push(prepared.title)
    if (reserved.length + titles.length === 3) break
  }
  return titles
}

export function acceptTitleSuggestions(value: unknown): { titles: string[] } | { error: string } {
  if (!titleList(value)) return { error: 'The text model did not return titles. Your title was left unchanged.' }
  const titles = collectSuggestedTitles(value)
  if (titles.length === 0) return { error: 'The suggestions were not usable one- or two-word titles. Your title was left unchanged.' }
  return { titles }
}

function replacementNote(kept: readonly string[], needed: number) {
  return [
    kept.length ? `Keep these titles, and do not repeat them: ${kept.join(', ')}.` : 'None of the previous titles could be used.',
    needed === 1 ? 'Supply one new title to fill the gap.' : `Supply ${needed} new titles to fill the gaps.`,
    'Each new title is one natural English word, or two natural English words separated by a single space.',
    'Do not concatenate words, use camel case, or compress a phrase.',
  ].join(' ')
}

export async function resolveTitleSuggestions(
  ask: (prompt: string) => Promise<{ content: string } | { error: string }>,
  prompt: string,
): Promise<{ titles: string[] } | { error: string }> {
  const first = await ask(prompt)
  if ('error' in first) return first
  const kept = collectSuggestedTitles(first.content)
  if (kept.length >= 3) return { titles: kept }
  const second = await ask(`${prompt}\n\n${replacementNote(kept, 3 - kept.length)}`)
  if ('error' in second) return kept.length > 0 ? { titles: kept } : second
  const titles = [...kept, ...collectSuggestedTitles(second.content, kept)]
  if (titles.length === 0) return { error: 'The suggestions were not usable one- or two-word titles. Your title was left unchanged.' }
  return { titles }
}
