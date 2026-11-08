import { readFileSync } from 'node:fs'
import { shouldApplyReturnedImage } from '../providers/image-run.ts'
import { conceptRemainsVisible, questionDispositionMap } from './library-carousel.ts'
import { addQuestion, addImageCandidate, beginImageSet, branchPartners, duplicateGroups, linkQuestions, mergeQuestions, migrateLegacyQuestions, openVisualise, plantedQuestion, removeBranch, restoreQuestion, saveConcept, selectCandidate, setDisposition, applyImageResult, updateConcept, visualiseQuestions, visualiseTarget, workspaceCounts } from './workspace.ts'
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

const gatheredId = third.questions[0].id
const retainedId = third.questions[1].id
const parkedId = third.questions[2].id
const mixed = {
  ...third,
  focusQuestionId: parkedId,
  focusConceptId: 'concept-kept',
  questions: third.questions.map((item) => {
    if (item.id === retainedId) return { ...item, disposition: 'retained' as const }
    if (item.id === parkedId) return { ...item, disposition: 'parked' as const }
    return item
  }),
}
assert.deepEqual(visualiseQuestions(mixed).map((item) => item.disposition), ['gathered', 'retained', 'parked'])
const openedGathered = openVisualise(mixed, gatheredId)
assert.equal(openedGathered.stage, 'visualise')
assert.equal(openedGathered.focusQuestionId, gatheredId)
assert.equal(openedGathered.focusConceptId, null)
assert.equal(openedGathered.questions.find((item) => item.id === gatheredId)?.disposition, 'gathered')
const openedRetained = openVisualise(mixed, retainedId)
assert.equal(openedRetained.focusQuestionId, retainedId)
assert.equal(openedRetained.questions.find((item) => item.id === retainedId)?.disposition, 'retained')
const openedParked = openVisualise(mixed, parkedId)
assert.equal(openedParked.focusQuestionId, parkedId)
assert.equal(openedParked.questions.find((item) => item.id === parkedId)?.disposition, 'parked')
assert.equal(visualiseTarget(mixed)?.id, parkedId)
assert.equal(visualiseTarget({ ...mixed, focusQuestionId: null })?.id, gatheredId)

const discarded = {
  ...mixed,
  questions: mixed.questions.map((item) => item.id === gatheredId ? { ...item, disposition: 'discarded' as const } : item),
}
assert.equal(visualiseQuestions(discarded).some((item) => item.id === gatheredId), false)
assert.equal(openVisualise(discarded, gatheredId), discarded)
assert.equal(visualiseQuestions(merged).some((item) => item.mergedIntoId), false)
assert.equal(openVisualise(merged, source.id), merged)
assert.equal(visualiseQuestions(linked).length, linked.questions.length)
assert.equal(openVisualise(linked, left.id).questions.find((item) => item.id === left.id)?.mergedIntoId, null)
assert.equal(openVisualise(linked, left.id).branches.length, 1)

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

function oneImage(id: 'tension' | 'trace' | 'scale' | 'relation', src: string) {
  return {
    source: 'openai' as const,
    notice: 'Made 1 image call.',
    reportedCostUsd: 0.1,
    stoppedBecause: 'complete' as const,
    model: 'gpt-image-2.5-flare',
    promptVersion: 'image-eval-1',
    candidates: [{ id, label: id, metaphor: id, prompt: 'hidden', src: `data:image/svg+xml,${src}`, source: 'openai' as const, usage: null }],
  }
}
const prompt = 'What remains unresolved after an answer arrives?'
const questionId = considered.questions[2].id
const started = beginImageSet(considered, questionId, prompt)
assert.equal(started.drafts[0].candidates.length, 0)
const firstImage = addImageCandidate(started, questionId, oneImage('tension', 'one'), prompt)
assert.equal(firstImage.drafts[0].candidates.length, 1)
const pickedImage = selectCandidate(firstImage, questionId, 'tension')
const secondImage = addImageCandidate(pickedImage, questionId, oneImage('trace', 'two'), prompt)
assert.deepEqual(secondImage.drafts[0].candidates.map((candidate) => candidate.id), ['tension', 'trace'])
assert.equal(secondImage.drafts[0].selectedId, 'tension')
assert.equal(secondImage.drafts[0].candidates[0].src, 'data:image/svg+xml,one')
const failedImage = addImageCandidate(secondImage, questionId, { ...oneImage('scale', 'three'), candidates: [] }, prompt)
assert.equal(failedImage, secondImage)
const retriedImage = addImageCandidate(failedImage, questionId, oneImage('trace', 'retried'), prompt)
assert.equal(retriedImage.drafts[0].candidates.length, 2)
assert.equal(retriedImage.drafts[0].candidates.find((candidate) => candidate.id === 'trace')?.src, 'data:image/svg+xml,retried')
assert.equal(retriedImage.drafts[0].selectedId, 'tension')
const revised = {
  ...retriedImage,
  questions: retriedImage.questions.map((item) => item.id === questionId ? { ...item, consideredText: 'A revised question.' } : item),
}
assert.equal(addImageCandidate(revised, questionId, oneImage('scale', 'late'), prompt), revised)
assert.equal(beginImageSet(revised, questionId, prompt), revised)
const keptImage = selectCandidate(secondImage, questionId, 'tension')
const savedDuringRun = saveConcept(keptImage, questionId, 'Held still', [])
assert.equal(savedDuringRun.concepts[0].forConsideredText, prompt)
assert.equal(savedDuringRun.concepts[0].anchorQuestionId, questionId)
assert.equal(savedDuringRun.concepts[0].imageSrc, 'data:image/svg+xml,one')
assert.equal(savedDuringRun.concepts[0].questionIds[0], questionId)
assert.equal(savedDuringRun.drafts.some((draft) => draft.questionId === questionId), false)
const lateImage = shouldApplyReturnedImage(false) ? addImageCandidate(savedDuringRun, questionId, oneImage('scale', 'late'), prompt) : savedDuringRun
assert.equal(lateImage, savedDuringRun)
assert.equal(lateImage.concepts[0].imageSrc, 'data:image/svg+xml,one')
assert.equal(lateImage.concepts[0].forConsideredText, prompt)
assert.equal(lateImage.concepts[0].id, savedDuringRun.concepts[0].id)
assert.equal(lateImage.drafts.some((draft) => draft.questionId === questionId), false)

const stale = {
  ...chosen,
  questions: chosen.questions.map((item) => item.id === considered.questions[2].id ? { ...item, consideredText: 'A revised question.' } : item),
}
assert.equal(saveConcept(stale, considered.questions[2].id, 'After answer', [considered.questions[1].id]), stale)

assert.equal(saveConcept(chosen, considered.questions[2].id, 'After', []).concepts[0]?.title, 'After')
assert.equal(saveConcept(chosen, considered.questions[2].id, 'one two three', []), chosen)
assert.equal(titleProblem('one two three'), 'Use one or two words.')
assert.equal(titleProblem('After'), null)
assert.equal(titleProblem('After answer'), null)

const kept = saveConcept(chosen, considered.questions[2].id, 'After answer', [considered.questions[1].id])
assert.equal(kept.concepts.length, 1)
assert.deepEqual(kept.concepts[0].questionIds, [considered.questions[2].id, considered.questions[1].id])
assert.equal(kept.concepts[0].title, 'After answer')
assert.equal(kept.concepts[0].forConsideredText, 'What remains unresolved after an answer arrives?')
assert.notEqual(kept.concepts[0].forConsideredText, considered.questions[2].originalText)
assert.equal(kept.concepts[0].anchorQuestionId, considered.questions[2].id)
assert.equal(kept.concepts[0].imageSource, 'demo')
assert.equal(kept.drafts.length, 0)
assert.equal(kept.stage, 'gather')
assert.equal(kept.focusConceptId, kept.concepts[0].id)

const anchorId = considered.questions[2].id
const contributorId = considered.questions[1].id
const discardedSource = setDisposition(kept, anchorId, 'discarded')
assert.equal(discardedSource.questions.find((item) => item.id === anchorId)?.disposition, 'discarded')
assert.equal(discardedSource.questions.length, kept.questions.length)
assert.equal(visualiseQuestions(discardedSource).some((item) => item.id === anchorId), false)
assert.equal(discardedSource.concepts, kept.concepts)
assert.equal(discardedSource.concepts[0].title, 'After answer')
assert.equal(discardedSource.concepts[0].imageSrc, kept.concepts[0].imageSrc)
assert.equal(discardedSource.concepts[0].forConsideredText, kept.concepts[0].forConsideredText)
assert.equal(discardedSource.concepts.length, 1)
assert.equal(conceptRemainsVisible(discardedSource.concepts[0], questionDispositionMap(discardedSource.questions)), false)
assert.equal(workspaceCounts(discardedSource).concepts, 0)
const onlyContributor = setDisposition(kept, contributorId, 'discarded')
assert.equal(onlyContributor.concepts, kept.concepts)
assert.equal(conceptRemainsVisible(onlyContributor.concepts[0], questionDispositionMap(onlyContributor.questions)), true)
assert.equal(workspaceCounts(onlyContributor).concepts, 1)
const discardedContributor = setDisposition(discardedSource, contributorId, 'discarded')
assert.equal(discardedContributor.concepts, kept.concepts)
const retitled = updateConcept(discardedContributor, kept.concepts[0].id, 'After answer', [contributorId])
assert.deepEqual(retitled.concepts[0].questionIds, [anchorId, contributorId])
assert.equal(retitled.concepts[0].imageSrc, kept.concepts[0].imageSrc)
assert.equal(retitled.concepts.length, 1)
const restoredConcept = restoreQuestion(discardedContributor, anchorId)
assert.equal(restoredConcept.questions.find((item) => item.id === anchorId)?.disposition, 'gathered')
assert.equal(restoredConcept.concepts.length, 1)
assert.equal(restoredConcept.concepts[0].id, kept.concepts[0].id)
assert.equal(restoredConcept.concepts[0].title, 'After answer')
assert.equal(restoredConcept.concepts[0].imageSrc, kept.concepts[0].imageSrc)
assert.equal(restoredConcept.concepts[0].forConsideredText, kept.concepts[0].forConsideredText)
assert.equal(conceptRemainsVisible(restoredConcept.concepts[0], questionDispositionMap(restoredConcept.questions)), true)
assert.equal(workspaceCounts(restoredConcept).concepts, 1)

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

const gatherView = readFileSync(new URL('../../components/studio/gather-stage.tsx', import.meta.url), 'utf8')
assert.equal(gatherView.includes('Visualise: ${item.originalText}'), true)
assert.equal(gatherView.includes('Open Curate'), false)
assert.equal(gatherView.includes('openVisualise'), true)
const visualiseView = readFileSync(new URL('../../components/studio/visualise-stage.tsx', import.meta.url), 'utf8')
assert.equal(visualiseView.includes('visualiseQuestions'), true)
assert.equal(visualiseView.includes("disposition === 'retained' || item.disposition === 'gathered'"), false)
assert.equal(visualiseView.includes('/api/images'), true)
assert.equal(visualiseView.includes('/api/titles'), true)
assert.equal(visualiseView.includes('Suggest titles'), true)
assert.equal(visualiseView.includes("stage: 'distil'"), false)
assert.equal(visualiseView.includes("stage: 'library'"), true)
const suggestStart = visualiseView.indexOf('async function askForTitles')
const suggestEnd = visualiseView.indexOf('function saveSelected')
const suggestBody = visualiseView.slice(suggestStart, suggestEnd)
assert.equal(suggestStart >= 0 && suggestEnd > suggestStart, true)
assert.equal(suggestBody.includes('setTitle'), false)
assert.equal(suggestBody.includes('/api/images'), false)
assert.equal(suggestBody.includes('saveConcept'), false)

const migration = readFileSync(new URL('../../supabase/migrations/20261030200000_question_branches.sql', import.meta.url), 'utf8')
assert.equal(migration.includes('create table public.question_branches'), true)
assert.equal(migration.includes('question_low_id < question_high_id'), true)
assert.equal(migration.includes('original_text'), false)
assert.equal(migration.includes('merged_into_id'), false)
assert.equal(migration.includes('enable row level security'), true)
assert.equal(migration.includes('grant select, insert, delete'), true)
assert.equal(migration.includes('grant update'), false)

console.log('workspace checks passed')
