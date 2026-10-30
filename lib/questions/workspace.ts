import type { ImageSetResult } from '../providers/types'
import { groupSimilarIds } from './duplicates.ts'
import { cleanTitle, titleProblem } from './title.ts'
import type { CandidateDraft, ConceptRecord, Disposition, QuestionBranch, QuestionRecord, StageId, StoredCandidate, Workspace } from './types'

const stages: StageId[] = ['gather', 'curate', 'visualise', 'distil', 'library']

export function emptyWorkspace(): Workspace {
  return { stage: 'gather', focusQuestionId: null, focusConceptId: null, questions: [], branches: [], drafts: [], concepts: [] }
}

export function isStageId(value: unknown): value is StageId {
  return typeof value === 'string' && stages.includes(value as StageId)
}

function now() {
  return new Date().toISOString()
}

function question(workspace: Workspace, id: string) {
  return workspace.questions.find((item) => item.id === id) ?? null
}

export function createQuestion(originalText: string): QuestionRecord {
  const stamp = now()
  return {
    id: crypto.randomUUID(),
    originalText,
    consideredText: null,
    disposition: 'gathered',
    mergedIntoId: null,
    createdAt: stamp,
    updatedAt: stamp,
  }
}

export function plantedQuestion(text: string) {
  const trimmed = text.trim()
  if (!trimmed || trimmed.endsWith('?')) return trimmed
  return `${trimmed}?`
}

export function addQuestion(workspace: Workspace, text: string) {
  const originalText = text.trim()
  if (!originalText || originalText.length > 2000) return workspace
  const created = createQuestion(originalText)
  return { ...workspace, questions: [created, ...workspace.questions], focusQuestionId: created.id }
}

export function correctOriginal(workspace: Workspace, id: string, text: string) {
  const originalText = text.trim()
  if (!originalText || originalText.length > 2000) return workspace
  return {
    ...workspace,
    questions: workspace.questions.map((item) => item.id === id ? { ...item, originalText, updatedAt: now() } : item),
  }
}

export function setDisposition(workspace: Workspace, id: string, disposition: Disposition) {
  const current = question(workspace, id)
  if (!current || current.mergedIntoId) return workspace
  return {
    ...workspace,
    questions: workspace.questions.map((item) => item.id === id ? { ...item, disposition, updatedAt: now() } : item),
  }
}

export function restoreQuestion(workspace: Workspace, id: string) {
  const current = question(workspace, id)
  if (!current) return workspace
  return {
    ...workspace,
    questions: workspace.questions.map((item) => item.id === id
      ? { ...item, disposition: 'gathered' as const, mergedIntoId: null, updatedAt: now() }
      : item),
  }
}

function pointsAt(workspace: Workspace, startId: string, targetId: string) {
  let current = question(workspace, startId)?.mergedIntoId ?? null
  const seen = new Set<string>()
  while (current && !seen.has(current)) {
    if (current === targetId) return true
    seen.add(current)
    current = question(workspace, current)?.mergedIntoId ?? null
  }
  return false
}

export function orderedQuestionIds(leftId: string, rightId: string): [string, string] {
  return leftId.toLowerCase() < rightId.toLowerCase() ? [leftId, rightId] : [rightId, leftId]
}

export function linkQuestions(workspace: Workspace, leftId: string, rightId: string) {
  if (leftId === rightId) return workspace
  const left = question(workspace, leftId)
  const right = question(workspace, rightId)
  if (!left || !right || left.mergedIntoId || right.mergedIntoId) return workspace
  const [questionLowId, questionHighId] = orderedQuestionIds(leftId, rightId)
  if (workspace.branches.some((branch) => branch.questionLowId === questionLowId && branch.questionHighId === questionHighId)) return workspace
  const branch: QuestionBranch = { id: crypto.randomUUID(), questionLowId, questionHighId, createdAt: now() }
  return { ...workspace, branches: [...workspace.branches, branch] }
}

export function removeBranch(workspace: Workspace, id: string) {
  if (!workspace.branches.some((branch) => branch.id === id)) return workspace
  return { ...workspace, branches: workspace.branches.filter((branch) => branch.id !== id) }
}

export function branchPartners(workspace: Workspace, id: string) {
  return workspace.branches.flatMap((branch) => {
    const otherId = branch.questionLowId === id ? branch.questionHighId : branch.questionHighId === id ? branch.questionLowId : null
    if (!otherId) return []
    const other = question(workspace, otherId)
    return other ? [other] : []
  })
}

export function mergeQuestions(workspace: Workspace, sourceId: string, survivorId: string) {
  if (sourceId === survivorId) return workspace
  const source = question(workspace, sourceId)
  const survivor = question(workspace, survivorId)
  if (!source || !survivor || source.mergedIntoId || survivor.mergedIntoId) return workspace
  if (pointsAt(workspace, survivorId, sourceId)) return workspace
  const stamp = now()
  return {
    ...workspace,
    questions: workspace.questions.map((item) => {
      if (item.id === sourceId) return { ...item, mergedIntoId: survivorId, updatedAt: stamp }
      if (item.id === survivorId) return { ...item, updatedAt: stamp }
      return item
    }),
  }
}

export function acceptConsidered(workspace: Workspace, id: string, text: string) {
  const consideredText = text.trim()
  if (!consideredText || consideredText.length > 2000) return workspace
  const current = question(workspace, id)
  if (!current || current.mergedIntoId) return workspace
  return {
    ...workspace,
    focusQuestionId: id,
    questions: workspace.questions.map((item) => item.id === id ? { ...item, consideredText, updatedAt: now() } : item),
  }
}

export function draftFor(workspace: Workspace, questionId: string) {
  return workspace.drafts.find((draft) => draft.questionId === questionId) ?? null
}

export function draftIsCurrent(item: QuestionRecord, draft: CandidateDraft | null) {
  return Boolean(draft && item.consideredText && draft.forConsideredText === item.consideredText)
}

export function applyImageResult(workspace: Workspace, questionId: string, result: ImageSetResult, forConsideredText: string) {
  if (result.candidates.length === 0 || !forConsideredText.trim()) return workspace
  if (!question(workspace, questionId)) return workspace
  const draft: CandidateDraft = {
    questionId,
    forConsideredText,
    model: result.model,
    promptVersion: result.promptVersion,
    reportedCostUsd: result.reportedCostUsd,
    notice: result.notice,
    candidates: result.candidates.map((candidate): StoredCandidate => ({
      id: candidate.id,
      label: candidate.label,
      metaphor: candidate.metaphor,
      src: candidate.src,
      source: candidate.source,
    })),
    selectedId: null,
    rejectedIds: [],
  }
  const rest = workspace.drafts.filter((itemDraft) => itemDraft.questionId !== questionId)
  return { ...workspace, drafts: [draft, ...rest], focusQuestionId: questionId }
}

export function rejectCandidate(workspace: Workspace, questionId: string, candidateId: string) {
  return {
    ...workspace,
    drafts: workspace.drafts.map((draft) => draft.questionId === questionId
      ? {
          ...draft,
          rejectedIds: draft.rejectedIds.includes(candidateId) ? draft.rejectedIds : [...draft.rejectedIds, candidateId],
          selectedId: draft.selectedId === candidateId ? null : draft.selectedId,
        }
      : draft),
  }
}

export function restoreCandidate(workspace: Workspace, questionId: string, candidateId: string) {
  return {
    ...workspace,
    drafts: workspace.drafts.map((draft) => draft.questionId === questionId
      ? { ...draft, rejectedIds: draft.rejectedIds.filter((id) => id !== candidateId) }
      : draft),
  }
}

export function selectCandidate(workspace: Workspace, questionId: string, candidateId: string) {
  const draft = draftFor(workspace, questionId)
  if (!draft || draft.rejectedIds.includes(candidateId)) return workspace
  if (!draft.candidates.some((candidate) => candidate.id === candidateId)) return workspace
  return {
    ...workspace,
    focusQuestionId: questionId,
    drafts: workspace.drafts.map((item) => item.questionId === questionId ? { ...item, selectedId: candidateId } : item),
  }
}

export function selectedCandidate(workspace: Workspace, questionId: string) {
  const item = question(workspace, questionId)
  const draft = draftFor(workspace, questionId)
  if (!item || !draft || !draftIsCurrent(item, draft) || !draft.selectedId) return null
  if (draft.rejectedIds.includes(draft.selectedId)) return null
  return draft.candidates.find((candidate) => candidate.id === draft.selectedId) ?? null
}

export function conceptForAnchor(workspace: Workspace, anchorQuestionId: string) {
  return workspace.concepts.find((concept) => concept.anchorQuestionId === anchorQuestionId) ?? null
}

function relatedIds(workspace: Workspace, anchorId: string, extraIds: string[]) {
  const allowed = new Set(workspace.questions.filter((item) => !item.mergedIntoId && item.disposition !== 'discarded').map((item) => item.id))
  const ids = [anchorId, ...extraIds.filter((id) => id !== anchorId && allowed.has(id))]
  return [...new Set(ids)]
}

export function saveConcept(workspace: Workspace, anchorId: string, title: string, extraIds: string[]): Workspace {
  if (titleProblem(title)) return workspace
  const item = question(workspace, anchorId)
  const chosen = selectedCandidate(workspace, anchorId)
  const draft = draftFor(workspace, anchorId)
  if (!item?.consideredText || !chosen || !draft) return workspace
  const stamp = now()
  const concept: ConceptRecord = {
    id: crypto.randomUUID(),
    title: cleanTitle(title),
    imageSrc: chosen.src,
    imagePath: null,
    imageLabel: chosen.label,
    imageSource: chosen.source,
    model: draft.model,
    promptVersion: draft.promptVersion,
    forConsideredText: draft.forConsideredText.trim(),
    anchorQuestionId: anchorId,
    questionIds: relatedIds(workspace, anchorId, extraIds),
    sources: [],
    createdAt: stamp,
    updatedAt: stamp,
  }
  const concepts = [concept, ...workspace.concepts]
  return {
    ...workspace,
    concepts,
    drafts: workspace.drafts.filter((itemDraft) => itemDraft.questionId !== anchorId),
    focusConceptId: concept.id,
    focusQuestionId: anchorId,
    stage: 'distil' as const,
  }
}

export function updateConcept(workspace: Workspace, conceptId: string, title: string, extraIds: string[]) {
  if (titleProblem(title)) return workspace
  const current = workspace.concepts.find((concept) => concept.id === conceptId)
  if (!current) return workspace
  return {
    ...workspace,
    focusConceptId: conceptId,
    concepts: workspace.concepts.map((concept) => concept.id === conceptId
      ? {
          ...concept,
          title: cleanTitle(title),
          questionIds: concept.anchorQuestionId
            ? relatedIds(workspace, concept.anchorQuestionId, extraIds)
            : concept.questionIds,
          updatedAt: now(),
        }
      : concept),
  }
}

export function foldedQuestions(workspace: Workspace, id: string): QuestionRecord[] {
  const direct = workspace.questions.filter((item) => item.mergedIntoId === id)
  return direct.flatMap((item) => [item, ...foldedQuestions(workspace, item.id)])
}

export function reviewQuestions(workspace: Workspace) {
  return workspace.questions.filter((item) => !item.mergedIntoId && item.disposition !== 'discarded')
}

export function duplicateGroups(workspace: Workspace) {
  const eligible = workspace.questions.filter((item) => !item.mergedIntoId && item.disposition !== 'discarded')
  return groupSimilarIds(eligible.map((item) => ({ id: item.id, text: item.originalText })))
}

export function workspaceCounts(workspace: Workspace) {
  const open = workspace.questions.filter((item) => !item.mergedIntoId)
  return {
    gathered: open.filter((item) => item.disposition === 'gathered').length,
    retained: open.filter((item) => item.disposition === 'retained').length,
    parked: open.filter((item) => item.disposition === 'parked').length,
    discarded: open.filter((item) => item.disposition === 'discarded').length,
    merged: workspace.questions.filter((item) => item.mergedIntoId).length,
    images: workspace.drafts.filter((draft) => draft.candidates.length > 0).length,
    concepts: workspace.concepts.length,
    questions: open.length,
  }
}

export function questionPlace(workspace: Workspace, item: QuestionRecord) {
  if (item.mergedIntoId) return 'Merged'
  if (item.disposition === 'parked') return 'Parked'
  if (item.disposition === 'discarded') return 'Discarded'
  if (workspace.concepts.some((concept) => concept.questionIds.includes(item.id))) return 'In a concept'
  const draft = draftFor(workspace, item.id)
  if (draft && draftIsCurrent(item, draft) && draft.selectedId && !draft.rejectedIds.includes(draft.selectedId)) return 'Image chosen'
  if (draft?.candidates.length) return 'Images to compare'
  if (item.disposition === 'retained') return 'Retained'
  return 'Gathered'
}

type LegacyQuestion = {
  id?: unknown
  originalText?: unknown
  consideredText?: unknown
  imageTitle?: unknown
  imageSrc?: unknown
  imageLabel?: unknown
  imageSource?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

export function migrateLegacyQuestions(records: unknown[]): Workspace {
  const workspace = emptyWorkspace()
  if (!Array.isArray(records)) return workspace
  for (const value of records) {
    if (!value || typeof value !== 'object') continue
    const record = value as LegacyQuestion
    if (typeof record.id !== 'string' || typeof record.originalText !== 'string' || typeof record.createdAt !== 'string') continue
    const consideredText = typeof record.consideredText === 'string' && record.consideredText.trim() ? record.consideredText : null
    const imageSrc = typeof record.imageSrc === 'string' && record.imageSrc ? record.imageSrc : null
    const imageTitle = typeof record.imageTitle === 'string' && record.imageTitle.trim() ? record.imageTitle.trim() : null
    const updatedAt = typeof record.updatedAt === 'string' ? record.updatedAt : record.createdAt
    workspace.questions.push({
      id: record.id,
      originalText: record.originalText,
      consideredText,
      disposition: consideredText || imageSrc ? 'retained' : 'gathered',
      mergedIntoId: null,
      createdAt: record.createdAt,
      updatedAt,
    })
    if (imageSrc && imageTitle && consideredText && !titleProblem(imageTitle)) {
      workspace.concepts.push({
        id: crypto.randomUUID(),
        title: cleanTitle(imageTitle),
        imageSrc,
        imageLabel: typeof record.imageLabel === 'string' && record.imageLabel ? record.imageLabel : 'Chosen',
        imageSource: record.imageSource === 'demo' ? 'demo' : 'openai',
        model: null,
        promptVersion: null,
        forConsideredText: consideredText,
        imagePath: null,
        anchorQuestionId: record.id,
        questionIds: [record.id],
        sources: [],
        createdAt: updatedAt,
        updatedAt,
      })
    }
  }
  if (workspace.concepts.length > 0) workspace.stage = 'library'
  return workspace
}
