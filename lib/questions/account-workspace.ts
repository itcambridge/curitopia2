import type { ConceptRecord, QuestionBranch, QuestionRecord, Workspace } from '@/lib/questions/types'

// Questions and saved concepts on screen come only from the signed-in account.
// Browser drafts stay only when they still point at one of that account's questions.
export function workspaceForAccount(
  local: Workspace,
  accountQuestions: QuestionRecord[],
  accountConcepts: ConceptRecord[],
  accountBranches: QuestionBranch[] = [],
): Workspace {
  const known = new Set(accountQuestions.map((item) => item.id))
  return {
    stage: local.stage,
    focusQuestionId: local.focusQuestionId && known.has(local.focusQuestionId) ? local.focusQuestionId : null,
    focusConceptId: local.focusConceptId && accountConcepts.some((concept) => concept.id === local.focusConceptId) ? local.focusConceptId : null,
    questions: accountQuestions,
    branches: accountBranches.filter((branch) => known.has(branch.questionLowId) && known.has(branch.questionHighId)),
    drafts: local.drafts.filter((draft) => known.has(draft.questionId)),
    concepts: accountConcepts,
  }
}
