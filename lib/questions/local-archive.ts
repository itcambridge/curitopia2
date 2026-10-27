import type { CandidateDraft, ConceptRecord, QuestionRecord } from '@/lib/questions/types'

const archiveKey = 'curitopia.v2.question-archive'

export type QuestionArchive = {
  version: 1
  questions: QuestionRecord[]
  drafts: CandidateDraft[]
  concepts: ConceptRecord[]
  confirmedIds: string[]
}

function emptyArchive(): QuestionArchive {
  return { version: 1, questions: [], drafts: [], concepts: [], confirmedIds: [] }
}

export function readQuestionArchive(): QuestionArchive | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(archiveKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<QuestionArchive>
    if (parsed.version !== 1 || !Array.isArray(parsed.questions) || !Array.isArray(parsed.confirmedIds)) return null
    return {
      version: 1,
      questions: parsed.questions,
      drafts: Array.isArray(parsed.drafts) ? parsed.drafts : [],
      concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
      confirmedIds: parsed.confirmedIds.filter((id): id is string => typeof id === 'string'),
    }
  } catch {
    return null
  }
}

function writeArchive(archive: QuestionArchive) {
  window.localStorage.setItem(archiveKey, JSON.stringify(archive))
}

export function ensureQuestionArchive(questions: QuestionRecord[], drafts: CandidateDraft[], concepts: ConceptRecord[]) {
  if (typeof window === 'undefined') return readQuestionArchive()
  const existing = readQuestionArchive()
  if (existing) return existing
  if (questions.length === 0 && drafts.length === 0 && concepts.length === 0) return null
  const created = { ...emptyArchive(), questions, drafts, concepts }
  writeArchive(created)
  return created
}

export function rememberUnsavedQuestions(questions: QuestionRecord[]) {
  const archive = readQuestionArchive() ?? emptyArchive()
  const known = new Set(archive.questions.map((item) => item.id))
  const added = questions.filter((item) => !known.has(item.id))
  if (added.length === 0) return archive
  const next = { ...archive, questions: [...archive.questions, ...added] }
  writeArchive(next)
  return next
}

export function confirmImportedQuestions(ids: string[]) {
  const archive = readQuestionArchive()
  if (!archive) return
  const confirmedIds = [...new Set([...archive.confirmedIds, ...ids])]
  writeArchive({ ...archive, confirmedIds })
}
