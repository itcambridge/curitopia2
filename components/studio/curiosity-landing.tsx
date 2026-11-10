'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, ImagePlus, Pencil, Replace, Sprout, Trash2, X } from 'lucide-react'
import { BrandBanner } from '@/components/site-banner'
import { Eyebrow, IconAction, panelClass } from '@/components/studio/studio-ui'
import { studioPath } from '@/lib/paths'
import { curiosityNameProblem } from '@/lib/questions/curiosity'
import { clearCuriosityCover, createCuriosity, listCuriosities, renameCuriosity, setCuriosityCover, type CuriositySummary } from '@/lib/questions/supabase-curiosities'
import { createClient } from '@/lib/supabase/client'
import { surfaceStage } from '@/lib/questions/curiosity-switch'
import type { StageId } from '@/lib/questions/types'

function curiosityPath(id: string) {
  return studioPath(`/?curiosity=${encodeURIComponent(id)}`)
}

function placeName(stage: StageId) {
  const surface = surfaceStage(stage)
  if (surface === 'visualise') return 'Visualise'
  if (surface === 'library') return 'Library'
  return 'Garden'
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
  const [coverNotice, setCoverNotice] = useState<string | null>(null)
  const [coverId, setCoverId] = useState<string | null>(null)
  const [coverBusy, setCoverBusy] = useState<'upload' | 'remove' | null>(null)
  const [coverWarning, setCoverWarning] = useState<string | null>(null)
  const nameField = useRef<HTMLInputElement>(null)

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    setEmail(data.user?.email ?? null)
    const next = await listCuriosities()
    setItems(next.items)
    setCoverNotice(next.coverNotice)
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

  useEffect(() => {
    if (!ready || window.location.hash !== '#new-curiosity') return
    nameField.current?.focus()
  }, [ready])

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
      router.push(curiosityPath(id))
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

  async function uploadCover(id: string, file: File) {
    setCoverBusy('upload')
    setError(null)
    setCoverWarning(null)
    try {
      const warning = await setCuriosityCover(id, file)
      setCoverWarning(warning)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The image could not be uploaded.')
    } finally {
      setCoverBusy(null)
    }
  }

  async function removeCover(id: string) {
    setCoverBusy('remove')
    setError(null)
    setCoverWarning(null)
    try {
      const warning = await clearCuriosityCover(id)
      setCoverWarning(warning)
      setCoverId(null)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The cover image could not be removed.')
    } finally {
      setCoverBusy(null)
    }
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(studioPath('/sign-in'))
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-studio-cream text-studio-ink">
      <BrandBanner email={email} onSignOut={() => { void signOut() }} />
      <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-6xl flex-col px-4 py-8 sm:px-8 lg:px-10">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-xl">
            <p className="font-serif text-4xl tracking-tight sm:text-5xl">Curi-toe·pia</p>
            <p className="mt-3 font-mono text-sm tracking-wide text-studio-body">[juːˈtəʊpɪə]</p>
            <p className="mt-4 italic text-studio-body">noun</p>
            <p className="mt-2 max-w-md text-base leading-relaxed text-studio-body">
              <span className="mr-3 font-serif text-lg">1.</span>
              an imagined place or state of things in which curiosity is practised.
            </p>
          </div>
          <div className="min-w-0">
            <h2 className="font-serif text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">Which curiosity shall we tend?</h2>
            <Link href={studioPath('/?library=all')} className="mt-4 inline-block text-sm font-semibold text-studio-ink underline decoration-studio-line underline-offset-4 hover:decoration-studio-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral">Library of Curiosities</Link>
            <form onSubmit={(event) => { void create(event) }} className={`${panelClass} mt-6`}>
              <label htmlFor="new-curiosity" className="text-sm font-semibold">Name a new curiosity</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  ref={nameField}
                  id="new-curiosity"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="min-h-11 min-w-0 flex-1 rounded-2xl border border-studio-line bg-studio-cream px-4 py-3 text-base font-normal outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral"
                  placeholder="A question worth staying with"
                  maxLength={80}
                />
                <IconAction type="submit" label="Begin this curiosity" treatment="coral" tipAlign="end" disabled={creating}>
                  <Sprout aria-hidden="true" />
                </IconAction>
              </div>
              {creating ? <p className="mt-3 text-sm text-studio-body">Planting…</p> : null}
            </form>
          </div>
        </div>
        {coverNotice ? <p className="mt-6 text-sm text-studio-body">{coverNotice}</p> : null}
        {error ? <p role="alert" className="mt-6 text-sm">{error}</p> : null}
        {coverWarning ? <p className="mt-6 text-sm text-studio-body">{coverWarning}</p> : null}
        {!ready ? <p className="mt-8 text-sm text-studio-muted">Looking for your curiosities…</p> : items.length === 0 ? (
          <section className={`${panelClass} mt-8 max-w-xl`}>
            <Eyebrow>Empty garden</Eyebrow>
            <p className="mt-3 font-serif text-2xl">Nothing is planted yet.</p>
            <p className="mt-2 text-sm leading-relaxed text-studio-body">Name a curiosity above. It will hold the questions you gather and the concepts you decide to keep. There is no score and nothing to finish.</p>
          </section>
        ) : (
          <ul className="mt-8 grid gap-4 lg:grid-cols-2">
            {items.map((item) => (
              <li key={item.id} className={`${panelClass} relative min-w-0`}>
                {renamingId === item.id ? (
                  <form className="relative z-10" onSubmit={(event) => { event.preventDefault(); void rename(item.id) }}>
                    <label htmlFor={`rename-${item.id}`} className="text-sm font-semibold">New name</label>
                    <div className="mt-2 flex items-center gap-2">
                      <input id={`rename-${item.id}`} value={renameValue} onChange={(event) => setRenameValue(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-2xl border border-studio-line bg-studio-cream px-4 py-3 text-base outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral" maxLength={80} />
                      <IconAction type="submit" label="Save this name" treatment="ink">
                        <Check aria-hidden="true" />
                      </IconAction>
                      <IconAction label="Cancel renaming" treatment="quiet" tipAlign="end" onClick={() => setRenamingId(null)}>
                        <X aria-hidden="true" />
                      </IconAction>
                    </div>
                  </form>
                ) : (
                  <>
                    <Link
                      href={curiosityPath(item.id)}
                      aria-label={`Open ${item.name}`}
                      className="absolute inset-0 z-0 rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral"
                    />
                    <div className="pointer-events-none relative z-10 flex items-start gap-3">
                      <CoverThumb item={item} onOpen={() => { setCoverId(item.id); setCoverWarning(null) }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="min-w-0 truncate font-serif text-2xl leading-tight">{item.name}</h3>
                          <IconAction label="Rename this curiosity" treatment="quiet" tipAlign="end" className="pointer-events-auto" onClick={() => { setRenamingId(item.id); setRenameValue(item.name) }}>
                            <Pencil aria-hidden="true" />
                          </IconAction>
                        </div>
                        <p className="mt-1 text-sm text-studio-body">
                          {placeName(item.stage)} · {item.questionCount} {item.questionCount === 1 ? 'question' : 'questions'} · {item.conceptCount} {item.conceptCount === 1 ? 'concept' : 'concepts'}
                        </p>
                        <p className="mt-1 text-sm text-studio-muted">Last tended {activityFormat.format(new Date(item.updatedAt))}</p>
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <CoverDialog
          item={items.find((item) => item.id === coverId) ?? null}
          busy={coverBusy}
          onClose={() => { if (!coverBusy) setCoverId(null) }}
          onUpload={(file) => { if (coverId) void uploadCover(coverId, file) }}
          onRemove={() => { if (coverId) void removeCover(coverId) }}
        />
      </div>
    </main>
  )
}

function CoverThumb({ item, onOpen }: { item: CuriositySummary; onOpen: () => void }) {
  if (!item.coverImageSrc) {
    return (
      <IconAction label="Add a cover image" treatment="quiet" tipAlign="start" className="pointer-events-auto" onClick={onOpen}>
        <ImagePlus aria-hidden="true" />
      </IconAction>
    )
  }
  return (
    <button
      type="button"
      className="pointer-events-auto size-16 shrink-0 overflow-hidden rounded-2xl border border-studio-line bg-studio-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral sm:size-20"
      aria-label="Replace the cover image"
      onClick={onOpen}
    >
      <img src={item.coverImageSrc} alt="" className="size-full object-cover" />
    </button>
  )
}

function CoverDialog({
  item,
  busy,
  onClose,
  onUpload,
  onRemove,
}: {
  item: CuriositySummary | null
  busy: 'upload' | 'remove' | null
  onClose: () => void
  onUpload: (file: File) => void
  onRemove: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (item && !dialog.open) dialog.showModal()
    if (!item && dialog.open) dialog.close()
  }, [item])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={item ? titleId : undefined}
      className="w-[min(100%-2rem,24rem)] rounded-3xl border border-studio-line bg-studio-paper p-6 text-studio-ink shadow-studio-card"
      onCancel={(event) => { if (busy) event.preventDefault() }}
      onClose={onClose}
    >
      {item ? (
        <form method="dialog" className="flex flex-col gap-4">
          <div>
            <h3 id={titleId} className="font-serif text-2xl">Cover image</h3>
            <p className="mt-1 text-sm text-studio-body">{item.name}</p>
          </div>
          <div className="grid size-24 place-items-center overflow-hidden rounded-2xl border border-dashed border-studio-line bg-studio-ivory text-studio-muted">
            {item.coverImageSrc ? <img src={item.coverImageSrc} alt="" className="size-full object-cover" /> : <ImagePlus aria-hidden="true" />}
          </div>
          <p className="text-sm text-studio-muted">JPEG, PNG, or WebP. Up to 5 MB.</p>
          <input
            ref={fileRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
            disabled={busy !== null}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) onUpload(file)
            }}
          />
          <div className="flex items-center gap-2">
            <IconAction
              label={item.coverImagePath ? 'Replace the cover image' : 'Add a cover image'}
              treatment={item.coverImagePath ? 'ink' : 'quiet'}
              tipAlign="start"
              disabled={busy !== null}
              onClick={() => fileRef.current?.click()}
            >
              {item.coverImagePath ? <Replace aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
            </IconAction>
            {item.coverImagePath ? (
              <IconAction label="Remove the cover image" treatment="quiet" disabled={busy !== null} onClick={onRemove}>
                <Trash2 aria-hidden="true" />
              </IconAction>
            ) : null}
            <IconAction type="submit" label="Close" treatment="quiet" tipAlign="end" disabled={busy !== null}>
              <X aria-hidden="true" />
            </IconAction>
          </div>
          {busy === 'upload' ? <p className="text-sm text-studio-body">Uploading…</p> : null}
          {busy === 'remove' ? <p className="text-sm text-studio-body">Removing…</p> : null}
        </form>
      ) : null}
    </dialog>
  )
}
