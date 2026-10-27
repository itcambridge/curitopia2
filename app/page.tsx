import { redirect } from 'next/navigation'
import { MissingSupabaseEnv } from '@/components/auth/missing-env'
import { CuritopiaApp } from '@/components/studio/curitopia-app'
import { readPublicSupabaseEnv } from '@/lib/supabase/env'
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  if (!readPublicSupabaseEnv()) return <MissingSupabaseEnv />
  const supabase = await createClient()
  let signedIn = false
  try {
    const { data, error } = await supabase.auth.getClaims()
    signedIn = !error && Boolean(data?.claims)
  } catch {
    return (
      <main className="min-h-screen bg-studio-cream px-6 py-16 text-studio-ink">
        <p className="mx-auto max-w-lg text-sm">The account session could not be checked. Refresh the page and try again.</p>
      </main>
    )
  }
  if (!signedIn) redirect('/sign-in')
  return <CuritopiaApp />
}
