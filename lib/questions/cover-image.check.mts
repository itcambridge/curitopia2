import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { coverImageMaxBytes, coverImageProblem, coverObjectPath, isDedicatedCoverPath } from './cover-image.ts'

assert.equal(coverImageProblem({ type: 'image/jpeg', size: 100 }), null)
assert.equal(coverImageProblem({ type: 'image/png', size: coverImageMaxBytes }), null)
assert.equal(coverImageProblem({ type: 'image/webp', size: 1 }), null)
assert.equal(coverImageProblem({ type: 'image/gif', size: 100 }), 'Use a JPEG, PNG, or WebP image.')
assert.equal(coverImageProblem({ type: 'image/jpeg', size: 0 }), 'That file is empty.')
assert.equal(coverImageProblem({ type: 'image/png', size: coverImageMaxBytes + 1 }), 'Keep the image within 5 MB.')

const userId = '11111111-1111-4111-8111-111111111111'
const curiosityId = '22222222-2222-4222-8222-222222222222'
const conceptId = '33333333-3333-4333-8333-333333333333'
const cover = coverObjectPath(userId, curiosityId, 'jpg', '44444444-4444-4444-8444-444444444444')
assert.equal(cover, `${userId}/covers/${curiosityId}/44444444-4444-4444-8444-444444444444.jpg`)
assert.equal(isDedicatedCoverPath(cover, userId, curiosityId), true)
assert.equal(isDedicatedCoverPath(`${userId}/${conceptId}/kept.png`, userId, curiosityId), false)
assert.equal(isDedicatedCoverPath(cover, '99999999-9999-4999-8999-999999999999', curiosityId), false)
assert.equal(isDedicatedCoverPath(`${userId}/covers/${curiosityId}/nested/file.png`, userId, curiosityId), false)

const migration = readFileSync(new URL('../../supabase/migrations/20261102120000_curiosity_cover_images.sql', import.meta.url), 'utf8')
const lowered = migration.toLowerCase()
assert.equal(migration.includes('add column cover_image_path text'), true)
assert.equal(migration.includes('cover_image_path is null'), true)
assert.equal(migration.includes('png|jpeg|jpg|webp'), true)
assert.equal(lowered.includes('set not null'), false)
assert.equal(lowered.includes('delete from'), false)
assert.equal(lowered.includes('drop table'), false)
assert.equal(lowered.includes('drop column'), false)
assert.equal(migration.includes('concept-images'), true)

const concepts = readFileSync(new URL('./supabase-concepts.ts', import.meta.url), 'utf8')
const covers = readFileSync(new URL('./supabase-curiosities.ts', import.meta.url), 'utf8')
assert.equal(concepts.includes('${userId}/${concept.id}/kept.'), true)
assert.equal(covers.includes('isDedicatedCoverPath'), true)
assert.equal(covers.includes(".eq('image_path', path)"), true)
assert.equal(covers.includes('upsert: false'), true)

console.log('cover image checks passed')
