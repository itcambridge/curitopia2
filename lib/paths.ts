import { readBasePath, stripBasePath, withBasePath as prefixPath } from './base-path.mjs'

// Static access so Next can inline this public value into the client bundle.
function configuredBasePath() {
  return process.env.NEXT_PUBLIC_BASE_PATH
}

// App paths only. Absolute URLs, protocol-relative URLs, and data URLs are returned unchanged.
// next/link, router.push, and redirect() add the base path themselves, so do not wrap those.
export function withBasePath(path: string): string {
  return prefixPath(path, configuredBasePath())
}

export function authReturnUrl(origin: string): string {
  const root = origin.replace(/\/$/, '')
  return `${root}${withBasePath('/sign-in')}`
}

// Curitopia's own routes stay unprefixed. Next adds /42 when the deployment
// base path is set. Without that base path, the same routes are published at /42
// so the site root can be the consultancy page.
export function studioPath(path: string): string {
  const base = configuredBasePath()
  if (typeof base === 'string' && base.trim()) return path
  const hashAt = path.indexOf('#')
  const hash = hashAt >= 0 ? path.slice(hashAt) : ''
  const beforeHash = hashAt >= 0 ? path.slice(0, hashAt) : path
  const queryAt = beforeHash.indexOf('?')
  const query = queryAt >= 0 ? beforeHash.slice(queryAt) : ''
  const pathname = queryAt >= 0 ? beforeHash.slice(0, queryAt) : beforeHash
  if (pathname === '/42' || pathname.startsWith('/42/')) return path
  const prefixed = pathname === '/' ? '/42' : `/42${pathname.startsWith('/') ? pathname : `/${pathname}`}`
  return `${prefixed}${query}${hash}`
}

// Returns the path to assign on the request URL, or null when the request may continue.
// Next sometimes removes the base path before the proxy and sometimes leaves it in
// the pathname. The result includes /42 only when the URL object will not add it again.
function studioAliasPath(pathname: string): string | null {
  if (pathname === '/42') return '/'
  if (pathname.startsWith('/42/')) return pathname.slice(3) || '/'
  return null
}

function prefixStudioDestination(destination: string): string {
  if (destination === '/') return '/42'
  return `/42${destination}`
}

export function externalRedirectPath(pathname: string, signedIn: boolean, configuredBase: string, nextUrlBasePath: string): string | null {
  const urlBase = nextUrlBasePath && nextUrlBasePath !== '/' ? readBasePath(nextUrlBasePath) : ''
  const base = urlBase || readBasePath(configuredBase)
  // The consultancy page owns "/" only when this process is not mounted at /42.
  // In that mode, /42 is the Curitopia alias and must keep the studio's auth rules.
  if (!base) {
    if (pathname === '/') return null
    const alias = studioAliasPath(pathname)
    if (alias) {
      const aliasDestination = sessionRedirectPath(alias, signedIn)
      if (!aliasDestination) return null
      return prefixStudioDestination(aliasDestination)
    }
  }
  const appPath = stripBasePath(pathname, base)
  const destination = sessionRedirectPath(appPath, signedIn)
  if (!destination) return null
  if (urlBase) return destination
  if (!base) return prefixStudioDestination(destination)
  if (destination === '/') return base
  return `${base}${destination}`
}

export function sessionRedirectPath(pathname: string, signedIn: boolean): string | null {
  const authPage = pathname === '/sign-in' || pathname === '/sign-up'
  const publicPage = authPage || pathname === '/site'
  const api = pathname.startsWith('/api')
  if (!signedIn && !publicPage && !api) return '/sign-in'
  if (signedIn && authPage) return '/'
  return null
}
