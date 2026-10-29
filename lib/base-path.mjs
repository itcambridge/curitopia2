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

export function stripBasePath(pathname, configured) {
  const path = typeof pathname === 'string' && pathname.startsWith('/') ? pathname : '/'
  const base = readBasePath(configured)
  if (!base) return path
  if (path === base) return '/'
  if (path.startsWith(`${base}/`)) return path.slice(base.length) || '/'
  return path
}

// A production build records basePath in routes-manifest.json. `next start` loads
// next.config again, so an empty runtime variable must not discard that value.
// During `next build` the manifest is stale and the variable is the source of truth.
export function resolveConfiguredBasePath({ envValue, phase, nodeEnv, manifestBasePath, command }) {
  const fromEnv = readBasePath(envValue)
  if (fromEnv) return fromEnv
  const runningBuild = phase === 'phase-production-build' || command === 'build'
  if (runningBuild || nodeEnv !== 'production' || command === 'dev') return ''
  return readBasePath(manifestBasePath)
}
