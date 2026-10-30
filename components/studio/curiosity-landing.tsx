'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { Eyebrow, inkButton, panelClass, quietButton } from '@/components/studio/studio-ui'
import { withBasePath } from '@/lib/paths'
import { curiosityNameProblem } from '@/lib/questions/curiosity'
import { createCuriosity, listCuriosities, renameCuriosity, type CuriositySummary } from '@/lib/questions/supabase-curiosities'
import { createClient } from '@/lib/supabase/client'
import type { StageId } from '@/lib/questions/types'

const stageLabel: Record<StageId, string> = {
  gather: 'Gather',
  curate: 'Curate',
  visualise: 'Visualise',
  distil: 'Distil',
  library: 'Library',
}

const activityFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function CuriosityLanding() {
  const router = useRouter()
  const [items, setItems] = useState<CuriositySummary[]>([])
  const [email, setEmail] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    setEmail(data.user?.email ?? null)
    const next = await listCuriosities()
    setItems(next)
  }

  useEffect(() => {
    let cancelled = false
    load().catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : 'The curiosities could not be loaded.')
    }).finally(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function create(event: FormEvent) {
    event.preventDefault()
    const problem = curiosityNameProblem(name)
    if (problem) {
      setError(problem)
      return
    }
    setCreating(true)
    setError(null)
    try {
      const id = await createCuriosity(name)
      router.push(`/?curiosity=${id}`)
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The curiosity could not be created.')
      setCreating(false)
    }
  }

  async function rename(id: string) {
    const problem = curiosityNameProblem(renameValue)
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    try {
      await renameCuriosity(id, renameValue)
      setRenamingId(null)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The curiosity could not be renamed.')
    }
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-studio-cream text-studio-ink">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-studio-coral text-studio-ivory shadow-studio-stamp">
              <Sparkles size={20} />
            </div>
            <h1 className="font-serif text-[1.7rem] font-semibold leading-none tracking-tight">curitopia</h1>
          </div>
          <div className="text-right text-xs text-studio-body">
            <p className="truncate">{email ?? 'Signed in'}</p>
            <button type="button" onClick={() => { void signOut() }} className="mt-2 font-semibold text-studio-ink underline-offset-2 hover:underline">Sign out</button>
          </div>
        </header>
        <div className="mb-10 max-w-xl">
          <p className="font-serif text-4xl tracking-tight">Curi-toe·pia</p>
          <p className="mt-3 font-mono text-sm tracking-wide text-studio-body">[juːˈtəʊpɪə]</p>
          <p className="mt-4 italic text-studio-body">noun</p>
          <p className="mt-2 max-w-md text-base leading-relaxed text-studio-body">
            <span className="mr-3 font-serif text-lg">1.</span>
            an imagined place or state of things in which curiosity is practised.
          </p>
        </div>
        <h2 className="mb-8 font-serif text-4xl leading-tight">Which curiosity shall we tend?</h2>
        <form onSubmit={(event) => { void create(event) }} className={`${panelClass} mb-6 flex flex-col gap-3 sm:flex-row sm:items-end`}>
          <label className="min-w-0 flex-1 text-sm font-semibold">
            Name a new curiosity
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-studio-line bg-studio-cream px-3 py-2.5 font-normal"
              placeholder="A question worth staying with"
              maxLength={80}
            />
          </label>
          <button type="submit" className={inkButton} disabled={creating}>{creating ? 'Planting…' : 'Begin'}</button>
        </form>
        {error ? <p role="alert" className="mb-4 text-sm">{error}</p> : null}
        {!ready ? <p className="text-sm text-studio-muted">Looking for your curiosities…</p> : items.length === 0 ? (
          <section className={panelClass}>
            <Eyebrow>Empty garden</Eyebrow>
            <p className="mt-3 font-serif text-2xl">Nothing is planted yet.</p>
            <p className="mt-2 text-sm leading-relaxed text-studio-body">Name a curiosity above. It will hold the questions you gather and the concepts you decide to keep. There is no score and nothing to finish.</p>
          </section>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id} className={`${panelClass} relative`}>
                {renamingId === item.id ? (
                  <form className="relative z-10 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void rename(item.id) }}>
                    <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-studio-line bg-studio-cream px-3 py-2.5" maxLength={80} />
                    <button type="submit" className={inkButton}>Save name</button>
                    <button type="button" className={quietButton} onClick={() => setRenamingId(null)}>Cancel</button>
                  </form>
                ) : (
                  <>
                    <a
                      href={withBasePath(`/?curiosity=${item.id}`)}
                      aria-label={`Open ${item.name}`}
                      className="absolute inset-0 z-0 rounded-[30px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral"
                    />
                    <div className="relative z-10 flex flex-col gap-4 pointer-events-none sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-serif text-2xl">{item.name}</h3>
                        <p className="mt-1 text-sm text-studio-body">
                          {stageLabel[item.stage]} · {item.questionCount} {item.questionCount === 1 ? 'question' : 'questions'} · {item.conceptCount} {item.conceptCount === 1 ? 'concept' : 'concepts'}
                        </p>
                        <p className="mt-1 text-xs text-studio-muted">Last tended {activityFormat.format(new Date(item.updatedAt))}</p>
                      </div>
                      <button
                        type="button"
                        className={`${quietButton} pointer-events-auto self-start`}
                        onClick={() => { setRenamingId(item.id); setRenameValue(item.name) }}
                      >
                        Rename
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
