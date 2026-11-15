import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  circleItemMaxLength,
  circles,
  experienceContentView,
  itemsByCircle,
  movedCircleItem,
  northStarMaxLength,
  prepareCircleText,
  prepareNorthStar,
  proposeRelationship,
  reconcileRelationships,
  relationshipCapMessage,
  relationshipSentence,
  relationshipVisitNote,
  eligibleLinkPartners,
  withoutPhrase,
  type CircleItem,
} from './experience-content.ts'

const concern: CircleItem = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  circle: 'concern',
  body: 'Economic conditions',
  createdAt: '2026-11-13T19:00:00.000Z',
}
const control: CircleItem = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  circle: 'control',
  body: 'My priorities',
  createdAt: '2026-11-13T20:00:00.000Z',
}

const created = prepareNorthStar('  Where do I want to take my career?  ')
assert.deepEqual(created, { value: 'Where do I want to take my career?' })
const edited = prepareNorthStar('I want to understand what really matters to me.')
assert.deepEqual(edited, { value: 'I want to understand what really matters to me.' })
assert.deepEqual(prepareNorthStar('   '), { value: null })
assert.deepEqual(prepareNorthStar(''), { value: null })
assert.deepEqual(prepareNorthStar(`  ${'a'.repeat(northStarMaxLength + 1)}  `), { error: `Keep the North Star to ${northStarMaxLength} characters.` })
assert.equal('error' in prepareNorthStar('Keep  the   spacing'), false)
if (!('error' in prepareNorthStar('Keep  the   spacing'))) {
  assert.equal(prepareNorthStar('Keep  the   spacing').value, 'Keep  the   spacing')
}

const note = prepareCircleText('  How a project develops  ')
assert.deepEqual(note, { value: 'How a project develops' })
assert.deepEqual(prepareCircleText('   '), { error: 'Write a few words first.' })
assert.deepEqual(prepareCircleText('a'.repeat(circleItemMaxLength + 1)), { error: `Keep this to ${circleItemMaxLength} characters.` })

const opened = experienceContentView({
  northStar: 'I want to build something that helps people feel less isolated.',
  items: [control, concern],
})
const reopened = experienceContentView(opened)
assert.deepEqual(reopened, opened)
assert.equal(reopened.items[0].id, concern.id)
assert.equal(reopened.items[1].id, control.id)
assert.equal(reopened.northStar, opened.northStar)

const grouped = itemsByCircle(reopened.items)
assert.deepEqual(grouped.concern.map((item) => item.id), [concern.id])
assert.deepEqual(grouped.influence, [])
assert.deepEqual(grouped.control.map((item) => item.id), [control.id])
assert.equal(grouped.concern.length + grouped.influence.length + grouped.control.length, reopened.items.length)

const moved = movedCircleItem(concern, 'influence')
assert.equal(moved.id, concern.id)
assert.equal(moved.body, concern.body)
assert.equal(moved.createdAt, concern.createdAt)
assert.equal(moved.circle, 'influence')
assert.equal(concern.circle, 'concern')
const afterMove = itemsByCircle([moved, control])
assert.deepEqual(afterMove.influence.map((item) => item.id), [concern.id])
assert.deepEqual(afterMove.concern, [])
assert.equal(circles.map((circle) => circle.id).join(','), 'concern,influence,control')

const influence: CircleItem = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  circle: 'influence',
  body: 'How recommendations are presented',
  createdAt: '2026-11-13T21:00:00.000Z',
}
const blocked = proposeRelationship(concern, control, [])
assert.equal('error' in blocked, true)
const first = proposeRelationship(influence, concern, [])
assert.equal('error' in first, false)
if (!('error' in first)) {
  assert.equal(relationshipSentence(first.link, [influence, concern]), 'How recommendations are presented may affect Economic conditions.')
  const second = proposeRelationship(control, influence, [first.link])
  assert.equal('error' in second, false)
  if (!('error' in second)) {
    assert.equal(relationshipSentence(second.link, [control, influence]), 'My priorities may shape How recommendations are presented.')
    const thirdPartner: CircleItem = { ...concern, id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', body: 'The project deadline' }
    const third = proposeRelationship(influence, thirdPartner, [first.link, second.link])
    assert.equal('error' in third, false)
    const held = [first.link, second.link, ...('error' in third ? [] : [third.link])]
    assert.equal(held.length, 3)
    const fourth = proposeRelationship(control, { ...influence, id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', body: 'Trust' }, held)
    assert.deepEqual(fourth, { error: 'Three connections are on the ground. Remove one to add another.' })
    assert.equal(eligibleLinkPartners(concern, [concern, influence, control], []).some((item) => item.id === control.id), false)
    assert.equal(withoutPhrase(held, influence.id).length, 0)
    const relocated = reconcileRelationships(held, [movedCircleItem(influence, 'concern'), concern, control, thirdPartner])
    assert.equal(relocated.some((link) => link.id === first.link.id), false)
  }
}

const migration = readFileSync(new URL('../../supabase/migrations/20261113220000_experience_north_star_and_circles.sql', import.meta.url), 'utf8')
assert.equal('20261113200000_experiences.sql' < '20261113220000_experience_north_star_and_circles.sql', true)
assert.equal(migration.includes('add column north_star text'), true)
assert.equal(migration.includes(`char_length(north_star) between 1 and ${northStarMaxLength}`), true)
assert.equal(migration.includes('north_star is null'), true)
assert.equal(migration.includes('create table public.experience_circle_items'), true)
assert.equal(migration.includes("check (circle in ('concern', 'influence', 'control'))"), true)
assert.equal(migration.includes(`char_length(body) between 1 and ${circleItemMaxLength}`), true)
assert.equal(migration.includes('foreign key (experience_id, user_id)'), true)
assert.equal(migration.includes('references public.experiences (id, user_id)'), true)
assert.equal(migration.includes('on delete cascade'), true)
assert.equal(migration.includes("raise exception 'experience_id is immutable'"), true)
assert.equal(migration.includes('execute function public.prevent_experience_id_change()'), true)
assert.equal(migration.includes('execute function public.prevent_user_id_change()'), true)
assert.equal(migration.includes('execute function public.set_updated_at()'), true)
assert.equal(migration.includes('revoke all on table public.experience_circle_items from public, anon, authenticated, service_role'), true)
assert.equal(migration.includes('grant select, insert, update, delete on table public.experience_circle_items to authenticated'), true)
assert.equal(migration.includes('alter table public.experience_circle_items enable row level security'), true)
assert.equal(migration.includes('experience_circle_items_select'), true)
assert.equal(migration.includes('experience_circle_items_insert'), true)
assert.equal(migration.includes('experience_circle_items_update'), true)
assert.equal(migration.includes('experience_circle_items_delete'), true)
assert.equal(migration.includes('experience_circle_items_experience_membership'), true)
assert.equal(migration.includes('as restrictive'), true)
assert.equal(migration.includes('(select auth.uid()) = user_id'), true)
assert.equal(migration.includes('experience.user_id = (select auth.uid())'), true)
assert.equal(migration.includes('using (true)'), false)
assert.equal(migration.includes('with check (true)'), false)
assert.equal(migration.includes('due_date'), false)
assert.equal(migration.includes('priority'), false)
assert.equal(migration.includes('completed'), false)
assert.equal(/alter table public\.curiosities/i.test(migration), false)
assert.equal(migration.includes('curiosities.stage'), true)
assert.equal(migration.includes('service_role'), true)
assert.equal(migration.includes('dacfaoksxfqztnswmnfm'), true)

const writer = readFileSync(new URL('./supabase-experience-content.ts', import.meta.url), 'utf8')
assert.equal(writer.includes('experienceRecordPermitted'), true)
assert.equal(writer.includes('service_role'), false)
assert.equal(writer.includes('rememberCuriosityStage'), false)
for (const name of ['loadExperienceContent', 'saveNorthStar', 'addCircleItem', 'editCircleItem', 'deleteCircleItem', 'moveCircleItem']) {
  const start = writer.indexOf(`export async function ${name}`)
  const next = writer.indexOf('export async function', start + 10)
  const body = writer.slice(start, next === -1 ? undefined : next)
  assert.equal(start > 0, true)
  assert.equal(body.indexOf('requireWritableExperience(productionOpen)') < body.indexOf('.from('), true, name)
}
const editing = writer.slice(writer.indexOf('export async function editCircleItem'), writer.indexOf('export async function deleteCircleItem'))
const moving = writer.slice(writer.indexOf('export async function moveCircleItem'))
const adding = writer.slice(writer.indexOf('export async function addCircleItem'), writer.indexOf('export async function editCircleItem'))
const saving = writer.slice(writer.indexOf('export async function saveNorthStar'), writer.indexOf('export async function addCircleItem'))
const loading = writer.slice(writer.indexOf('export async function loadExperienceContent'), writer.indexOf('export async function saveNorthStar'))
assert.equal(saving.includes('north_star: prepared.value'), true)
assert.equal(saving.includes('curiosity_id'), false)
assert.equal(adding.includes('experience_id: experienceId'), true)
assert.equal(editing.includes('experience_id'), false)
assert.equal(editing.includes('body: prepared.value'), true)
assert.equal(moving.includes('experience_id'), false)
assert.equal(moving.includes('update({ circle })'), true)
assert.equal(loading.includes(".eq('experience_id', experienceId)"), true)
assert.equal(loading.includes("select('north_star')"), true)

const screen = readFileSync(new URL('../../components/studio/experience-screen.tsx', import.meta.url), 'utf8')
const clearing = readFileSync(new URL('../../components/studio/experience-clearing.tsx', import.meta.url), 'utf8')
assert.equal(screen.includes('rememberCuriosityStage'), false)
assert.equal(clearing.includes('rememberCuriosityStage'), false)
assert.equal(clearing.includes('North Star'), true)
assert.equal(clearing.includes('Concern'), true)
assert.equal(clearing.includes('Influence'), true)
assert.equal(clearing.includes('Control'), true)
assert.equal(clearing.includes('for now'), true)
assert.equal(clearing.includes('{relationshipVisitNote}'), true)
assert.equal(clearing.includes('{relationshipCapMessage}'), true)
assert.equal(relationshipVisitNote, 'Connections are held for this visit.')
assert.equal(relationshipCapMessage, 'Three connections are on the ground. Remove one to add another.')
assert.equal(clearing.includes('Nothing here yet.'), true)
assert.equal(clearing.includes('lg:grid-cols-3'), false)
assert.equal(clearing.includes('checkbox'), false)
assert.equal(clearing.includes('/api/'), false)
assert.equal(clearing.includes('openai'), false)
assert.equal(clearing.includes('fetch('), false)
assert.equal(clearing.includes('saveNorthStar'), true)
assert.equal(clearing.includes('addCircleItem'), true)
assert.equal(clearing.includes('editCircleItem'), true)
assert.equal(clearing.includes('deleteCircleItem'), true)
assert.equal(clearing.includes('moveCircleItem'), true)

console.log('experience content checks passed')
