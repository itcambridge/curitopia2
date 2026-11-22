import { readFileSync } from 'node:fs'
import en from 'dictionary-en'
import wordListPath from 'word-list'

// Quality check only. OpenAI still writes the titles.
// Loaded once on the server, and not imported by browser code.
// word-list, MIT, supplies inflected English words.
// dictionary-en, dictionary data under MIT AND BSD, supplies SCOWL entries
// including established words that the word-game list omits.

let words: Set<string> | null = null

function englishWords() {
  if (words) return words
  const loaded = new Set<string>()
  for (const word of readFileSync(wordListPath, 'utf8').split('\n')) {
    if (word) loaded.add(word)
  }
  const dic = Buffer.from(en.dic).toString('utf8')
  for (const line of dic.split('\n')) {
    const stem = line.split('/')[0]?.trim().toLowerCase()
    if (stem && /^[a-z]+(?:'[a-z]+)?$/.test(stem)) loaded.add(stem)
  }
  words = loaded
  return words
}

export function isEnglishWord(word: string) {
  return englishWords().has(word.toLowerCase())
}

export function isJoinedEnglishWords(token: string) {
  const lower = token.toLowerCase()
  const known = englishWords()
  if (known.has(lower)) return false
  const reachable = Array<boolean>(lower.length + 1).fill(false)
  reachable[0] = true
  for (let start = 0; start < lower.length; start += 1) {
    if (!reachable[start]) continue
    for (let end = start + 2; end <= lower.length; end += 1) {
      if (known.has(lower.slice(start, end))) reachable[end] = true
    }
  }
  return reachable[lower.length]
}
