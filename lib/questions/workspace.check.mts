import { readFileSync } from 'node:fs'
import { addQuestion, branchPartners, duplicateGroups, linkQuestions, mergeQuestions, migrateLegacyQuestions, plantedQuestion, removeBranch, restoreQuestion, saveConcept, selectCandidate, applyImageResult, workspaceCounts } from './workspace.ts'
import { emptyWorkspace } from './workspace.ts'
import { titleProblem } from './title.ts'
import assert from 'node:assert/strict'

function fresh() {
  return emptyWorkspace()
}

assert.equal(plantedQuestion('What makes people curious'), 'What makes people curious?')
assert.equal(plantedQuestion('What makes people curious?'), 'What makes people curious?')
assert.equal(plantedQuestion('  What makes people curious?  '), 'What makes people curious?')
assert.equal(plantedQuestion('What makes people curious!'), 'What makes people curious!?')

const first = addQuestion(fresh(), '  Why does the room feel far away?  ')
assert.equal(first.questions[0].originalText, 'Why does the room feel far away?')
assert.equal(first.questions[0].disposition, 'gathered')
const second = addQuestion(first, 'Why does the room feel far away?')
const third = addQuestion(second, 'What keeps a finished answer from staying finished?')
assert.equal(third.questions.length, 3)
assert.equal(third.questions[2].originalText, 'Why does the room feel far away?')

const groups = duplicateGroups(third)
assert.equal(groups.length, 1)
assert.equal(groups[0].length, 2)

const survivor = third.questions[1]
const source = third.questions[2]
const merged = mergeQuestions(third, source.id, survivor.id)
assert.equal(merged.questions.find((item) => item.id === source.id)?.mergedIntoId, survivor.id)
assert.equal(merged.questions.find((item) => item.id === source.id)?.originalText, source.originalText)
assert.equal(merged.questions.find((item) => item.id === survivor.id)?.originalText, survivor.originalText)
assert.equal(duplicateGroups(merged).length, 0)

const left = third.questions[0]
const right = third.questions[1]
const linked = linkQuestions(third, left.id, right.id)
assert.equal(linked.branches.length, 1)
assert.equal(linked.questions.find((item) => item.id === left.id)?.originalText, left.originalText)
assert.equal(linked.questions.find((item) => item.id === right.id)?.originalText, right.originalText)
assert.equal(linked.questions.find((item) => item.id === left.id)?.disposition, left.disposition)
assert.equal(linked.questions.find((item) => item.id === right.id)?.mergedIntoId, null)
assert.equal(linkQuestions(linked, right.id, left.id).branches.length, 1)
assert.equal(linkQuestions(linked, left.id, left.id).branches.length, 1)
assert.equal(branchPartners(linked, left.id)[0]?.id, right.id)
assert.equal(branchPartners(linked, right.id)[0]?.id, left.id)
assert.equal(removeBranch(linked, linked.branches[0].id).branches.length, 0)
assert.equal(removeBranch(linked, linked.branches[0].id).questions.length, linked.questions.length)

const restored = restoreQuestion(merged, source.id)
assert.equal(restored.questions.find((item) => item.id === source.id)?.mergedIntoId, null)
assert.equal(restored.questions.find((item) => item.id === source.id)?.disposition, 'gathered')

const parked = { ...third, questions: third.questions.map((item) => item.id === third.questions[2].id ? { ...item, disposition: 'parked' as const } : item) }
assert.equal(workspaceCounts(parked).parked, 1)
const back = restoreQuestion(parked, third.questions[2].id)
assert.equal(back.questions.find((item) => item.id === third.questions[2].id)?.disposition, 'gathered')
assert.equal(back.questions.length, 3)

const considered = {
  ...third,
  questions: third.questions.map((item, index) => index === 2 ? { ...item, consideredText: 'What remains unresolved after an answer arrives?', disposition: 'retained' as const } : item),
}
const withImages = applyImageResult(considered, considered.questions[2].id, {
  source: 'demo',
  notice: 'Demo fixtures.',
  reportedCostUsd: null,
  stoppedBecause: 'complete',
  model: null,
  promptVersion: null,
  candidates: [
    { id: 'tension', label: 'Tension', metaphor: 'two forces', prompt: 'hidden', src: 'data:image/svg+xml,one', source: 'demo', usage: null },
    { id: 'trace', label: 'Trace', metaphor: 'a residue', prompt: 'hidden', src: 'data:image/svg+xml,two', source: 'demo', usage: null },
  ],
}, 'What remains unresolved after an answer arrives?')
const chosen = selectCandidate(withImages, considered.questions[2].id, 'trace')
const failedReplace = applyImageResult(chosen, considered.questions[2].id, {
  source: 'openai',
  notice: 'The image provider did not return an image. Nothing was retried.',
  reportedCostUsd: 0,
  stoppedBecause: 'error',
  model: 'gpt-image-2.5-flare',
  promptVersion: 'image-eval-1',
  candidates: [],
}, 'What remains unresolved after an answer arrives?')
assert.equal(failedReplace.drafts[0].candidates.length, 2)

const stale = {
  ...chosen,
  questions: chosen.questions.map((item) => item.id === considered.questions[2].id ? { ...item, consideredText: 'A revised question.' } : item),
}
assert.equal(saveConcept(stale, considered.questions[2].id, 'After answer', [considered.questions[1].id]), stale)

const kept = saveConcept(chosen, considered.questions[2].id, 'After answer', [considered.questions[1].id])
assert.equal(kept.concepts.length, 1)
assert.deepEqual(kept.concepts[0].questionIds, [considered.questions[2].id, considered.questions[1].id])
assert.equal(kept.concepts[0].title, 'After answer')
assert.equal(kept.concepts[0].imageSource, 'demo')
assert.equal(kept.drafts.length, 0)
assert.equal(titleProblem('one two three'), 'Use one or two words.')

const legacy = migrateLegacyQuestions([{
  id: 'legacy-1',
  originalText: 'I am in the room and still outside it.',
  consideredText: 'How can someone be present among others and still be unreached?',
  imageTitle: 'Quiet distance',
  imageSrc: 'data:image/svg+xml,kept',
  imageLabel: 'Tension',
  imageSource: 'demo',
  createdAt: '2026-10-25T00:00:00.000Z',
  updatedAt: '2026-10-25T00:00:00.000Z',
}])
assert.equal(legacy.questions.length, 1)
assert.equal(legacy.concepts.length, 1)
assert.equal(legacy.concepts[0].questionIds.length, 1)
assert.equal(legacy.concepts[0].imageSource, 'demo')
assert.equal('imageSrc' in legacy.questions[0], false)

const migration = readFileSync(new URL('../../supabase/migrations/20261030200000_question_branches.sql', import.meta.url), 'utf8')
assert.equal(migration.includes('create table public.question_branches'), true)
assert.equal(migration.includes('question_low_id < question_high_id'), true)
assert.equal(migration.includes('original_text'), false)
assert.equal(migration.includes('merged_into_id'), false)
assert.equal(migration.includes('enable row level security'), true)
assert.equal(migration.includes('grant select, insert, delete'), true)
assert.equal(migration.includes('grant update'), false)

console.log('workspace checks passed')
