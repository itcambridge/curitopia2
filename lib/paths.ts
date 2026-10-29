import { withBasePath as prefixPath } from './base-path.mjs'

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

// The proxy sees the path with the base path already removed.
export function sessionRedirectPath(pathname: string, signedIn: boolean): string | null {
  const authPage = pathname === '/sign-in' || pathname === '/sign-up'
  const api = pathname.startsWith('/api')
  if (!signedIn && !authPage && !api) return '/sign-in'
  if (signedIn && authPage) return '/'
  return null
}
