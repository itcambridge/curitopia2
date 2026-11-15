import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { groundReading, readingFromUnknown, type FacilitationReading } from './experience-facilitator.ts'
import { holdExperiment, mergeProposals, proposalsFromReading, withoutProposal, type ExperimentProposal } from './experience-proposals.ts'

const keptId = '55555555-5555-4555-8555-555555555555'
const otherId = '66666666-6666-4666-8666-666666666666'

function reading(extra: Partial<FacilitationReading> = {}): FacilitationReading {
  return {
    say: 'It sounds as though finding people who want this is still open, while showing it to someone is already a choice.',
    interpretation: 'The market is not the same thing as the next conversation.',
    forces: [],
    interaction: null,
    followUp: null,
    northStar: null,
    phrases: [],
    revisions: [],
    shifts: [],
    ...extra,
  }
}

const context = {
  curiosityName: 'This app',
  northStar: 'Find a market for this app and take profit on the value this app offers',
  phrases: [
    { id: keptId, circle: 'concern' as const, body: 'Whether people will pay' },
    { id: otherId, circle: 'control' as const, body: 'Who I show it to next' },
  ],
  questions: [],
  concepts: [],
}

const proposed = groundReading(reading({
  phrases: [{ circle: 'influence', body: 'How I describe the value', because: 'You can shape the telling, and you cannot make someone want it.' }],
  shifts: [{ itemId: keptId, from: null, to: 'influence', because: 'A conversation can change how the question is heard, even though the answer is theirs.' }],
  revisions: [{ itemId: otherId, body: 'Who I choose to show it to', because: 'The choice is the person, not their reaction.' }],
  northStar: { wording: 'Find the people for whom this app is worth paying for', because: 'This keeps the wish to find a market, and makes the direction more specific.' },
}), context)

assert.equal(proposed.phrases.length, 1)
assert.equal(proposed.phrases[0]?.body, 'How I describe the value')
assert.equal(proposed.shifts[0]?.from, 'concern')
assert.equal(proposed.shifts[0]?.to, 'influence')
assert.equal(proposed.revisions[0]?.body, 'Who I choose to show it to')
assert.equal(proposed.northStar?.wording, 'Find the people for whom this app is worth paying for')

const untouched = groundReading(reading(), context)
assert.equal(untouched.say, reading().say)
assert.equal(untouched.phrases.length, 0)
assert.equal(untouched.shifts.length, 0)
assert.equal(untouched.revisions.length, 0)
assert.equal(untouched.northStar, null)

const several = groundReading(reading({
  phrases: [
    { circle: 'concern', body: 'Whether a stranger wants it', because: 'Their decision is theirs.' },
    { circle: 'control', body: 'The next person I ask', because: 'You can choose who to ask.' },
  ],
  shifts: [
    { itemId: keptId, from: null, to: 'influence', because: 'You can change the conversation.' },
    { itemId: '77777777-7777-4777-8777-777777777777', from: null, to: 'control', because: 'This phrase is not on the ground.' },
  ],
}), context)
assert.equal(several.phrases.length, 2)
assert.equal(several.shifts.length, 1)
assert.equal(several.shifts[0]?.itemId, keptId)

const sameStar = groundReading(reading({
  northStar: { wording: context.northStar, because: 'Only a restyle.' },
}), context)
assert.equal(sameStar.northStar, null)

const duplicate = groundReading(reading({
  phrases: [{ circle: 'control', body: 'Who I show it to next', because: 'Already kept.' }],
  revisions: [{ itemId: otherId, body: 'Who I show it to next', because: 'Same words.' }],
  shifts: [{ itemId: otherId, from: 'control', to: 'control', because: 'Already there.' }],
}), context)
assert.equal(duplicate.phrases.length, 0)
assert.equal(duplicate.revisions.length, 0)
assert.equal(duplicate.shifts.length, 0)

const tooLong = groundReading(reading({
  phrases: [{ circle: 'concern', body: 'x'.repeat(241), because: 'Too long to keep.' }],
}), context)
assert.equal(tooLong.phrases.length, 0)
assert.equal(tooLong.say.startsWith('It sounds as though'), true)

let count = 0
const created = proposalsFromReading(proposed, () => `p${count += 1}`)
assert.equal(created.filter((item) => item.kind === 'phrase').length, 1)
assert.equal(created.filter((item) => item.kind === 'shift').length, 1)
assert.equal(created.filter((item) => item.kind === 'revision').length, 1)
assert.equal(created.filter((item) => item.kind === 'north-star').length, 1)

const merged = mergeProposals(created, created, context.phrases, context.northStar)
assert.equal(merged.length, created.length)

const rejected = withoutProposal(created, created[0]?.id ?? '')
assert.equal(rejected.length, created.length - 1)
assert.equal(rejected.some((item) => item.id === created[0]?.id), false)

const clearing = readFileSync(new URL('../../components/studio/experience-clearing.tsx', import.meta.url), 'utf8')
const reject = clearing.slice(clearing.indexOf('function rejectSuggestion'), clearing.indexOf('function acceptSuggestedPhrase'))
assert.equal(reject.includes('onSettled(id)'), true)
assert.equal(reject.includes('addCircleItem'), false)
assert.equal(reject.includes('saveNorthStar'), false)
assert.equal(reject.includes('moveCircleItem'), false)
assert.equal(reject.includes('editCircleItem'), false)
const acceptPhrase = clearing.slice(clearing.indexOf('function acceptSuggestedPhrase'), clearing.indexOf('function acceptSuggestedStar'))
assert.equal(acceptPhrase.includes('addCircleItem'), true)
assert.equal(acceptPhrase.includes('onSettled(proposal.id)'), true)
assert.equal(acceptPhrase.includes('deleteCircleItem'), false)
const acceptStar = clearing.slice(clearing.indexOf('function acceptSuggestedStar'), clearing.indexOf('function acceptSuggestedShift'))
assert.equal(acceptStar.includes('saveNorthStar'), true)
const acceptShift = clearing.slice(clearing.indexOf('function acceptSuggestedShift'), clearing.indexOf('function acceptSuggestedRevision'))
assert.equal(acceptShift.includes('moveCircleItem'), true)
const acceptRevision = clearing.slice(clearing.indexOf('function acceptSuggestedRevision'), clearing.indexOf('function acceptSuggestedExperiment'))
assert.equal(acceptRevision.includes('editCircleItem'), true)
const acceptExperiment = clearing.slice(clearing.indexOf('function acceptSuggestedExperiment'), clearing.indexOf('actionsRef.current'))
assert.equal(acceptExperiment.includes('holdExperiment'), true)
assert.equal(acceptExperiment.includes('onHold(held)'), true)
assert.equal(acceptExperiment.includes('onSettled(proposal.id)'), true)
assert.equal(acceptExperiment.includes('addCircleItem'), false)
assert.equal(acceptExperiment.includes('saveNorthStar'), false)
assert.equal(acceptExperiment.includes('moveCircleItem'), false)
assert.equal(acceptExperiment.includes('editCircleItem'), false)

const invitation = 'Notice one moment in an everyday interaction when you feel curious about the other person. Ask a follow-up question and listen for what you learn.'
const questionId = '88888888-8888-4888-8888-888888888888'
const validExperiment = groundReading(reading({
  experiment: {
    invitation,
    why: 'You want small chances to practise inside a day that is already full.',
    mightReveal: 'Whether curiosity makes the exchange feel more mutual, without deciding how the other person responds.',
    sourceLabel: 'What they said about incremental social skill',
    sourceQuestionId: questionId,
    sourceConceptId: '99999999-9999-4999-8999-999999999999',
  },
}), {
  ...context,
  questions: [{ id: questionId, originalText: 'How do everyday conversations change?', consideredText: null }],
  concepts: [],
})
assert.equal(validExperiment.experiment?.invitation, invitation)
assert.equal(validExperiment.experiment?.sourceQuestionId, questionId)
assert.equal(validExperiment.experiment?.sourceConceptId, null)
assert.equal(validExperiment.phrases.length, 0)

const noExperiment = groundReading(reading(), context)
assert.equal(noExperiment.experiment, null)
assert.equal(noExperiment.say.startsWith('It sounds as though'), true)

const oversized = readingFromUnknown({
  say: 'The reply still stands.',
  interpretation: '',
  forces: [],
  interaction: '',
  followUp: '',
  experiment: {
    invitation: 'x'.repeat(281),
    why: 'Because the day is full.',
    mightReveal: 'What you notice.',
    sourceLabel: 'Their words',
    sourceQuestionId: '',
    sourceConceptId: '',
  },
})
assert.equal(oversized?.say, 'The reply still stands.')
assert.equal(oversized?.experiment, null)

const unknownSource = groundReading(reading({
  experiment: {
    invitation,
    why: 'It uses a moment you already have.',
    mightReveal: 'What a follow-up question changes.',
    sourceLabel: '',
    sourceQuestionId: '99999999-9999-4999-8999-999999999999',
    sourceConceptId: '',
  },
}), context)
assert.equal(unknownSource.experiment?.sourceQuestionId, null)
assert.equal(unknownSource.experiment?.sourceConceptId, null)
assert.equal(unknownSource.experiment?.sourceLabel, 'This app')
assert.equal(unknownSource.experiment?.invitation, invitation)

const proposal: ExperimentProposal = {
  id: 'visit-1',
  kind: 'experiment',
  invitation,
  why: 'It uses a moment you already have.',
  mightReveal: 'What a follow-up question changes.',
  sourceLabel: 'What they said about incremental social skill',
}
const edited = holdExperiment(proposal, 'Listen for one answer before adding your own.', proposal.why, proposal.mightReveal)
assert.equal(edited?.invitation, 'Listen for one answer before adding your own.')
assert.equal(edited?.sourceLabel, proposal.sourceLabel)
assert.equal(holdExperiment(proposal, '   ', proposal.why, proposal.mightReveal), null)
const removed = withoutProposal([proposal], proposal.id)
assert.equal(removed.length, 0)

const first = proposal
const repeat = { ...proposal, id: 'visit-2' }
const another = { ...proposal, id: 'visit-3', invitation: 'Share one small detail you would not usually mention, then notice what happens next.' }
const opened = mergeProposals([], [first], [], null)
const duplicated = mergeProposals(opened, [repeat], [], null)
assert.equal(duplicated.length, 1)
assert.equal(duplicated[0]?.id, 'visit-1')
const replaced = mergeProposals(opened, [another], [], null)
assert.equal(replaced.length, 1)
if (replaced[0]?.kind === 'experiment') assert.equal(replaced[0].invitation, another.invitation)
const afterAccept = mergeProposals([], [first], [], null, [invitation])
assert.equal(afterAccept.length, 0)

assert.equal(clearing.includes('Possibilities to explore'), true)
assert.equal(clearing.includes('checkbox'), false)

const conversation = readFileSync(new URL('../../components/studio/experience-conversation.tsx', import.meta.url), 'utf8')
assert.equal(conversation.indexOf('if (!response.ok || !reading)') < conversation.indexOf('onReading(reading)'), true)
const failure = conversation.slice(conversation.lastIndexOf('} catch {'), conversation.indexOf('} finally {'))
assert.equal(failure.includes('onReading'), false)
assert.equal(conversation.includes('addCircleItem'), false)
assert.equal(conversation.includes('saveNorthStar'), false)

const workspace = readFileSync(new URL('../../components/studio/experience-workspace.tsx', import.meta.url), 'utf8')
assert.equal(workspace.includes('useState<LandscapeProposal[]>'), true)
assert.equal(workspace.includes('useState<HeldExperiment[]>'), true)
assert.equal(workspace.includes('localStorage'), false)
assert.equal(workspace.includes('addCircleItem'), false)
assert.equal(workspace.includes('saveNorthStar'), false)

const screen = readFileSync(new URL('../../components/studio/experience-screen.tsx', import.meta.url), 'utf8')
assert.equal(screen.includes('key={experienceId}'), true)

console.log('experience proposal checks passed')
