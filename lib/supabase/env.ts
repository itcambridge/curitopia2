import { productionExperienceProjectRef, supabaseExperienceProjectRef } from '../questions/experience.ts'

const supabaseUrlName = 'NEXT_PUBLIC_SUPABASE_URL'
const publishableKeyName = 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
const developmentUrlName = 'NEXT_PUBLIC_SUPABASE_DEV_URL'
const developmentKeyName = 'NEXT_PUBLIC_SUPABASE_DEV_PUBLISHABLE_KEY'

export type PublicSupabaseEnv = {
  url: string
  publishableKey: string
}

export type PublicSupabaseSelection = {
  nodeEnv: string | undefined
  productionUrl: string | undefined
  productionKey: string | undefined
  developmentUrl: string | undefined
  developmentKey: string | undefined
}

function supabaseProjectUrl(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    const path = url.pathname.replace(/\/$/, '')
    if (path === '' || path === '/rest/v1') return url.origin
    return `${url.origin}${path}`
  } catch {
    return null
  }
}

function jwtRole(token: string): string | null {
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const parsed = JSON.parse(atob(padded)) as { role?: unknown }
    return typeof parsed.role === 'string' ? parsed.role : null
  } catch {
    return null
  }
}

function publicPublishableKey(value: string | undefined): string | null {
  const key = value?.trim()
  if (!key) return null
  if (key.startsWith('sb_secret_')) return null
  if (key.startsWith('eyJ') && jwtRole(key) === 'service_role') return null
  return key
}

export function selectPublicSupabaseEnv(input: PublicSupabaseSelection): PublicSupabaseEnv | null {
  const development = input.nodeEnv === 'development'
  const rawUrl = (development ? input.developmentUrl : input.productionUrl)?.trim()
  const publishableKey = publicPublishableKey(development ? input.developmentKey : input.productionKey)
  if (development && rawUrl) {
    try {
      const parsed = new URL(rawUrl)
      if (parsed.protocol !== 'https:' || parsed.username !== '' || parsed.password !== '') return null
    } catch {
      return null
    }
  }
  const url = rawUrl ? supabaseProjectUrl(rawUrl) : null
  if (!url || !publishableKey) return null
  if (!development) return { url, publishableKey }
  const ref = supabaseExperienceProjectRef(url)
  if (!ref || ref === productionExperienceProjectRef) return null
  return { url, publishableKey }
}

export function readPublicSupabaseEnv(): PublicSupabaseEnv | null {
  // Static property access so the client bundle can inline the public values.
  // next dev uses the development project. A production build uses the
  // deployment variables and does not fall back the other way.
  return selectPublicSupabaseEnv({
    nodeEnv: process.env.NODE_ENV,
    productionUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    productionKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    developmentUrl: process.env.NEXT_PUBLIC_SUPABASE_DEV_URL,
    developmentKey: process.env.NEXT_PUBLIC_SUPABASE_DEV_PUBLISHABLE_KEY,
  })
}

export function missingSupabaseEnvMessageFor(nodeEnv: string | undefined) {
  if (nodeEnv === 'development') {
    return `This copy cannot reach the development project yet. Add ${developmentUrlName} and ${developmentKeyName} to .env.local, then restart the dev server.`
  }
  return `This copy cannot reach accounts yet. Add ${supabaseUrlName} and ${publishableKeyName} to .env.local, then restart the dev server.`
}

export function requirePublicSupabaseEnv(): PublicSupabaseEnv {
  const env = readPublicSupabaseEnv()
  if (env) return env
  throw new Error(missingSupabaseEnvMessageFor(process.env.NODE_ENV))
}

export const missingSupabaseEnvMessage = missingSupabaseEnvMessageFor(process.env.NODE_ENV)
