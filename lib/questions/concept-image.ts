const maxBytes = 8_388_608

const extensions = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
} as const

export type ConceptImageFile = {
  bytes: Uint8Array
  mime: keyof typeof extensions
  extension: (typeof extensions)[keyof typeof extensions]
}

export function readConceptImage(src: string): { file: ConceptImageFile } | { error: string } {
  const comma = src.indexOf(',')
  if (!src.startsWith('data:') || comma < 0) {
    return { error: 'The selected image is not a file this account can keep.' }
  }
  const mime = src.slice('data:'.length, comma).split(';')[0].toLowerCase()
  if (!(mime in extensions)) {
    return { error: 'Only a PNG, JPEG, or WebP image can be kept in the account. This drawing was not uploaded.' }
  }
  const body = src.slice(comma + 1).replace(/\s/g, '')
  let bytes: Uint8Array
  try {
    bytes = decodeBase64(body)
  } catch {
    return { error: 'The selected image could not be read, so it was not uploaded.' }
  }
  if (bytes.byteLength === 0 || bytes.byteLength > maxBytes) {
    return { error: 'The selected image must be under 8 MB. It was not uploaded.' }
  }
  const typed = mime as keyof typeof extensions
  return { file: { bytes, mime: typed, extension: extensions[typed] } }
}

function decodeBase64(value: string) {
  if (typeof atob === 'function') {
    const binary = atob(value)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
    return bytes
  }
  return Uint8Array.from(Buffer.from(value, 'base64'))
}
