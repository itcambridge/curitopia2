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

// Returns the path to assign on the request URL, or null when the request may continue.
// Next sometimes removes the base path before the proxy and sometimes leaves it in
// the pathname. The result includes /42 only when the URL object will not add it again.
export function externalRedirectPath(pathname: string, signedIn: boolean, configuredBase: string, nextUrlBasePath: string): string | null {
  const urlBase = nextUrlBasePath && nextUrlBasePath !== '/' ? readBasePath(nextUrlBasePath) : ''
  const base = urlBase || readBasePath(configuredBase)
  const appPath = stripBasePath(pathname, base)
  const destination = sessionRedirectPath(appPath, signedIn)
  if (!destination) return null
  if (urlBase || !base) return destination
  if (destination === '/') return base
  return `${base}${destination}`
}

export function sessionRedirectPath(pathname: string, signedIn: boolean): string | null {
  const authPage = pathname === '/sign-in' || pathname === '/sign-up'
  const api = pathname.startsWith('/api')
  if (!signedIn && !authPage && !api) return '/sign-in'
  if (signedIn && authPage) return '/'
  return null
}
