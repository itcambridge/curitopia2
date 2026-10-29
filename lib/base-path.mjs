// Shared by next.config.mjs and the app. An empty value means the site root,
// which is what local development uses. A production build sets /42.

export function readBasePath(value) {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (!trimmed) return ''
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.endsWith('/') || /[?#\s]/.test(trimmed)) {
    throw new Error('NEXT_PUBLIC_BASE_PATH must be a path such as /42, or be unset.')
  }
  return trimmed
}

export function withBasePath(path, configured) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return path
  const base = readBasePath(configured)
  if (!base || path === base || path.startsWith(`${base}/`)) return path
  return `${base}${path}`
}
