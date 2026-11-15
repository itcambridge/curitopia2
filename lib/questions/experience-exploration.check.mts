import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { facilitationContextBlock } from './experience-facilitator.ts'
import { assembleCuratedExploration, type ExplorationConcept, type ExplorationLink } from './experience-exploration.ts'

const first = '11111111-1111-4111-8111-111111111111'
const second = '22222222-2222-4222-8222-222222222222'
const third = '33333333-3333-4333-8333-333333333333'
const question = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const otherQuestion = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function concept(id: string, title: string): ExplorationConcept {
  return {
    id,
    title,
    forConsideredText: `Wording for ${title}`,
    createdAt: '2026-11-01T00:00:00.000Z',
  }
}

function link(conceptId: string, questionId: string | null, originalText: string, consideredText: string | null): ExplorationLink {
  return { conceptId, questionId, originalText, consideredText }
}

const several = assembleCuratedExploration(
  [concept(first, 'Quiet Notice'), concept(second, 'Shared Ground'), concept(third, 'Unanchored')],
  [
    link(first, question, 'What makes a conversation mutual?', 'Notice one curious moment.'),
    link(first, otherQuestion, 'Where does humour belong?', null),
  ],
)
assert.equal(several.concepts.length, 3)
assert.deepEqual(several.concepts.map((item) => item.id), [first, second, third])
const quiet = several.concepts[0]
assert.equal(quiet?.provenanceIds.length, 2)
assert.equal(quiet?.originRecovered, true)
assert.equal(several.concepts[1]?.originRecovered, false)
assert.equal(several.concepts[1]?.provenanceIds.length, 0)
assert.equal(several.concepts[2]?.originRecovered, false)
assert.equal(several.provenance.length, 2)
const missingConsidered = several.provenance.find((entry) => entry.questionId === otherQuestion)
assert.equal(missingConsidered?.consideredText, null)
assert.equal(missingConsidered?.originalText, 'Where does humour belong?')

const sharedText = 'What remains mine to choose?'
const shared = assembleCuratedExploration(
  [concept(first, 'First'), concept(second, 'Second')],
  [
    link(first, question, sharedText, 'The same considered wording'),
    link(second, question, sharedText, 'The same considered wording'),
  ],
)
assert.equal(shared.provenance.length, 1)
assert.deepEqual(shared.provenance[0]?.conceptIds, [first, second])
assert.equal(shared.concepts[0]?.provenanceIds.length, 1)
assert.equal(shared.concepts[1]?.provenanceIds.length, 1)
assert.equal(shared.concepts[0]?.provenanceIds[0], shared.concepts[1]?.provenanceIds[0])

const early = 'The earlier wording'
const later = 'The later wording'
const versions = assembleCuratedExploration(
  [concept(first, 'Earlier'), concept(second, 'Later')],
  [
    link(first, question, early, 'First snapshot'),
    link(second, question, later, 'Second snapshot'),
  ],
)
assert.equal(versions.provenance.length, 2)
assert.deepEqual(versions.concepts[0]?.provenanceIds, [versions.provenance[0]?.id])
assert.deepEqual(versions.concepts[1]?.provenanceIds, [versions.provenance[1]?.id])
assert.equal(versions.provenance[0]?.originalText, early)
assert.equal(versions.provenance[1]?.originalText, later)

const sameWords = assembleCuratedExploration(
  [concept(first, 'One'), concept(second, 'Another')],
  [
    link(first, question, sharedText, null),
    link(second, otherQuestion, sharedText, null),
  ],
)
assert.equal(sameWords.provenance.length, 2)
assert.equal(sameWords.provenance[0]?.questionId, question)
assert.equal(sameWords.provenance[1]?.questionId, otherQuestion)

const deleted = assembleCuratedExploration(
  [concept(first, 'Kept')],
  [link(first, null, 'The question that was removed', 'Its considered wording')],
)
assert.equal(deleted.provenance.length, 1)
assert.equal(deleted.provenance[0]?.questionId, null)
assert.equal(deleted.provenance[0]?.originalText, 'The question that was removed')
assert.equal(deleted.provenance[0]?.consideredText, 'Its considered wording')
assert.equal(deleted.concepts[0]?.originRecovered, true)

const detachedAndLive = assembleCuratedExploration(
  [concept(first, 'Live'), concept(second, 'Detached')],
  [
    link(first, question, sharedText, null),
    link(second, null, sharedText, null),
  ],
)
assert.equal(detachedAndLive.provenance.length, 2)
assert.equal(detachedAndLive.provenance[0]?.questionId, question)
assert.equal(detachedAndLive.provenance[1]?.questionId, null)
assert.deepEqual(detachedAndLive.concepts[0]?.provenanceIds, [detachedAndLive.provenance[0]?.id])
assert.deepEqual(detachedAndLive.concepts[1]?.provenanceIds, [detachedAndLive.provenance[1]?.id])

const unanchored = assembleCuratedExploration([concept(third, 'Unanchored')], [])
assert.equal(unanchored.concepts.length, 1)
assert.equal(unanchored.concepts[0]?.originRecovered, false)
assert.equal(unanchored.concepts[0]?.title, 'Unanchored')
assert.equal(unanchored.concepts[0]?.forConsideredText, 'Wording for Unanchored')
assert.equal(unanchored.provenance.length, 0)

const source = readFileSync(new URL('./experience-exploration.ts', import.meta.url), 'utf8')
assert.equal(source.includes('supabase'), false)
assert.equal(source.includes(".from('questions')"), false)
assert.equal(source.includes('original_text'), false)
assert.equal(source.includes('considered_text'), false)

const emptyContext = facilitationContextBlock({
  curiosityName: 'Social skills',
  northStar: 'Incremental social skill improvement',
  phrases: [{ id: first, circle: 'influence', body: 'Look for small chances to practise' }],
  questions: [],
  concepts: [],
  provenance: [],
})
assert.equal(emptyContext.includes('Incremental social skill improvement'), true)
assert.equal(emptyContext.includes('Look for small chances to practise'), true)
assert.equal(emptyContext.includes('Concepts the person chose to develop: none.'), true)

console.log('experience exploration checks passed')
