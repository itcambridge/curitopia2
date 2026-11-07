import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { orderedConcepts, selectedConceptIndex } from './library-carousel.ts'
import {
  allCuriositiesFocus,
  emptyLibraryMessage,
  initialLibraryFocus,
  libraryConceptsForFocus,
  libraryCuriosityName,
  libraryFocusChoices,
  libraryOriginLabel,
  workspaceFocusForLibraryConcept,
} from './library-focus.ts'

const antiEgo = '11111111-1111-4111-8111-111111111111'
const time = '22222222-2222-4222-8222-222222222222'
const nature = '33333333-3333-4333-8333-333333333333'
const names = [
  { id: antiEgo, name: 'Anti-Ego' },
  { id: nature, name: 'Nature' },
  { id: time, name: 'Time and Physics' },
]
const records = [
  { id: 'newer', curiosityId: time, title: 'Still waiting', updatedAt: '2026-03-01T00:00:00.000Z' },
  { id: 'middle', curiosityId: antiEgo, title: 'After answer', updatedAt: '2026-02-01T00:00:00.000Z' },
  { id: 'older', curiosityId: nature, title: 'Quiet field', updatedAt: '2026-01-01T00:00:00.000Z' },
]

const everyone = orderedConcepts(libraryConceptsForFocus(records, allCuriositiesFocus))
assert.deepEqual(everyone.map((concept) => concept.id), ['newer', 'middle', 'older'])
assert.deepEqual(everyone.map((concept) => concept.curiosityId), [time, antiEgo, nature])
assert.equal(libraryCuriosityName(time, names), 'Time and Physics')
assert.equal(libraryCuriosityName(antiEgo, names), 'Anti-Ego')
assert.equal(libraryOriginLabel(allCuriositiesFocus, libraryCuriosityName(time, names)), 'From: Time and Physics')

const focused = orderedConcepts(libraryConceptsForFocus(records, antiEgo))
assert.deepEqual(focused.map((concept) => concept.id), ['middle'])
assert.equal(focused.every((concept) => concept.curiosityId === antiEgo), true)
assert.equal(libraryOriginLabel(antiEgo, 'Anti-Ego'), null)
assert.equal(selectedConceptIndex(focused, null), 0)

const switched = orderedConcepts(libraryConceptsForFocus(records, nature))
assert.deepEqual(switched.map((concept) => concept.id), ['older'])
assert.equal(selectedConceptIndex(switched, 'middle'), 0)

const restored = libraryConceptsForFocus(records, allCuriositiesFocus)
assert.equal(restored.length, records.length)
assert.equal(restored[0], records[0])
assert.equal(records[0].curiosityId, time)
assert.equal(records[0].title, 'Still waiting')

const emptyCuriosity = libraryConceptsForFocus(records, '44444444-4444-4444-8444-444444444444')
assert.deepEqual(emptyCuriosity, [])
assert.equal(emptyLibraryMessage(allCuriositiesFocus, null), 'Nothing is saved yet. Keep an image from Visualise and it will appear here.')
assert.equal(emptyLibraryMessage(nature, 'Nature'), 'Nature has no saved concepts yet.')
assert.equal(emptyLibraryMessage('missing', null), 'This curiosity has no saved concepts yet.')

assert.deepEqual(libraryFocusChoices(names).map((choice) => choice.name), ['All curiosities', 'Anti-Ego', 'Nature', 'Time and Physics'])
assert.equal(libraryFocusChoices([]).map((choice) => choice.name).join('|'), 'All curiosities')

assert.equal(initialLibraryFocus('home', antiEgo), allCuriositiesFocus)
assert.equal(initialLibraryFocus('home', null), allCuriositiesFocus)
assert.equal(initialLibraryFocus('curiosity', antiEgo), antiEgo)
assert.equal(initialLibraryFocus('curiosity', null), allCuriositiesFocus)

const own = { id: 'middle', curiosityId: antiEgo, anchorQuestionId: 'question-1' }
assert.deepEqual(workspaceFocusForLibraryConcept([{ id: 'middle' }], own, antiEgo), {
  focusConceptId: 'middle',
  focusQuestionId: 'question-1',
})
assert.equal(workspaceFocusForLibraryConcept([{ id: 'middle' }], { id: 'newer', curiosityId: time, anchorQuestionId: 'question-2' }, antiEgo), null)
assert.equal(workspaceFocusForLibraryConcept([], own, antiEgo), null)
assert.equal(workspaceFocusForLibraryConcept([{ id: 'middle' }], own, null), null)

const conceptsSource = readFileSync(new URL('./supabase-concepts.ts', import.meta.url), 'utf8')
const accountStart = conceptsSource.indexOf('export async function listAccountConcepts')
const accountBody = conceptsSource.slice(accountStart, conceptsSource.indexOf('function snapshot', accountStart))
assert.equal(accountStart > conceptsSource.indexOf('export async function listConcepts'), true)
assert.match(conceptsSource, /export async function listConcepts\(curiosityId: string\)[\s\S]*?\.eq\('curiosity_id', curiosityId\)/)
assert.equal(accountBody.includes(".eq('curiosity_id'"), false)
assert.equal(accountBody.includes('disposition'), false)
assert.equal(accountBody.includes(".eq('user_id', userId)"), true)
assert.equal(accountBody.includes('service_role'), false)
assert.equal(accountBody.includes('createServiceRole'), false)
assert.equal(conceptsSource.includes("from '@/lib/supabase/client'"), true)

const view = readFileSync(new URL('../../components/studio/library-view.tsx', import.meta.url), 'utf8')
const focusFn = view.slice(view.indexOf('function selectFocus'), view.indexOf('function choose'))
assert.equal(focusFn.includes('onChange'), false)
assert.equal(focusFn.includes('setFocus'), true)
assert.equal(view.includes('libraryConceptsForFocus'), true)
assert.equal(view.includes('libraryOriginLabel'), true)
assert.equal(view.includes('listAccountConcepts'), true)
assert.equal(view.includes('syncConceptChanges'), false)
assert.equal(view.includes('service_role'), false)
assert.equal(view.includes('Anti-Ego'), false)
assert.equal(view.includes('concepts: records'), false)
assert.equal(view.includes('concepts: nextConcepts'), false)
assert.equal(view.includes('ArrowLeft'), true)
assert.equal(view.includes('prefers-reduced-motion'), true)
assert.equal(view.split('setFocus').length - 1, 2)

const hook = readFileSync(new URL('../../components/studio/use-account-workspace.ts', import.meta.url), 'utf8')
assert.equal(hook.includes('listAccountConcepts'), false)
assert.equal(hook.includes('listConcepts'), true)

const entry = readFileSync(new URL('../../components/studio/curitopia-entry.tsx', import.meta.url), 'utf8')
const landing = readFileSync(new URL('../../components/studio/curiosity-landing.tsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('../../components/studio/curitopia-app.tsx', import.meta.url), 'utf8')
const homeLibrary = readFileSync(new URL('../../components/studio/account-library.tsx', import.meta.url), 'utf8')
assert.equal(entry.includes("library === 'all'"), true)
assert.equal(entry.includes('<AccountLibrary />'), true)
assert.equal(landing.includes('/?library=all'), true)
assert.equal(app.includes("initialLibraryFocus('curiosity', curiosityId)"), true)
assert.equal(homeLibrary.includes("initialLibraryFocus('home', null)"), true)
assert.equal(homeLibrary.includes('listAccountConcepts'), false)

console.log('library focus checks passed')
