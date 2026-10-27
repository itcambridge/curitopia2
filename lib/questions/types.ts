// Questions and saved concepts belong to the signed-in account. Candidate images
// stay in this browser until one is kept. A concept can name one question or several.

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

export type ConceptSource = {
  linkId: string
  questionId: string | null
  originalText: string
  consideredText: string | null
}

export type ConceptRecord = {
  id: string
  title: string
  imageSrc: string
  imagePath: string | null
  imageLabel: string
  imageSource: ImageSource
  model: string | null
  promptVersion: string | null
  forConsideredText: string
  anchorQuestionId: string | null
  questionIds: string[]
  sources: ConceptSource[]
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
