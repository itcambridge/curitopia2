import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { workspaceForAccount } from './account-workspace.ts'
import type { QuestionRecord, Workspace } from './types.ts'

function question(id: string, text: string): QuestionRecord {
  return {
    id,
    originalText: text,
    consideredText: null,
    disposition: 'gathered',
    mergedIntoId: null,
    createdAt: '2026-10-26T00:00:00.000Z',
    updatedAt: '2026-10-26T00:00:00.000Z',
  }
}

const browserQuestion = question('11111111-1111-4111-8111-111111111111', 'How can I make this feel more natural?')
const firstAccountQuestion = question('22222222-2222-4222-8222-222222222222', 'A question already in the first account')
const secondAccountQuestion = question('33333333-3333-4333-8333-333333333333', 'A question already in the second account')

const local: Workspace = {
  stage: 'curate',
  focusQuestionId: browserQuestion.id,
  focusConceptId: 'concept-browser',
  questions: [browserQuestion],
  drafts: [{
    questionId: browserQuestion.id,
    forConsideredText: 'cached',
    model: null,
    promptVersion: null,
    reportedCostUsd: null,
    notice: '',
    candidates: [],
    selectedId: null,
    rejectedIds: [],
  }],
  concepts: [{
    id: 'concept-browser',
    title: 'Cached',
    imageSrc: 'data:image/svg+xml,cached',
    imagePath: null,
    sources: [],
    imageLabel: 'Cached',
    imageSource: 'demo',
    model: null,
    promptVersion: null,
    forConsideredText: 'cached',
    anchorQuestionId: browserQuestion.id,
    questionIds: [browserQuestion.id],
    createdAt: '2026-10-26T00:00:00.000Z',
    updatedAt: '2026-10-26T00:00:00.000Z',
  }],
}

const firstAccount = workspaceForAccount(local, [firstAccountQuestion], [])
assert.deepEqual(firstAccount.questions.map((item) => item.id), [firstAccountQuestion.id])
assert.equal(firstAccount.drafts.length, 0)
assert.equal(firstAccount.concepts.length, 0)
assert.equal(firstAccount.focusQuestionId, null)
assert.equal(firstAccount.focusConceptId, null)
assert.equal(firstAccount.stage, 'curate')

const switched = workspaceForAccount(local, [secondAccountQuestion], [])
assert.deepEqual(switched.questions.map((item) => item.originalText), [secondAccountQuestion.originalText])
assert.equal(switched.questions.some((item) => item.id === browserQuestion.id), false)
assert.equal(switched.questions.some((item) => item.id === firstAccountQuestion.id), false)

const emptyAccount = workspaceForAccount({ ...local, questions: [firstAccountQuestion] }, [firstAccountQuestion], [])
assert.deepEqual(emptyAccount.questions.map((item) => item.id), [firstAccountQuestion.id])
assert.equal(emptyAccount.concepts.length, 0)

const startup = readFileSync(new URL('../../components/studio/use-account-workspace.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('../../components/studio/curitopia-app.tsx', import.meta.url), 'utf8')
const repository = readFileSync(new URL('./supabase-questions.ts', import.meta.url), 'utf8')
const combined = `${startup}\n${screen}\n${repository}`
for (const forbidden of [
  'question-archive',
  'import-local-questions',
  'planQuestionImport',
  'ensureQuestionArchive',
  'importQuestions',
  'local-archive',
  'Bring these questions',
]) {
  assert.equal(combined.includes(forbidden), false, forbidden)
}
assert.equal(startup.includes('workspaceForAccount'), true)
assert.equal(startup.includes('listQuestions'), true)
assert.equal(startup.includes('getCuriosity'), true)
assert.equal(startup.includes('curiosityDraftRepository'), true)
assert.equal(repository.includes(".eq('curiosity_id', curiosityId)"), true)
assert.equal(repository.includes('curiosity_id: curiosityId'), true)

console.log('account workspace checks passed')
