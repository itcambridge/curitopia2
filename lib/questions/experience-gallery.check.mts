import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { experienceGallery, galleryHasVisualisations } from './experience-gallery.ts'
import type { ConceptRecord } from './types.ts'

const experienceId = '22222222-2222-4222-8222-222222222222'
const otherExperienceId = '33333333-3333-4333-8333-333333333333'

function concept(input: Partial<ConceptRecord> & Pick<ConceptRecord, 'id' | 'title' | 'createdAt'>): ConceptRecord {
  return {
    imageSrc: `https://images.example/${input.id}`,
    imagePath: `user/${input.id}/kept.webp`,
    imageLabel: 'Held',
    imageSource: 'openai',
    model: 'gpt-image-2.5-flare',
    promptVersion: 'image-eval-1',
    forConsideredText: 'A held tension.',
    anchorQuestionId: null,
    questionIds: [],
    sources: [],
    experienceSource: null,
    updatedAt: input.createdAt,
    ...input,
  }
}

function experienceConcept(id: string, circle: 'concern' | 'influence' | 'control', createdAt: string, extras: Partial<ConceptRecord> = {}): ConceptRecord {
  return concept({
    id,
    title: id,
    createdAt,
    experienceSource: {
      linkId: `link-${id}`,
      experienceId,
      itemId: `item-${id}`,
      curiosityId: '11111111-1111-4111-8111-111111111111',
      circle,
      originalText: `Original ${id}`,
    },
    ...extras,
  })
}

const concern = experienceConcept('concern-new', 'concern', '2026-05-02T00:00:00.000Z')
const concernOlder = experienceConcept('concern-old', 'concern', '2026-05-01T00:00:00.000Z', {
  experienceSource: {
    linkId: 'link-concern-old',
    experienceId,
    itemId: null,
    curiosityId: '11111111-1111-4111-8111-111111111111',
    circle: 'concern',
    originalText: 'Whether a market narrative gathers force',
  },
})
const influence = experienceConcept('influence-one', 'influence', '2026-05-03T00:00:00.000Z')
const control = experienceConcept('control-one', 'control', '2026-04-01T00:00:00.000Z')
const garden = concept({
  id: 'garden-one',
  title: 'Garden One',
  createdAt: '2026-06-01T00:00:00.000Z',
  anchorQuestionId: 'question-1',
  questionIds: ['question-1'],
})
const otherExperience = experienceConcept('other-experience', 'concern', '2026-06-02T00:00:00.000Z', {
  experienceSource: {
    linkId: 'link-other',
    experienceId: otherExperienceId,
    itemId: 'item-other',
    curiosityId: '11111111-1111-4111-8111-111111111111',
    circle: 'concern',
    originalText: 'Another experience',
  },
})
const duplicate = { ...concern, title: 'Duplicate title' }
const missingImage = experienceConcept('missing-image', 'control', '2026-03-01T00:00:00.000Z', { imageSrc: '' })

const grouped = experienceGallery([
  garden,
  otherExperience,
  concernOlder,
  influence,
  control,
  concern,
  duplicate,
  missingImage,
], experienceId)

assert.deepEqual(grouped.concern.map((item) => item.id), ['concern-new', 'concern-old'])
assert.deepEqual(grouped.influence.map((item) => item.id), ['influence-one'])
assert.deepEqual(grouped.control.map((item) => item.id), ['control-one', 'missing-image'])
assert.equal(grouped.concern[1]?.experienceSource?.originalText, 'Whether a market narrative gathers force')
assert.equal(grouped.concern[1]?.experienceSource?.itemId, null)
assert.equal(grouped.concern.some((item) => item.id === 'garden-one'), false)
assert.equal(grouped.concern.some((item) => item.id === 'other-experience'), false)
assert.equal(grouped.concern.filter((item) => item.id === 'concern-new').length, 1)
assert.equal(galleryHasVisualisations(experienceGallery([], experienceId)), false)
assert.equal(galleryHasVisualisations(grouped), true)
assert.equal(experienceGallery([concern], otherExperienceId).concern.length, 0)

const gallery = readFileSync(new URL('../../components/studio/experience-gallery.tsx', import.meta.url), 'utf8')
const carousel = readFileSync(new URL('../../components/studio/topic-carousel.tsx', import.meta.url), 'utf8')
const editor = readFileSync(new URL('../../components/studio/concept-editor.tsx', import.meta.url), 'utf8')
const conversation = readFileSync(new URL('../../components/studio/experience-conversation.tsx', import.meta.url), 'utf8')
const facilitator = readFileSync(new URL('./experience-facilitator.ts', import.meta.url), 'utf8')
const proposals = readFileSync(new URL('./experience-proposals.ts', import.meta.url), 'utf8')
const concepts = readFileSync(new URL('./supabase-concepts.ts', import.meta.url), 'utf8')
assert.equal(gallery.includes('TopicCarousel'), true)
assert.equal(gallery.includes('itemNoun="visualisation"'), true)
assert.equal(gallery.includes('cardWidth="collection"'), true)
assert.equal(gallery.includes('aspect-square'), true)
assert.equal(gallery.includes('object-contain'), true)
assert.equal(gallery.includes('aspect-[4/5]'), false)
assert.equal(carousel.includes("cardWidth = 'topic'"), true)
assert.equal(carousel.includes('w-[82%] shrink-0 snap-start'), true)
assert.equal(carousel.includes('w-[82%] max-w-[30rem]'), true)
assert.equal(carousel.includes('@min-[52rem]:w-[min(42%,30rem)]'), true)
assert.equal(gallery.includes('No visualisations here yet.'), true)
assert.equal(gallery.includes('ConceptEditor'), true)
assert.equal(gallery.includes('Back to this experience'), true)
assert.equal(gallery.includes('service_role'), false)
assert.equal(gallery.includes('.insert('), false)
assert.equal(gallery.includes('from(\'concepts\')'), false)
assert.equal(carousel.includes('prefers-reduced-motion'), true)
assert.equal(carousel.includes('ArrowLeft'), true)
assert.equal(carousel.includes('ArrowRight'), true)
assert.equal(carousel.includes('aria-hidden'), true)
assert.equal(carousel.includes('touch-pan-x'), true)
assert.equal(carousel.includes('itemNoun = \'topic\''), true)
assert.equal(editor.includes('Back to the library'), true)
assert.equal(conversation.includes('experience-gallery'), false)
assert.equal(conversation.includes('Visualisations'), false)
assert.equal(facilitator.includes('experience-gallery'), false)
assert.equal(facilitator.includes('original_text_snapshot'), false)
assert.equal(proposals.includes('experience-gallery'), false)
assert.equal(concepts.includes('service_role'), false)
assert.equal(concepts.includes(".eq(column, value)"), true)
assert.equal(concepts.includes(".eq('curiosity_id', curiosityId)"), true)

console.log('experience gallery checks passed')
console.log('grouping is an in-memory check of already loaded concepts; no database was contacted')
