// Questions are stored in the signed-in account. Drafts and concepts stay in this
// browser until a later phase. A concept can name one question or several.

export type StageId = 'gather' | 'curate' | 'visualise' | 'distil' | 'library'

export type Disposition = 'gathered' | 'retained' | 'parked' | 'discarded'

export type ImageSource = 'openai' | 'demo'

export type QuestionRecord = {
  id: string
  originalText: string
  consideredText: string | null
  disposition: Disposition
  mergedIntoId: string | null
  createdAt: string
  updatedAt: string
}

export type StoredCandidate = {
  id: string
  label: string
  metaphor: string
  src: string
  source: ImageSource
}

export type CandidateDraft = {
  questionId: string
  forConsideredText: string
  model: string | null
  promptVersion: string | null
  reportedCostUsd: number | null
  notice: string
  candidates: StoredCandidate[]
  selectedId: string | null
  rejectedIds: string[]
}

export type ConceptRecord = {
  id: string
  title: string
  imageSrc: string
  imageLabel: string
  imageSource: ImageSource
  model: string | null
  promptVersion: string | null
  forConsideredText: string
  anchorQuestionId: string
  questionIds: string[]
  createdAt: string
  updatedAt: string
}

export type Workspace = {
  stage: StageId
  focusQuestionId: string | null
  focusConceptId: string | null
  questions: QuestionRecord[]
  drafts: CandidateDraft[]
  concepts: ConceptRecord[]
}

export type WorkspaceRepository = {
  load(): { workspace: Workspace; migrated: boolean }
  persist(workspace: Workspace): void
}
