const supabaseUrlName = 'NEXT_PUBLIC_SUPABASE_URL'
const publishableKeyName = 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'

export type PublicSupabaseEnv = {
  url: string
  publishableKey: string
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

export function readPublicSupabaseEnv(): PublicSupabaseEnv | null {
  // Static property access so the production client bundle can inline these public values.
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  const url = rawUrl ? supabaseProjectUrl(rawUrl) : null
  if (!url || !publishableKey) return null
  return { url, publishableKey }
}

export function requirePublicSupabaseEnv(): PublicSupabaseEnv {
  const env = readPublicSupabaseEnv()
  if (env) return env
  throw new Error(`Add ${supabaseUrlName} and ${publishableKeyName} to .env.local, then restart the dev server.`)
}

export const missingSupabaseEnvMessage = `This copy cannot reach accounts yet. Add ${supabaseUrlName} and ${publishableKeyName} to .env.local, then restart the dev server.`
