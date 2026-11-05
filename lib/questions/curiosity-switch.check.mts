import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { curiosityDraftKey } from './curiosity.ts'
import { createCuriosityChoice, curiosityGardenPath, curiositySwitchChoices, stageAfterCuriosityOpen } from './curiosity-switch.ts'

const antiEgo = '11111111-1111-4111-8111-111111111111'
const nature = '22222222-2222-4222-8222-222222222222'
const names = [
  { id: antiEgo, name: 'Anti-Ego' },
  { id: nature, name: 'Nature' },
]

assert.equal(curiosityGardenPath(antiEgo), `/?curiosity=${antiEgo}&garden=1`)
assert.equal(curiosityGardenPath('a b'), '/?curiosity=a%20b&garden=1')
assert.equal(curiosityGardenPath(antiEgo).includes('concept='), false)

assert.deepEqual(curiositySwitchChoices(names, antiEgo, 'Anti-Ego').map((item) => item.name), ['Anti-Ego', 'Nature'])
assert.deepEqual(curiositySwitchChoices([], nature, 'Nature'), [{ id: nature, name: 'Nature' }])
assert.equal(curiositySwitchChoices(names, antiEgo, 'Anti-Ego').some((item) => item.id === createCuriosityChoice), false)
assert.notEqual(curiosityDraftKey(antiEgo), curiosityDraftKey(nature))

assert.equal(stageAfterCuriosityOpen('visualise', true, false), 'gather')
assert.equal(stageAfterCuriosityOpen('library', true, false), 'gather')
assert.equal(stageAfterCuriosityOpen('distil', false, false), 'distil')
assert.equal(stageAfterCuriosityOpen('visualise', true, true), 'distil')
assert.equal(stageAfterCuriosityOpen('curate', false, true), 'distil')

const shell = readFileSync(new URL('../../components/studio/studio-shell.tsx', import.meta.url), 'utf8')
const switcher = readFileSync(new URL('../../components/studio/curiosity-switcher.tsx', import.meta.url), 'utf8')
const library = readFileSync(new URL('../../components/studio/library-view.tsx', import.meta.url), 'utf8')
const hook = readFileSync(new URL('../../components/studio/use-account-workspace.ts', import.meta.url), 'utf8')
const app = readFileSync(new URL('../../components/studio/curitopia-app.tsx', import.meta.url), 'utf8')
assert.equal(shell.includes('Current curiosity'), false)
assert.equal(shell.includes('CuriositySwitcher'), true)
assert.equal(shell.includes("studioPath('/')"), true)
assert.equal(switcher.includes('Current curiosity'), true)
assert.equal(switcher.includes('Create curiosity'), true)
assert.equal(switcher.includes('curiosityGardenPath'), true)
assert.equal(switcher.includes('listAccountConcepts'), false)
assert.equal(switcher.includes('workspace.concepts'), false)
const chooseAt = switcher.indexOf('function choose')
const choose = switcher.slice(chooseAt, switcher.indexOf('return (', chooseAt))
assert.equal(choose.indexOf('confirmLeave') < choose.indexOf('onBeforeLeave'), true)
assert.equal(choose.indexOf('onBeforeLeave') < choose.indexOf('router.push'), true)
assert.equal(library.includes('function selectFocus'), true)
assert.equal(library.includes('curiosityGardenPath'), false)
assert.equal(library.includes('Current curiosity'), false)
assert.equal(hook.includes('listAccountConcepts'), false)
assert.equal(hook.includes('holdDrafts'), true)
assert.equal(hook.includes('stageAfterCuriosityOpen'), true)
assert.equal(app.includes('initialLibraryFocus'), true)
assert.equal(app.includes('openGarden'), true)

console.log('curiosity switch checks passed')
