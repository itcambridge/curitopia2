import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { conceptCardQuestion } from './library-carousel.ts'
import { filterComparisonConcepts, questionFromReflection, replaceComparison, swapComparison, toggleComparisonPick } from './comparison.ts'

const pair = { leftId: 'alpha', rightId: 'beta' }
assert.deepEqual(toggleComparisonPick([], 'alpha'), { picks: ['alpha'], status: 'added' })
assert.deepEqual(toggleComparisonPick(['alpha'], 'beta'), { picks: ['alpha', 'beta'], status: 'ready' })
assert.deepEqual(toggleComparisonPick(['alpha', 'beta'], 'gamma'), { picks: ['alpha', 'beta'], status: 'full' })
assert.deepEqual(toggleComparisonPick(['alpha', 'beta'], 'alpha'), { picks: ['beta'], status: 'removed' })

const swapped = swapComparison(pair)
assert.deepEqual(swapped, { leftId: 'beta', rightId: 'alpha' })
assert.deepEqual(pair, { leftId: 'alpha', rightId: 'beta' })
assert.deepEqual(replaceComparison(pair, 'left', 'gamma'), { leftId: 'gamma', rightId: 'beta' })
assert.deepEqual(replaceComparison(pair, 'right', 'gamma'), { leftId: 'alpha', rightId: 'gamma' })
assert.equal(replaceComparison(pair, 'left', 'beta'), null)
assert.equal(replaceComparison(pair, 'right', 'alpha'), null)
assert.deepEqual(pair, { leftId: 'alpha', rightId: 'beta' })

const account = [
  { id: 'alpha', title: 'Quiet field', curiosityId: 'meditation', question: 'What does stillness hold?' },
  { id: 'beta', title: 'Falling clock', curiosityId: 'physics', question: 'How do gravity and time meet?' },
]
const focused = account.filter((concept) => concept.curiosityId === 'meditation')
assert.equal(focused.length, 1)
const found = filterComparisonConcepts(account, 'gravity', (concept) => `${concept.title} ${concept.question} ${concept.curiosityId}`)
assert.deepEqual(found.map((concept) => concept.id), ['beta'])
assert.deepEqual(filterComparisonConcepts(account, 'Meditation', (concept) => concept.curiosityId).map((concept) => concept.id), ['alpha'])
assert.equal(filterComparisonConcepts(account, '   ', (concept) => concept.title).length, 2)

assert.equal(questionFromReflection('  ').ok, false)
assert.equal(questionFromReflection('  ').ok === false && questionFromReflection('  ').error, 'Write the question you want to keep.')
assert.equal(questionFromReflection('What remains').ok && questionFromReflection('What remains').text, 'What remains?')
assert.equal(questionFromReflection('What remains?').ok && questionFromReflection('What remains?').text, 'What remains?')
assert.equal(questionFromReflection('a'.repeat(2000)).ok, false)

const card = conceptCardQuestion({
  anchorQuestionId: 'q1',
  questionIds: ['q1'],
  sources: [{ linkId: 'a', questionId: 'q1', originalText: 'How do gravity and time meet?', consideredText: 'A clock falling through a dark well.' }],
}, [])
assert.equal(card, 'How do gravity and time meet?')

const view = readFileSync(new URL('../../components/studio/library-view.tsx', import.meta.url), 'utf8')
const comparison = readFileSync(new URL('../../components/studio/concept-comparison.tsx', import.meta.url), 'utf8')
assert.equal(view.includes('Compare'), true)
assert.equal(view.includes('concepts={records}'), true)
assert.equal(view.includes('grid-cols-2'), false)
assert.equal(comparison.includes('grid-cols-2'), true)
assert.equal(comparison.includes('object-contain'), true)
assert.equal(comparison.includes('Read full question'), true)
assert.equal(comparison.includes('Swap sides'), true)
assert.equal(comparison.includes('Replace left'), true)
assert.equal(comparison.includes('Replace right'), true)
assert.equal(comparison.includes('/api/'), false)
assert.equal(comparison.includes('concept_connections'), false)
assert.equal(comparison.includes('service_role'), false)
assert.equal(comparison.includes('forConsideredText'), false)
assert.equal(comparison.includes('insertQuestion'), true)
assert.equal(comparison.includes('addQuestion'), true)

console.log('comparison checks passed')
