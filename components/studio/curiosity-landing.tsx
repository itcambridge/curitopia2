'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ImagePlus } from 'lucide-react'
import { BrandBanner } from '@/components/site-banner'
import { Eyebrow, inkButton, panelClass, quietButton } from '@/components/studio/studio-ui'
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
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-8">
        <div className="mb-10 max-w-xl">
          <p className="font-serif text-4xl tracking-tight">Curi-toe·pia</p>
          <p className="mt-3 font-mono text-sm tracking-wide text-studio-body">[juːˈtəʊpɪə]</p>
          <p className="mt-4 italic text-studio-body">noun</p>
          <p className="mt-2 max-w-md text-base leading-relaxed text-studio-body">
            <span className="mr-3 font-serif text-lg">1.</span>
            an imagined place or state of things in which curiosity is practised.
          </p>
        </div>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-serif text-4xl leading-tight">Which curiosity shall we tend?</h2>
          <Link href={studioPath('/?library=all')} className={`${quietButton} w-full text-center sm:w-auto`}>Library of Curiosities</Link>
        </div>
        <form onSubmit={(event) => { void create(event) }} className={`${panelClass} mb-6 flex flex-col gap-3 sm:flex-row sm:items-end`}>
          <label className="min-w-0 flex-1 text-sm font-semibold">
            Name a new curiosity
            <input
              ref={nameField}
              id="new-curiosity"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-studio-line bg-studio-cream px-3 py-2.5 font-normal"
              placeholder="A question worth staying with"
              maxLength={80}
            />
          </label>
          <button type="submit" className={inkButton} disabled={creating}>{creating ? 'Planting…' : 'Begin'}</button>
        </form>
        {coverNotice ? <p className="mb-4 text-sm text-studio-body">{coverNotice}</p> : null}
        {error ? <p role="alert" className="mb-4 text-sm">{error}</p> : null}
        {coverWarning ? <p className="mb-4 text-sm text-studio-body">{coverWarning}</p> : null}
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
                    <Link
                      href={curiosityPath(item.id)}
                      aria-label={`Open ${item.name}`}
                      className="absolute inset-0 z-0 rounded-[30px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral"
                    />
                    <div className="pointer-events-none relative z-10 flex items-start gap-3 sm:items-center sm:gap-4">
                      <CoverThumb item={item} onOpen={() => { setCoverId(item.id); setCoverWarning(null) }} />
                      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="truncate font-serif text-2xl">{item.name}</h3>
                          <p className="mt-1 text-sm text-studio-body">
                            {placeName(item.stage)} · {item.questionCount} {item.questionCount === 1 ? 'question' : 'questions'} · {item.conceptCount} {item.conceptCount === 1 ? 'concept' : 'concepts'}
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
  const label = item.coverImagePath ? `Change image for ${item.name}` : `Add image for ${item.name}`
  return (
    <button
      type="button"
      className={`pointer-events-auto grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border bg-studio-ivory text-studio-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral sm:size-24 ${item.coverImageSrc ? 'border-solid border-studio-line' : 'border-dashed border-studio-line'}`}
      aria-label={label}
      onClick={onOpen}
    >
      {item.coverImageSrc ? (
        <img src={item.coverImageSrc} alt="" className="size-full object-cover" />
      ) : (
        <span className="flex flex-col items-center gap-1 px-1 text-[10px] font-semibold leading-tight sm:text-xs">
          <ImagePlus size={16} aria-hidden="true" />
          Add image
        </span>
      )}
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
  const inputId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (item && !dialog.open) dialog.showModal()
    if (!item && dialog.open) dialog.close()
  }, [item])

  return (
    <dialog
      ref={dialogRef}
      className="w-[min(100%-2rem,24rem)] rounded-[30px] border border-studio-line bg-studio-paper p-6 text-studio-ink shadow-studio-card"
      onCancel={(event) => { if (busy) event.preventDefault() }}
      onClose={onClose}
    >
      {item ? (
        <form method="dialog" className="flex flex-col gap-4">
          <div>
            <h3 className="font-serif text-2xl">Cover image</h3>
            <p className="mt-1 text-sm text-studio-body">{item.name}</p>
          </div>
          <div className="grid size-24 place-items-center overflow-hidden rounded-2xl border border-dashed border-studio-line bg-studio-ivory text-studio-muted">
            {item.coverImageSrc ? <img src={item.coverImageSrc} alt="" className="size-full object-cover" /> : <ImagePlus size={18} aria-hidden="true" />}
          </div>
          <label htmlFor={inputId} className={`${inkButton} text-center ${busy ? 'pointer-events-none opacity-40' : 'cursor-pointer'}`}>
            {busy === 'upload' ? 'Uploading…' : item.coverImagePath ? 'Replace image' : 'Upload image'}
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy !== null}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) onUpload(file)
            }}
          />
          {item.coverImagePath ? (
            <button type="button" className={quietButton} disabled={busy !== null} onClick={onRemove}>
              {busy === 'remove' ? 'Removing…' : 'Remove image'}
            </button>
          ) : null}
          <p className="text-xs text-studio-muted">JPEG, PNG, or WebP. Up to 5 MB.</p>
          <button type="submit" className={quietButton} disabled={busy !== null}>Close</button>
        </form>
      ) : null}
    </dialog>
  )
}
