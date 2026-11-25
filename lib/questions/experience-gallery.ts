import { circles, type CircleName } from './experience-content.ts'
import type { ConceptRecord } from './types.ts'

export type ExperienceGallery = Record<CircleName, ConceptRecord[]>

export function emptyExperienceGallery(): ExperienceGallery {
  return { concern: [], influence: [], control: [] }
}

// Groups saved concepts by the circle stored when Visualise opened.
// Live topic edits, moves, and deletions are not an input.
export function experienceGallery(concepts: readonly ConceptRecord[], experienceId: string): ExperienceGallery {
  const grouped = emptyExperienceGallery()
  const seen = new Set<string>()
  const matches = concepts.filter((concept) => {
    const source = concept.experienceSource
    if (!source || source.experienceId !== experienceId) return false
    if (!source.originalText.trim()) return false
    if (seen.has(concept.id)) return false
    seen.add(concept.id)
    return true
  })
  matches.sort((left, right) => {
    const byTime = right.createdAt.localeCompare(left.createdAt)
    return byTime === 0 ? left.id.localeCompare(right.id) : byTime
  })
  for (const concept of matches) {
    const circle = concept.experienceSource?.circle
    if (!circle) continue
    grouped[circle].push(concept)
  }
  return grouped
}

export function galleryHasVisualisations(gallery: ExperienceGallery) {
  return circles.some((circle) => gallery[circle.id].length > 0)
}
