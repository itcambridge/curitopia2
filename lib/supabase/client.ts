import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/database.types'
import { requirePublicSupabaseEnv } from '@/lib/supabase/env'

export function createClient() {
  const { url, publishableKey } = requirePublicSupabaseEnv()
  return createBrowserClient<Database>(url, publishableKey)
}
