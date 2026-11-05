import { redirect } from 'next/navigation'
import { MissingSupabaseEnv } from '@/components/auth/missing-env'
import { CuriosityLanding } from '@/components/studio/curiosity-landing'
import { AccountLibrary } from '@/components/studio/account-library'
import { CuritopiaApp } from '@/components/studio/curitopia-app'
import { studioPath } from '@/lib/paths'
import { readPublicSupabaseEnv } from '@/lib/supabase/env'
import { createClient } from '@/lib/supabase/server'

export async function CuritopiaEntry({
  searchParams,
}: {
  searchParams: Promise<{ curiosity?: string; library?: string; concept?: string; garden?: string }>
}) {
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
  if (!signedIn) redirect(studioPath('/sign-in'))
  const { curiosity, library, concept, garden } = await searchParams
  if (!curiosity && library === 'all') return <AccountLibrary />
  if (!curiosity) return <CuriosityLanding />
  return <CuritopiaApp key={curiosity} curiosityId={curiosity} reviseConceptId={concept ?? null} openGarden={garden === '1'} />
}
