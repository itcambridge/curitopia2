// Pure assembly of the concepts a person developed for one curiosity.
// Provenance text is shared. Each concept keeps its own references.
// This module does not read the database or the live questions table.

export type ExplorationConcept = {
  id: string
  title: string
  forConsideredText: string
  createdAt: string
}

export type ExplorationLink = {
  conceptId: string
  questionId: string | null
  originalText: string
  consideredText: string | null
}

export type ProvenanceEntry = {
  id: string
  questionId: string | null
  originalText: string
  consideredText: string | null
  conceptIds: string[]
}

export type CuratedConcept = {
  id: string
  title: string
  forConsideredText: string
  createdAt: string
  provenanceIds: string[]
  originRecovered: boolean
}

export type CuratedExploration = {
  concepts: CuratedConcept[]
  provenance: ProvenanceEntry[]
}

function clean(value: string) {
  return value.trim()
}

function questionIdentity(questionId: string | null) {
  const id = questionId?.trim().toLowerCase() ?? ''
  return id ? id : null
}

function consideredIdentity(value: string | null) {
  if (value === null) return null
  const text = value.trim()
  return text ? text : null
}

function provenanceIdentity(link: ExplorationLink, originalText: string) {
  const questionId = questionIdentity(link.questionId)
  const consideredText = consideredIdentity(link.consideredText)
  return {
    questionId,
    originalText,
    consideredText,
    key: `${questionId ? 'live' : 'detached'}\u001f${questionId ?? ''}\u001f${originalText}\u001f${consideredText ?? ''}`,
  }
}

export function assembleCuratedExploration(
  concepts: readonly ExplorationConcept[],
  links: readonly ExplorationLink[],
): CuratedExploration {
  const known = new Set<string>()
  const curated: CuratedConcept[] = []
  for (const concept of concepts) {
    const id = concept.id.trim().toLowerCase()
    if (!id || known.has(id)) continue
    known.add(id)
    curated.push({
      id,
      title: clean(concept.title),
      forConsideredText: clean(concept.forConsideredText),
      createdAt: concept.createdAt,
      provenanceIds: [],
      originRecovered: false,
    })
  }

  const byConcept = new Map<string, ExplorationLink[]>()
  for (const link of links) {
    const conceptId = link.conceptId.trim().toLowerCase()
    if (!known.has(conceptId)) continue
    const list = byConcept.get(conceptId) ?? []
    list.push(link)
    byConcept.set(conceptId, list)
  }

  const entries = new Map<string, ProvenanceEntry>()
  const provenance: ProvenanceEntry[] = []
  for (const concept of curated) {
    for (const link of byConcept.get(concept.id) ?? []) {
      const originalText = clean(link.originalText)
      if (!originalText) continue
      const identity = provenanceIdentity(link, originalText)
      let entry = entries.get(identity.key)
      if (!entry) {
        entry = {
          id: identity.key,
          questionId: identity.questionId,
          originalText: identity.originalText,
          consideredText: identity.consideredText,
          conceptIds: [],
        }
        entries.set(identity.key, entry)
        provenance.push(entry)
      }
      if (!entry.conceptIds.includes(concept.id)) entry.conceptIds.push(concept.id)
      if (!concept.provenanceIds.includes(entry.id)) concept.provenanceIds.push(entry.id)
    }
    concept.originRecovered = concept.provenanceIds.length > 0
  }

  return { concepts: curated, provenance }
}
