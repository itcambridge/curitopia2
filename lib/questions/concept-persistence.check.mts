import assert from 'node:assert/strict'
import { linkChanges } from './concept-links.ts'
import { readConceptImage } from './concept-image.ts'

const png = `data:image/png;base64,${Buffer.from([137, 80, 78, 71]).toString('base64')}`
const read = readConceptImage(png)
assert.equal('file' in read, true)
if ('file' in read) {
  assert.equal(read.file.mime, 'image/png')
  assert.equal(read.file.extension, 'png')
  assert.equal(read.file.bytes.byteLength, 4)
}

const svg = readConceptImage('data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E')
assert.equal('error' in svg, true)

const huge = `data:image/webp;base64,${Buffer.alloc(8_388_609, 1).toString('base64')}`
const oversize = readConceptImage(huge)
assert.equal('error' in oversize, true)

const changes = linkChanges([
  { linkId: 'link-a', questionId: 'question-a', originalText: 'Keep', consideredText: null },
  { linkId: 'link-b', questionId: 'question-b', originalText: 'Remove', consideredText: 'Earlier' },
  { linkId: 'link-c', questionId: null, originalText: 'Detached snapshot', consideredText: null },
], ['question-a', 'question-c', 'question-c'])
assert.deepEqual(changes.remove, ['link-b'])
assert.deepEqual(changes.add, ['question-c'])

console.log('concept persistence checks passed')
