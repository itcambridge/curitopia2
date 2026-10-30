import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { workspaceForAccount } from './account-workspace.ts'
import { curiosityDraftKey, curiosityNameProblem, initialCuriosityName } from './curiosity.ts'
import type { QuestionRecord, Workspace } from './types.ts'

assert.equal(curiosityNameProblem(''), 'Name the curiosity.')
assert.equal(curiosityNameProblem('   '), 'Name the curiosity.')
assert.equal(curiosityNameProblem('a'.repeat(81)), 'Keep the name within 80 characters.')
assert.equal(curiosityNameProblem('First garden'), null)
assert.equal(initialCuriosityName, 'Garden')

const firstKey = curiosityDraftKey('11111111-1111-4111-8111-111111111111')
const secondKey = curiosityDraftKey('22222222-2222-4222-8222-222222222222')
assert.notEqual(firstKey, secondKey)
assert.equal(firstKey.includes('curitopia.v2.workspace'), false)
assert.equal(firstKey.includes('curitopia.v2.questions'), false)

function question(id: string, text: string): QuestionRecord {
  return {
    id,
    originalText: text,
    consideredText: null,
    disposition: 'gathered',
    mergedIntoId: null,
    createdAt: '2026-10-28T00:00:00.000Z',
    updatedAt: '2026-10-28T00:00:00.000Z',
  }
}

const local: Workspace = {
  stage: 'gather',
  focusQuestionId: null,
  focusConceptId: null,
  questions: [],
  branches: [],
  drafts: [],
  concepts: [],
}
const gardenA = question('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'A question in the first curiosity')
const gardenB = question('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'A question in the second curiosity')
const openedA = workspaceForAccount(local, [gardenA], [])
const openedB = workspaceForAccount(local, [gardenB], [])
assert.equal(openedA.questions.some((item) => item.id === gardenB.id), false)
assert.equal(openedB.questions.some((item) => item.id === gardenA.id), false)

const migration = readFileSync(new URL('../../supabase/migrations/20261028173000_curiosities.sql', import.meta.url), 'utf8')
const lowered = migration.toLowerCase()
assert.equal(migration.includes('create table public.curiosities'), true)
assert.equal(migration.includes("insert into public.curiosities (id, user_id, name)"), true)
assert.equal(migration.includes("'Garden'"), true)
assert.equal(migration.includes('set curiosity_id = curiosity.id'), true)
assert.equal(migration.includes('set curiosity_id = concept.curiosity_id'), true)
assert.equal(migration.includes('questions_curiosity_membership'), true)
assert.equal(migration.includes('concepts_curiosity_membership'), true)
assert.equal(migration.includes('concept_questions_curiosity_membership'), true)
assert.equal(migration.includes('as restrictive'), true)
assert.equal(migration.includes('auth.uid()'), true)
assert.equal(migration.includes('curiosity_id is immutable'), true)
assert.equal(migration.includes('on delete set null (question_id)'), true)
assert.equal(lowered.includes('delete from public.questions'), false)
assert.equal(lowered.includes('delete from public.concepts'), false)
assert.equal(lowered.includes('delete from public.concept_questions'), false)
assert.equal(lowered.includes('delete from storage.objects'), false)
assert.equal(lowered.includes('drop table'), false)
assert.equal(lowered.includes('image_path'), false)

const questions = readFileSync(new URL('./supabase-questions.ts', import.meta.url), 'utf8')
const concepts = readFileSync(new URL('./supabase-concepts.ts', import.meta.url), 'utf8')
const landing = readFileSync(new URL('../../components/studio/curiosity-landing.tsx', import.meta.url), 'utf8')
const page = readFileSync(new URL('../../app/page.tsx', import.meta.url), 'utf8')
assert.equal(questions.includes(".eq('curiosity_id', curiosityId)"), true)
assert.equal(questions.includes('curiosity_id: curiosityId'), true)
assert.equal(concepts.includes(".eq('curiosity_id', curiosityId)"), true)
assert.equal(concepts.includes('curiosity_id: curiosityId'), true)
assert.equal(concepts.includes('${userId}/${concept.id}/kept.'), true)
assert.equal(landing.includes('images/generations'), false)
assert.equal(page.includes('<CuriosityLanding />'), true)
assert.equal(page.includes('CuritopiaApp'), true)

console.log('curiosity checks passed')
