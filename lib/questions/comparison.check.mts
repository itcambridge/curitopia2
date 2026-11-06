import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { conceptCardQuestion } from './library-carousel.ts'
import { allCuriositiesFocus, libraryConceptsForFocus } from './library-focus.ts'
import { comparisonScopeNotice, comparisonTooFewNotice, filterComparisonConcepts, questionFromReflection, reconcileComparisonScope, replaceComparison, swapComparison, toggleComparisonPick } from './comparison.ts'

const pair = { leftId: 'alpha', rightId: 'beta' }
assert.deepEqual(toggleComparisonPick([], 'alpha'), { picks: ['alpha'], status: 'added' })
assert.deepEqual(toggleComparisonPick(['alpha'], 'beta'), { picks: ['alpha', 'beta'], status: 'ready' })
assert.deepEqual(toggleComparisonPick(['alpha', 'beta'], 'gamma'), { picks: ['alpha', 'beta'], status: 'full' })
assert.deepEqual(toggleComparisonPick(['alpha', 'beta'], 'alpha'), { picks: ['beta'], status: 'removed' })

const swapped = swapComparison(pair)
assert.deepEqual(swapped, { leftId: 'beta', rightId: 'alpha' })
assert.deepEqual(pair, { leftId: 'alpha', rightId: 'beta' })
assert.deepEqual(replaceComparison(pair, 'left', 'gamma'), { leftId: 'gamma', rightId: 'beta' })
assert.deepEqual(replaceComparison(pair, 'right', 'gamma'), { leftId: 'alpha', rightId: 'gamma' })
assert.equal(replaceComparison(pair, 'left', 'beta'), null)
assert.equal(replaceComparison(pair, 'right', 'alpha'), null)
assert.deepEqual(pair, { leftId: 'alpha', rightId: 'beta' })

const quantum = 'quantum'
const fujitsu = 'fujitsu'
const account = [
  { id: 'modulation', title: 'Common Variety', curiosityId: quantum, question: 'Where can modulation be found?' },
  { id: 'doomloop', title: 'Outside World', curiosityId: fujitsu, question: 'How do I prevent a doomloop?' },
  { id: 'stillness', title: 'Quiet field', curiosityId: quantum, question: 'What does stillness hold?' },
  { id: 'glass', title: 'Glass House', curiosityId: fujitsu, question: 'What grows under glass?' },
]
const textFor = (concept: (typeof account)[number]) => `${concept.title} ${concept.question} ${concept.curiosityId}`
const quantumConcepts = libraryConceptsForFocus(account, quantum)
const fujitsuConcepts = libraryConceptsForFocus(account, fujitsu)
const everyone = libraryConceptsForFocus(account, allCuriositiesFocus)
assert.deepEqual(quantumConcepts.map((concept) => concept.id), ['modulation', 'stillness'])
assert.deepEqual(fujitsuConcepts.map((concept) => concept.id), ['doomloop', 'glass'])
assert.equal(everyone.length, account.length)
assert.deepEqual(filterComparisonConcepts(quantumConcepts, 'doomloop', textFor).map((concept) => concept.id), [])
assert.deepEqual(filterComparisonConcepts(quantumConcepts, 'modulation', textFor).map((concept) => concept.id), ['modulation'])
assert.deepEqual(filterComparisonConcepts(fujitsuConcepts, 'glass', textFor).map((concept) => concept.id), ['glass'])
assert.deepEqual(filterComparisonConcepts(everyone, 'doomloop', textFor).map((concept) => concept.id), ['doomloop'])
assert.equal(filterComparisonConcepts(everyone, '   ', textFor).length, 4)

const quantumIds = new Set(quantumConcepts.map((concept) => concept.id))
const fujitsuIds = new Set(fujitsuConcepts.map((concept) => concept.id))
const allIds = new Set(everyone.map((concept) => concept.id))
const quantumPair = { leftId: 'modulation', rightId: 'stillness' }
const crossPair = { leftId: 'modulation', rightId: 'doomloop' }
assert.deepEqual(reconcileComparisonScope(quantumPair, null, quantumIds, quantumConcepts.length, 'Quantum Physics'), { mode: 'pair', pair: quantumPair })
assert.deepEqual(reconcileComparisonScope(crossPair, null, allIds, everyone.length, null), { mode: 'pair', pair: crossPair })
assert.deepEqual(reconcileComparisonScope(crossPair, null, quantumIds, quantumConcepts.length, 'Quantum Physics'), {
  mode: 'select',
  picks: ['modulation'],
  notice: comparisonScopeNotice('Quantum Physics'),
})
assert.deepEqual(reconcileComparisonScope(quantumPair, null, fujitsuIds, fujitsuConcepts.length, 'Fujitsu Biotech'), {
  mode: 'select',
  picks: [],
  notice: 'Choose concepts from Fujitsu Biotech.',
})
assert.deepEqual(reconcileComparisonScope(null, ['modulation', 'doomloop'], quantumIds, quantumConcepts.length, 'Quantum Physics'), {
  mode: 'select',
  picks: ['modulation'],
  notice: comparisonScopeNotice('Quantum Physics'),
})
assert.deepEqual(reconcileComparisonScope(null, ['modulation', 'stillness'], quantumIds, quantumConcepts.length, 'Quantum Physics'), {
  mode: 'select',
  picks: ['modulation', 'stillness'],
  notice: null,
})
assert.deepEqual(reconcileComparisonScope(crossPair, null, new Set(['modulation']), 1, 'Quantum Physics'), {
  mode: 'browse',
  notice: comparisonTooFewNotice('Quantum Physics'),
})
assert.equal(reconcileComparisonScope(null, null, quantumIds, quantumConcepts.length, 'Quantum Physics').mode, 'idle')
assert.equal(replaceComparison(quantumPair, 'left', 'stillness'), null)
assert.equal(replaceComparison(quantumPair, 'right', 'modulation'), null)
assert.deepEqual(replaceComparison(quantumPair, 'left', 'stillness') ?? quantumPair, quantumPair)
const replacementList = filterComparisonConcepts(quantumConcepts, '', textFor).filter((concept) => concept.id !== quantumPair.rightId)
assert.equal(replacementList.every((concept) => concept.curiosityId === quantum), true)
assert.equal(replacementList.some((concept) => concept.id === quantumPair.rightId), false)

assert.equal(questionFromReflection('  ').ok, false)
assert.equal(questionFromReflection('  ').ok === false && questionFromReflection('  ').error, 'Write the question you want to keep.')
assert.equal(questionFromReflection('What remains').ok && questionFromReflection('What remains').text, 'What remains?')
assert.equal(questionFromReflection('What remains?').ok && questionFromReflection('What remains?').text, 'What remains?')
assert.equal(questionFromReflection('a'.repeat(2000)).ok, false)

const card = conceptCardQuestion({
  anchorQuestionId: 'q1',
  questionIds: ['q1'],
  sources: [{ linkId: 'a', questionId: 'q1', originalText: 'How do gravity and time meet?', consideredText: 'A clock falling through a dark well.' }],
}, [])
assert.equal(card, 'How do gravity and time meet?')

const view = readFileSync(new URL('../../components/studio/library-view.tsx', import.meta.url), 'utf8')
const comparison = readFileSync(new URL('../../components/studio/concept-comparison.tsx', import.meta.url), 'utf8')
assert.equal(view.includes('Compare'), true)
assert.equal(view.includes('concepts={concepts}'), true)
assert.equal(view.includes('concepts={records}'), false)
assert.equal(view.includes('reconcileComparisonScope'), true)
assert.equal(view.includes('grid-cols-2'), false)
assert.equal(comparison.includes('grid-cols-2'), true)
assert.equal(comparison.includes('object-contain'), true)
assert.equal(comparison.includes('Read full question'), true)
assert.equal(comparison.includes('Swap sides'), true)
assert.equal(comparison.includes('Replace left'), true)
assert.equal(comparison.includes('Replace right'), true)
assert.equal(comparison.includes('/api/'), false)
assert.equal(comparison.includes('concept_connections'), false)
assert.equal(comparison.includes('service_role'), false)
assert.equal(comparison.includes('forConsideredText'), false)
assert.equal(comparison.includes('insertQuestion'), true)
assert.equal(comparison.includes('addQuestion'), true)
assert.equal(comparison.includes('whichever one Show is set to'), false)
assert.equal(comparison.includes('Choose two concepts from'), true)
assert.equal(comparison.includes('Concepts from'), true)

console.log('comparison checks passed')
