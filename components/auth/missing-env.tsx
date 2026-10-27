import { missingSupabaseEnvMessage } from '@/lib/supabase/env'

export function MissingSupabaseEnv() {
  return (
    <main className="min-h-screen bg-studio-cream px-6 py-16 text-studio-ink">
      <section className="mx-auto max-w-lg rounded-[30px] border border-studio-line bg-studio-paper p-8 shadow-studio-card">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-studio-kicker">Field notes</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight">The garden needs its address.</h1>
        <p className="mt-4 text-sm leading-relaxed text-studio-body">{missingSupabaseEnvMessage}</p>
      </section>
    </main>
  )
}
