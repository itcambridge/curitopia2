import type { MetaphorId } from '@/lib/providers/types'

export const metaphorDirections: { id: MetaphorId; label: string; instruction: string }[] = [
  {
    id: 'tension',
    label: 'Tension',
    instruction: 'Show the unresolved tension as two concrete forces in the same frame. Neither one wins.',
  },
  {
    id: 'trace',
    label: 'Trace',
    instruction: 'Show the residue or after-effect of the question, not the event itself and not a symbol standing for the topic.',
  },
  {
    id: 'scale',
    label: 'Scale',
    instruction: 'Show one ordinary object at the wrong scale, so the question becomes physical. One object, not a collage.',
  },
  {
    id: 'relation',
    label: 'Relation',
    instruction: 'Show a precise relationship between two things. If a person is necessary, show a particular gesture, not a generic silhouette.',
  },
]

const q09 = 'How can someone be present among others and still be unreached?'

export function imagePrompt(considered: string, instruction: string) {
  const extra = considered.trim() === q09
    ? 'A silhouette on a cliff, one red figure among grey clones, a leftover puzzle piece, and an empty bench.'
    : 'A literal illustration of the nouns in the question.'
  return [
    'Create one image that interprets the considered question below.',
    'Use a single dominant visual metaphor. Make it specific enough that the question can be felt without a caption.',
    'Do not illustrate the nouns in the question as a literal scene.',
    'Do not render letters, words, numbers, captions, logos, or watermarks.',
    'Do not use an infographic, clip-art icons, corporate presentation art, or a stock-photo pose.',
    'Avoid lightbulbs, generic silhouettes on a horizon, a person paired with a question mark, floating puzzle pieces, an hourglass as a symbol of time, and flat icon scenes.',
    'The image is not an answer and not evidence. Leave the question unresolved.',
    '',
    `Considered question: "${considered.trim()}"`,
    '',
    `Metaphor instruction: ${instruction}`,
    '',
    `Also avoid: ${extra}`,
  ].join('\n')
}

export function demoProposal(original: string, attempt: number) {
  const words = original.trim()
  if (attempt % 2 === 0) return `What is the question I am actually asking when I say “${words}”?`
  return `What tension is still unresolved in “${words}”?`
}
