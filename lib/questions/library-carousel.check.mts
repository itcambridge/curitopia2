import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { conceptQuestionCopy, orderedConcepts, selectedConceptIndex, stepConceptIndex } from './library-carousel.ts'

const concepts = [
  { id: 'older', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'newer', updatedAt: '2026-02-01T00:00:00.000Z' },
  { id: 'same-b', updatedAt: '2026-02-01T00:00:00.000Z' },
  { id: 'middle', updatedAt: '2026-01-15T00:00:00.000Z' },
]

const ordered = orderedConcepts(concepts)
assert.deepEqual(ordered.map((concept) => concept.id), ['newer', 'same-b', 'middle', 'older'])
assert.equal(selectedConceptIndex([], 'newer'), -1)
assert.equal(selectedConceptIndex(ordered, null), 0)
assert.equal(selectedConceptIndex(ordered, 'missing'), 0)
assert.equal(selectedConceptIndex(ordered, 'middle'), 2)
assert.equal(selectedConceptIndex(ordered.slice(0, 1), 'missing'), 0)

assert.equal(stepConceptIndex(0, 4, -1), 0)
assert.equal(stepConceptIndex(3, 4, 1), 3)
assert.equal(stepConceptIndex(1, 4, 1), 2)
assert.equal(stepConceptIndex(1, 2, -1), 0)
assert.equal(stepConceptIndex(0, 2, 1), 1)
assert.equal(stepConceptIndex(0, 1, 1), 0)
assert.equal(stepConceptIndex(0, 1, -1), 0)
assert.equal(stepConceptIndex(0, 0, 1), -1)

const copy = conceptQuestionCopy({
  questionIds: ['q1', 'q2', 'q3', 'q4', 'q5'],
  sources: [
    { linkId: 'a', questionId: 'q1', originalText: 'Who should I ask about Citrix?', consideredText: null },
    { linkId: 'b', questionId: 'q2', originalText: 'How can I be more productive?', consideredText: null },
    { linkId: 'c', questionId: 'q3', originalText: 'Should I carry on performing fake documentation?', consideredText: null },
    { linkId: 'd', questionId: 'q4', originalText: 'When should I phone Ekco Accounts?', consideredText: null },
    { linkId: 'e', questionId: 'q5', originalText: 'How can I be more productive?', consideredText: null },
  ],
}, [])
assert.deepEqual(copy.questions, [
  'Who should I ask about Citrix?',
  'How can I be more productive?',
  'Should I carry on performing fake documentation?',
  'When should I phone Ekco Accounts?',
])

const fromQuestions = conceptQuestionCopy({
  questionIds: ['q1'],
  sources: [],
}, [{ id: 'q1', originalText: 'When should I phone Ekco Accounts?' }])
assert.deepEqual(fromQuestions.questions, ['When should I phone Ekco Accounts?'])

const promptStaysHidden = conceptQuestionCopy({
  questionIds: ['q1', 'q2'],
  sources: [
    { linkId: 'a', questionId: 'q1', originalText: 'Is magnetism a distortion in electromagnetic spacetime?', consideredText: 'A lone iron needle suspended in a dark glassy void.' },
    { linkId: 'b', questionId: 'q2', originalText: 'How can I visualise below atoms?', consideredText: null },
  ],
}, [])
assert.deepEqual(promptStaysHidden.questions, [
  'Is magnetism a distortion in electromagnetic spacetime?',
  'How can I visualise below atoms?',
])

const none = conceptQuestionCopy({ questionIds: [], sources: [] }, [])
assert.deepEqual(none.questions, [])

const view = readFileSync(new URL('../../components/studio/library-view.tsx', import.meta.url), 'utf8')
assert.equal(view.includes('images/generations'), false)
assert.equal(view.includes('orderedConcepts'), true)
assert.equal(view.includes('stepConceptIndex'), true)
assert.equal(view.includes("stage: 'distil'"), true)
assert.equal(view.includes('forConsideredText'), false)
