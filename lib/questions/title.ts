const maxTitleLength = 40

export function titleProblem(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return 'Add a one- or two-word title.'
  if (trimmed.length > maxTitleLength) return 'Keep the title within 40 characters.'
  const words = trimmed.split(/\s+/)
  if (words.length > 2) return 'Use one or two words.'
  return null
}

export function cleanTitle(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}
