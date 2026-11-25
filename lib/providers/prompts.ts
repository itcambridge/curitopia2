import type { MetaphorId } from '@/lib/providers/types'

export const metaphorDirections: { id: MetaphorId; label: string; instruction: string }[] = [
  {
    id: 'tension',
    label: 'Tension',
    instruction: 'Begin from two concrete forces in the same frame. Neither wins.',
  },
  {
    id: 'trace',
    label: 'Trace',
    instruction: 'Show the residue or after-effect rather than the event itself.',
  },
  {
    id: 'scale',
    label: 'Scale',
    instruction: 'Use an ordinary object at an unexpected scale.',
  },
  {
    id: 'relation',
    label: 'Relation',
    instruction: 'Show a precise relationship between two things.',
  },
]

export function isMetaphorId(value: unknown): value is MetaphorId {
  return typeof value === 'string' && metaphorDirections.some((direction) => direction.id === value)
}

const q09 = 'How can someone be present among others and still be unreached?'

export function imagePrompt(question: string, direction: string, instruction: string, sourceNoun: 'question' | 'topic' = 'question') {
  const asked = question.trim()
  const brief = direction.trim()
  const name = sourceNoun === 'topic' ? 'topic' : 'question'
  const label = sourceNoun === 'topic' ? 'Topic' : 'Question'
  const extra = asked === q09
    ? 'A silhouette on a cliff, one red figure among grey clones, a leftover puzzle piece, and an empty bench.'
    : `A literal illustration of the nouns in the ${name}.`
  return [
    `Create one image that interprets the ${name} below. Do not illustrate its nouns as a literal scene.`,
    'The creative direction names the idea, feeling, tension, or relationship to explore. It is not a scene, subject, setting, or metaphor to copy.',
    `Invent this image on its own. Choose a focal subject, physical metaphor, environment, and spatial relationship that fit this metaphor starting point and the ${name}.`,
    `Where the ${name} allows it, choose a different focal subject, metaphor, and environment from a literal reading of its nouns. Conceptual relevance comes before variety.`,
    'Use one strong focal idea. Keep the image visually coherent and emotionally specific.',
    'Do not render letters, words, numbers, captions, logos, or watermarks.',
    'Do not use an infographic, clip-art icons, corporate presentation art, or a stock-photo pose.',
    'Avoid lightbulbs, generic silhouettes on a horizon, a person paired with a question mark, floating puzzle pieces, an hourglass as a symbol of time, and flat icon scenes.',
    `The image is not an answer and not evidence. Leave the ${name} unresolved.`,
    '',
    `${label}: "${asked}"`,
    '',
    `Creative direction: "${brief}"`,
    '',
    `Metaphor starting point: ${instruction}`,
    'Treat this as a way of thinking, not a template.',
    '',
    `Also avoid: ${extra}`,
  ].join('\n')
}
