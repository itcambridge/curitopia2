import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { itemsByCircle, proposeRelationship, reconcileRelationships, type CircleItem, type CircleName } from './experience-content.ts'
import {
  focusAddedTopic,
  focusAfterRemoval,
  focusMovedTopic,
  focusTopic,
  initialTopicFocus,
  topicAt,
  topicIndex,
  topicIndexFromStrip,
  topicStrip,
  topicWrapStrip,
} from './topic-carousel.ts'

function note(id: string, circle: CircleName, createdAt = '2026-01-01T00:00:00.000Z'): CircleItem {
  return { id, circle, body: id, createdAt }
}

const concern = [note('c1', 'concern', '2026-01-01T00:00:00.000Z'), note('c2', 'concern', '2026-01-02T00:00:00.000Z'), note('c3', 'concern', '2026-01-03T00:00:00.000Z')]
const influence = [note('i1', 'influence', '2026-01-01T00:00:00.000Z'), note('i2', 'influence', '2026-01-02T00:00:00.000Z')]
const control = [note('k1', 'control')]
const all = [...concern, ...influence, ...control]

const grouped = itemsByCircle(all)
assert.deepEqual(grouped.concern.map((item) => item.id), ['c1', 'c2', 'c3'])
assert.deepEqual(grouped.influence.map((item) => item.id), ['i1', 'i2'])
assert.deepEqual(grouped.control.map((item) => item.id), ['k1'])
assert.equal(grouped.concern.some((item) => item.circle !== 'concern'), false)
assert.equal(grouped.influence.some((item) => item.circle !== 'influence'), false)
assert.equal(grouped.control.some((item) => item.circle !== 'control'), false)

let focus = initialTopicFocus()
assert.deepEqual(focus, { concern: null, influence: null, control: null })
focus = focusTopic(focus, 'concern', topicAt(grouped.concern, focus.concern, 1))
assert.equal(focus.concern, 'c2')
assert.equal(focus.influence, null)
assert.equal(focus.control, null)
focus = focusTopic(focus, 'influence', topicAt(grouped.influence, focus.influence, 1))
assert.equal(focus.influence, 'i2')
assert.equal(focus.concern, 'c2')
assert.equal(focus.control, null)
focus = focusTopic(focus, 'concern', topicAt(grouped.concern, focus.concern, 1))
assert.equal(focus.concern, 'c3')
assert.equal(focus.influence, 'i2')

assert.equal(topicAt(grouped.concern, 'c1', -1), 'c3')
assert.equal(topicAt(grouped.concern, 'c3', 1), 'c1')
assert.equal(topicAt(grouped.concern, 'c2', 1), 'c3')
assert.equal(topicAt(grouped.concern, 'c2', -1), 'c1')
assert.equal(topicAt(grouped.control, 'k1', 1), 'k1')
assert.equal(topicAt(grouped.control, 'k1', -1), 'k1')
assert.equal(topicAt([], null, 1), null)
assert.equal(topicAt([], null, -1), null)
assert.equal(topicIndex([], null), -1)
assert.equal(topicIndex(grouped.concern, 'missing'), 0)
assert.equal(topicIndex(grouped.concern, 'c3'), 2)

assert.equal(topicStrip(0, 1), 0)
assert.equal(topicStrip(2, 3), 3)
assert.equal(topicWrapStrip(0, 1, 1), null)
assert.equal(topicWrapStrip(0, 1, -1), null)
assert.equal(topicWrapStrip(2, 3, 1), 4)
assert.equal(topicWrapStrip(0, 3, -1), 0)
assert.equal(topicWrapStrip(1, 3, 1), null)
assert.deepEqual(topicIndexFromStrip(0, 1), { index: 0, wrapped: false })
assert.deepEqual(topicIndexFromStrip(0, 3), { index: 2, wrapped: true })
assert.deepEqual(topicIndexFromStrip(1, 3), { index: 0, wrapped: false })
assert.deepEqual(topicIndexFromStrip(3, 3), { index: 2, wrapped: false })
assert.deepEqual(topicIndexFromStrip(4, 3), { index: 0, wrapped: true })

const added = focusAddedTopic(focus, 'control', 'k2')
assert.equal(added.control, 'k2')
assert.equal(added.concern, 'c3')
assert.equal(added.influence, 'i2')
const withAdded = [...all, note('k2', 'control', '2026-04-01T00:00:00.000Z')]
assert.deepEqual(itemsByCircle(withAdded).control.map((item) => item.id), ['k1', 'k2'])
assert.equal(topicIndex(itemsByCircle(withAdded).control, added.control), 1)
assert.deepEqual(itemsByCircle(withAdded).concern.map((item) => item.id), ['c1', 'c2', 'c3'])
assert.deepEqual(itemsByCircle(withAdded).influence.map((item) => item.id), ['i1', 'i2'])

const previous = [note('c1', 'concern', '2026-01-01T00:00:00.000Z'), note('c2', 'concern', '2026-01-02T00:00:00.000Z'), note('i1', 'influence')]
const moved = note('c2', 'influence', '2026-01-02T00:00:00.000Z')
const afterMove = [previous[0], moved, previous[2]]
const movedFocus = focusMovedTopic({ concern: 'c2', influence: 'i1', control: null }, 'c2', 'concern', 'influence', previous, afterMove)
assert.equal(movedFocus.concern, 'c1')
assert.equal(movedFocus.influence, 'c2')
assert.equal(movedFocus.control, null)
assert.deepEqual(itemsByCircle(afterMove).concern.map((item) => item.id), ['c1'])
assert.deepEqual(itemsByCircle(afterMove).influence.map((item) => item.id), ['c2', 'i1'])

const edited = afterMove.map((item) => item.id === 'c2' ? { ...item, body: 'Updated' } : item)
assert.equal(itemsByCircle(edited).influence.find((item) => item.id === 'c2')?.body, 'Updated')
assert.equal(topicIndex(itemsByCircle(edited).influence, movedFocus.influence), topicIndex(itemsByCircle(afterMove).influence, 'c2'))
assert.deepEqual(itemsByCircle(edited).concern.map((item) => item.id), ['c1'])

const removed = focusAfterRemoval({ concern: 'c2', influence: null, control: null }, 'c2', concern, [concern[0], concern[2]])
assert.equal(removed.concern, 'c3')
assert.equal(removed.influence, null)
assert.deepEqual(itemsByCircle([concern[0], concern[2]]).concern.map((item) => item.id), ['c1', 'c3'])
const untouched = focusAfterRemoval({ concern: 'c1', influence: 'i1', control: null }, 'c3', concern, [concern[0], concern[1]])
assert.equal(untouched.concern, 'c1')
assert.equal(untouched.influence, 'i1')

const proposal = { id: 'proposal-1', kind: 'phrase' as const, circle: 'concern' as const, body: 'Not saved yet' }
assert.equal(all.some((item) => item.id === proposal.id), false)
assert.equal(itemsByCircle(all).concern.some((item) => item.body === proposal.body), false)
const accepted = focusAddedTopic(initialTopicFocus(), proposal.circle, 'saved-phrase')
const savedPhrase = note('saved-phrase', 'concern', '2026-05-01T00:00:00.000Z')
assert.equal(topicIndex(itemsByCircle([...all, savedPhrase]).concern, accepted.concern), 3)

const link = proposeRelationship(concern[0], influence[0], [])
assert.equal('error' in link, false)
if ('error' in link) throw new Error(link.error)
assert.equal(reconcileRelationships([link.link], [concern[0], influence[0]]).length, 1)
const relocated = { ...concern[0], circle: 'control' as const }
assert.equal(reconcileRelationships([link.link], [relocated, influence[0]]).length, 0)

const clearing = readFileSync(new URL('../../components/studio/experience-clearing.tsx', import.meta.url), 'utf8')
const carousel = readFileSync(new URL('../../components/studio/topic-carousel.tsx', import.meta.url), 'utf8')
const region = clearing.slice(clearing.indexOf('{circles.map'), clearing.indexOf('{relationshipVisitNote}'))
const carouselAt = region.indexOf('<TopicCarousel')
const faceClose = region.indexOf('/>', region.indexOf('<TopicFace'))
const carouselClose = region.indexOf('/>', faceClose + 2)
const detailAt = region.indexOf('data-topic-detail')
assert.equal(region.split('<TopicCarousel').length, 2)
assert.ok(carouselAt !== -1 && carouselClose > carouselAt && detailAt > carouselClose)
assert.equal(region.slice(carouselClose, detailAt).includes('data-phrase-id'), false)
assert.equal(region.includes('items={grouped[circle.id]}'), true)
assert.equal(region.includes('focus[circle.id]'), true)
assert.ok(region.lastIndexOf("proposal.kind === 'phrase'") > detailAt)
assert.equal(clearing.includes('data-phrase-id={item.id}'), true)
assert.equal(clearing.includes('Nothing here yet.'), true)
assert.equal(clearing.includes('addCircleItem'), true)
assert.equal(clearing.includes('editCircleItem'), true)
assert.equal(clearing.includes('deleteCircleItem'), true)
assert.equal(clearing.includes('moveCircleItem'), true)
assert.equal(clearing.includes('reconcileRelationships'), true)
assert.equal(clearing.includes('proposeRelationship'), true)
assert.equal(clearing.includes('Remove this?'), true)
assert.equal(clearing.includes('North Star'), true)
assert.equal(carousel.includes('renderItem(slide.item, !slide.clone)'), true)
assert.equal(carousel.includes('prefers-reduced-motion'), true)
assert.equal(carousel.includes('ArrowLeft'), true)
assert.equal(carousel.includes('ArrowRight'), true)
assert.equal(carousel.includes('aria-hidden'), true)
assert.equal(carousel.includes('overflow-x-auto'), true)
assert.equal(carousel.includes('touch-pan-x'), true)
assert.equal(carousel.includes('snap-x'), true)
assert.equal(carousel.includes('data-phrase-id'), false)
assert.equal(carousel.includes('data-topic-detail'), false)
assert.equal(clearing.includes('if (!interactive) return'), true)

console.log('topic carousel checks passed')
