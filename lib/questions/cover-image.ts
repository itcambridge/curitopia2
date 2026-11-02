export const coverImageBucket = 'concept-images'
export const coverImageMaxBytes = 5 * 1024 * 1024

const extensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const

export type CoverImageType = keyof typeof extensions

export function coverImageProblem(file: { type: string; size: number }) {
  if (!(file.type in extensions)) return 'Use a JPEG, PNG, or WebP image.'
  if (!Number.isFinite(file.size) || file.size <= 0) return 'That file is empty.'
  if (file.size > coverImageMaxBytes) return 'Keep the image within 5 MB.'
  return null
}

export function coverImageExtension(type: string) {
  if (!(type in extensions)) return null
  return extensions[type as CoverImageType]
}

export function coverObjectPath(userId: string, curiosityId: string, extension: string, objectId = crypto.randomUUID()) {
  return `${userId}/covers/${curiosityId}/${objectId}.${extension}`
}

// A dedicated cover lives only under this curiosity's cover folder.
// A concept image path is a valid future cover reference and must not be deleted from here.
export function isDedicatedCoverPath(path: string, userId: string, curiosityId: string) {
  const prefix = `${userId}/covers/${curiosityId}/`
  if (!path.startsWith(prefix)) return false
  const name = path.slice(prefix.length)
  return /^[^/]+\.(jpg|png|webp)$/.test(name)
}
