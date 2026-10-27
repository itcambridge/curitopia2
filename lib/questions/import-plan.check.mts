import assert from 'node:assert/strict'
import { planQuestionImport } from './import-plan.ts'
import type { QuestionRecord } from './types.ts'

function question(id: string, text: string, extra: Partial<QuestionRecord> = {}): QuestionRecord {
  return {
    id,
    originalText: text,
    consideredText: null,
    disposition: 'gathered',
    mergedIntoId: null,
    createdAt: '2026-10-26T00:00:00.000Z',
    updatedAt: '2026-10-26T00:00:00.000Z',
    ...extra,
  }
}

const source = '11111111-1111-4111-8111-111111111111'
const survivor = '22222222-2222-4222-8222-222222222222'
const remoteId = '33333333-3333-4333-8333-333333333333'

const plan = planQuestionImport(
  [
    question(source, '  The room still feels far  ', { mergedIntoId: survivor, disposition: 'retained' }),
    question(survivor, 'Two notices share one root'),
    question(remoteId, 'Already saved'),
    question('not-a-uuid', 'Skip me'),
  ],
  [question(remoteId, 'Already saved')],
)

assert.equal(plan.items.length, 2)
assert.equal(plan.items.find((item) => item.question.id === source)?.question.originalText, 'The room still feels far')
assert.equal(plan.items.find((item) => item.question.id === source)?.question.mergedIntoId, survivor)
assert.equal(plan.items.find((item) => item.question.id === source)?.question.disposition, 'retained')
assert.equal(plan.skipped.length, 2)
assert.match(plan.skipped[0].reason, /Already in the account/)

const cycle = planQuestionImport(
  [
    question(source, 'First', { mergedIntoId: survivor }),
    question(survivor, 'Second', { mergedIntoId: source }),
  ],
  [],
)
assert.equal(cycle.items.every((item) => item.question.mergedIntoId === null), true)
assert.match(cycle.items[0].note ?? '', /loop/)

console.log('import plan checks passed')
