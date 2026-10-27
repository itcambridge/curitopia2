import { emptyWorkspace, isStageId, migrateLegacyQuestions } from '@/lib/questions/workspace'
import type { CandidateDraft, ConceptRecord, QuestionRecord, Workspace, WorkspaceRepository } from '@/lib/questions/types'

const workspaceKey = 'curitopia.v2.workspace'
const legacyKey = 'curitopia.v2.questions'

function isQuestion(value: unknown): value is QuestionRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<QuestionRecord>
  const disposition = record.disposition
  return typeof record.id === 'string'
    && typeof record.originalText === 'string'
    && typeof record.createdAt === 'string'
    && typeof record.updatedAt === 'string'
    && (record.consideredText === null || typeof record.consideredText === 'string')
    && (record.mergedIntoId === null || typeof record.mergedIntoId === 'string')
    && (disposition === 'gathered' || disposition === 'retained' || disposition === 'parked' || disposition === 'discarded')
}

function isCandidate(value: unknown): value is CandidateDraft['candidates'][number] {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<CandidateDraft['candidates'][number]>
  return typeof candidate.id === 'string'
    && typeof candidate.label === 'string'
    && typeof candidate.metaphor === 'string'
    && typeof candidate.src === 'string'
    && (candidate.source === 'openai' || candidate.source === 'demo')
}

function isDraft(value: unknown): value is CandidateDraft {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<CandidateDraft>
  return typeof draft.questionId === 'string'
    && typeof draft.forConsideredText === 'string'
    && typeof draft.notice === 'string'
    && (draft.model === null || typeof draft.model === 'string')
    && (draft.promptVersion === null || typeof draft.promptVersion === 'string')
    && (draft.reportedCostUsd === null || typeof draft.reportedCostUsd === 'number')
    && (draft.selectedId === null || typeof draft.selectedId === 'string')
    && Array.isArray(draft.rejectedIds)
    && draft.rejectedIds.every((id) => typeof id === 'string')
    && Array.isArray(draft.candidates)
    && draft.candidates.every(isCandidate)
}

function isConcept(value: unknown): value is ConceptRecord {
  if (!value || typeof value !== 'object') return false
  const concept = value as Partial<ConceptRecord>
  return typeof concept.id === 'string'
    && typeof concept.title === 'string'
    && typeof concept.imageSrc === 'string'
    && typeof concept.imageLabel === 'string'
    && (concept.imageSource === 'openai' || concept.imageSource === 'demo')
    && (concept.model === null || typeof concept.model === 'string')
    && (concept.promptVersion === null || typeof concept.promptVersion === 'string')
    && typeof concept.forConsideredText === 'string'
    && typeof concept.anchorQuestionId === 'string'
    && typeof concept.createdAt === 'string'
    && typeof concept.updatedAt === 'string'
    && Array.isArray(concept.questionIds)
    && concept.questionIds.every((id) => typeof id === 'string')
    && concept.questionIds.includes(concept.anchorQuestionId)
}

function readWorkspace(value: unknown): Workspace | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Partial<Workspace> & { version?: unknown }
  if (record.version !== 2 || !Array.isArray(record.questions) || !Array.isArray(record.drafts) || !Array.isArray(record.concepts)) return null
  const questions = record.questions.filter(isQuestion)
  const known = new Set(questions.map((item) => item.id))
  const drafts = record.drafts.filter(isDraft).filter((draft) => known.has(draft.questionId))
  const concepts = record.concepts.filter(isConcept).filter((concept) => known.has(concept.anchorQuestionId))
  return {
    stage: isStageId(record.stage) ? record.stage : 'gather',
    focusQuestionId: typeof record.focusQuestionId === 'string' && known.has(record.focusQuestionId) ? record.focusQuestionId : null,
    focusConceptId: typeof record.focusConceptId === 'string' && concepts.some((concept) => concept.id === record.focusConceptId) ? record.focusConceptId : null,
    questions,
    drafts,
    concepts,
  }
}

export class BrowserWorkspaceRepository implements WorkspaceRepository {
  load() {
    if (typeof window === 'undefined') return { workspace: emptyWorkspace(), migrated: false }
    try {
      const saved = window.localStorage.getItem(workspaceKey)
      if (saved) {
        const workspace = readWorkspace(JSON.parse(saved) as unknown)
        if (workspace) return { workspace, migrated: false }
      }
    } catch {
      // A damaged workspace falls through to the earlier question list, then to empty.
    }
    try {
      const legacy = window.localStorage.getItem(legacyKey)
      if (!legacy) return { workspace: emptyWorkspace(), migrated: false }
      const parsed = JSON.parse(legacy) as unknown
      if (!Array.isArray(parsed)) return { workspace: emptyWorkspace(), migrated: false }
      return { workspace: migrateLegacyQuestions(parsed), migrated: true }
    } catch {
      return { workspace: emptyWorkspace(), migrated: false }
    }
  }

  persist(workspace: Workspace) {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(workspaceKey, JSON.stringify({ version: 2, ...workspace }))
    window.localStorage.removeItem(legacyKey)
  }
}

export const browserWorkspaceRepository = new BrowserWorkspaceRepository()
