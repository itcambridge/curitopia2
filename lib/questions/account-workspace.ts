import type { QuestionRecord, Workspace } from '@/lib/questions/types'

// Questions on screen come only from the signed-in account. Browser drafts and
// concepts stay only when they still point at one of those questions.
export function workspaceForAccount(local: Workspace, accountQuestions: QuestionRecord[]): Workspace {
  const known = new Set(accountQuestions.map((item) => item.id))
  const concepts = local.concepts.filter((concept) => known.has(concept.anchorQuestionId))
  return {
    stage: local.stage,
    focusQuestionId: local.focusQuestionId && known.has(local.focusQuestionId) ? local.focusQuestionId : null,
    focusConceptId: local.focusConceptId && concepts.some((concept) => concept.id === local.focusConceptId) ? local.focusConceptId : null,
    questions: accountQuestions,
    drafts: local.drafts.filter((draft) => known.has(draft.questionId)),
    concepts,
  }
}
