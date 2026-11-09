import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { carouselOffset, conceptCardQuestion, conceptQuestionCopy, conceptRemainsVisible, orderedConcepts, originatingQuestionId, questionDispositionMap, questionNotRecorded, selectedConceptIndex, stepConceptIndex } from './library-carousel.ts'

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

assert.equal(stepConceptIndex(0, 4, -1), 3)
assert.equal(stepConceptIndex(3, 4, 1), 0)
assert.equal(stepConceptIndex(1, 4, 1), 2)
assert.equal(stepConceptIndex(0, 2, -1), 1)
assert.equal(stepConceptIndex(1, 2, 1), 0)
assert.equal(stepConceptIndex(0, 1, 1), 0)
assert.equal(stepConceptIndex(0, 1, -1), 0)
assert.equal(stepConceptIndex(0, 0, 1), -1)
assert.equal(stepConceptIndex(0, 0, -1), -1)
assert.equal(carouselOffset(0, 3, 4), 1)
assert.equal(carouselOffset(3, 0, 4), -1)
assert.equal(carouselOffset(1, 0, 2), 1)
assert.equal(carouselOffset(0, 1, 2), -1)
assert.equal(carouselOffset(0, 0, 1), 0)
assert.equal(ordered.map((concept) => concept.id)[stepConceptIndex(0, ordered.length, -1)], 'older')
assert.equal(ordered.map((concept) => concept.id)[stepConceptIndex(ordered.length - 1, ordered.length, 1)], 'newer')

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

const card = conceptCardQuestion({
  anchorQuestionId: 'q1',
  questionIds: ['q1', 'q2'],
  sources: [
    { linkId: 'b', questionId: 'q2', originalText: 'How can I visualise below atoms?', consideredText: 'A prompt that must stay off the card.' },
    { linkId: 'a', questionId: 'q1', originalText: 'Is magnetism a distortion in electromagnetic spacetime?', consideredText: 'A lone iron needle suspended in a dark glassy void.' },
  ],
}, [{ id: 'q1', originalText: 'A later edit of the live question' }])
assert.equal(card, 'Is magnetism a distortion in electromagnetic spacetime?')
assert.equal(card.includes('iron needle'), false)
assert.equal(card.includes('later edit'), false)

const detached = conceptCardQuestion({
  anchorQuestionId: null,
  questionIds: [],
  sources: [
    { linkId: 'gone', questionId: null, originalText: '  Earlier wording kept  ', consideredText: 'A scene description' },
  ],
}, [])
assert.equal(detached, 'Earlier wording kept')

const fromLive = conceptCardQuestion({
  anchorQuestionId: 'q1',
  questionIds: ['q1'],
  sources: [],
}, [{ id: 'q1', originalText: 'When should I phone Ekco Accounts?' }])
assert.equal(fromLive, 'When should I phone Ekco Accounts?')

const missing = conceptCardQuestion({ anchorQuestionId: null, questionIds: [], sources: [] }, [])
assert.equal(missing, questionNotRecorded)

const view = readFileSync(new URL('../../components/studio/library-view.tsx', import.meta.url), 'utf8')
assert.equal(view.includes('images/generations'), false)
assert.equal(view.includes('orderedConcepts'), true)
assert.equal(view.includes('stepConceptIndex'), true)
assert.equal(view.includes('carouselOffset'), true)
assert.equal(view.includes('ArrowLeft'), true)
assert.equal(view.includes('ArrowRight'), true)
assert.equal(view.includes('disabled={count < 2}'), true)
assert.equal(view.includes('prefers-reduced-motion'), true)
const comparison = readFileSync(new URL('../../components/studio/concept-comparison.tsx', import.meta.url), 'utf8')
assert.equal(comparison.includes('stepConceptIndex'), false)
assert.equal(comparison.includes('carouselOffset'), false)
assert.equal(view.includes('Edit this concept'), true)
assert.equal(view.includes('Compare concepts'), true)
assert.equal(view.includes('IconAction'), true)
assert.equal(view.includes(' title="'), false)
assert.equal(view.includes("stage: 'distil'"), false)
assert.equal(view.includes('forConsideredText'), false)
assert.equal(view.includes('consideredText'), false)
assert.equal(view.includes('conceptCardQuestion'), true)
assert.equal(view.includes('object-contain'), true)
assert.equal(view.includes('conceptRemainsVisible'), true)
assert.equal(view.includes('listQuestionDispositions'), true)
assert.equal(view.includes('questionStamp'), true)

const prompt = 'A lone iron needle suspended in a dark glassy void.'
const saved = {
  anchorQuestionId: null,
  forConsideredText: prompt,
  sources: [
    { questionId: 'extra', consideredText: 'A later contributor prompt' },
    { questionId: 'origin', consideredText: prompt },
  ],
}
assert.equal(originatingQuestionId(saved), 'origin')
const active = questionDispositionMap([], [
  { id: 'origin', disposition: 'gathered' },
  { id: 'extra', disposition: 'discarded' },
])
assert.equal(conceptRemainsVisible(saved, active), true)
const originDiscarded = questionDispositionMap([], [
  { id: 'origin', disposition: 'discarded' },
  { id: 'extra', disposition: 'gathered' },
])
assert.equal(conceptRemainsVisible(saved, originDiscarded), false)
const restored = questionDispositionMap([{ id: 'origin', disposition: 'discarded' }], [{ id: 'origin', disposition: 'gathered' }])
assert.equal(conceptRemainsVisible(saved, restored), true)

const detachedConcept = {
  anchorQuestionId: null,
  forConsideredText: prompt,
  sources: [{ questionId: null, consideredText: prompt }],
}
assert.equal(originatingQuestionId(detachedConcept), null)
assert.equal(conceptRemainsVisible(detachedConcept, originDiscarded), true)

const ambiguous = {
  anchorQuestionId: null,
  forConsideredText: prompt,
  sources: [
    { questionId: 'first', consideredText: 'One scene' },
    { questionId: 'second', consideredText: 'Another scene' },
  ],
}
assert.equal(originatingQuestionId(ambiguous), null)
assert.equal(conceptRemainsVisible(ambiguous, questionDispositionMap([], [
  { id: 'first', disposition: 'discarded' },
  { id: 'second', disposition: 'discarded' },
])), true)

const remembered = {
  anchorQuestionId: 'origin',
  forConsideredText: prompt,
  sources: [],
}
assert.equal(originatingQuestionId(remembered), 'origin')
assert.equal(conceptRemainsVisible(remembered, originDiscarded), false)
assert.equal(conceptRemainsVisible(remembered, restored), true)
