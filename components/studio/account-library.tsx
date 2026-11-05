'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Home } from 'lucide-react'
import { BrandBanner } from '@/components/site-banner'
import { LibraryView } from '@/components/studio/library-view'
import { studioPath } from '@/lib/paths'
import { initialLibraryFocus } from '@/lib/questions/library-focus'
import { emptyWorkspace } from '@/lib/questions/workspace'
import { createClient } from '@/lib/supabase/client'

export function AccountLibrary() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(studioPath('/sign-in'))
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-studio-cream text-studio-ink">
      <BrandBanner email={email} onSignOut={() => { void signOut() }} />
      <div className="mx-auto min-w-0 max-w-[1600px] px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
        <Link href={studioPath('/')} className="mb-6 inline-flex items-center gap-2 rounded-2xl px-2.5 py-2 text-sm font-semibold text-studio-ink hover:bg-studio-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral">
          <Home size={16} aria-hidden="true" />
          Home
        </Link>
        <LibraryView
          workspace={emptyWorkspace()}
          onChange={() => {}}
          openCuriosityId={null}
          initialFocus={initialLibraryFocus('home', null)}
          returnHref={studioPath('/')}
        />
      </div>
    </main>
  )
}
