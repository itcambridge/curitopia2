'use client'

import { useState } from 'react'
import { coralButton, quietButton } from '@/components/studio/studio-ui'
import type { ImportItem, ImportSkip } from '@/lib/questions/import-plan'
import type { ImportFailure } from '@/lib/questions/supabase-questions'

export function ImportLocalQuestions({
  items,
  skipped,
  onImport,
  onConfirm,
  onDismiss,
}: {
  items: ImportItem[]
  skipped: ImportSkip[]
  onImport: () => Promise<{ imported: number; failed: ImportFailure[] }>
  onConfirm: () => void
  onDismiss: () => void
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ imported: number; failed: ImportFailure[] } | null>(null)

  async function runImport() {
    setPending(true)
    setError(null)
    try {
      setResult(await onImport())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The import could not finish.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="mb-6 rounded-[30px] border border-studio-line bg-studio-ivory p-5 shadow-studio-card">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-studio-eyebrow">Browser copy</p>
      <h2 className="mt-2 font-serif text-3xl tracking-tight">Bring these questions into the account?</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-studio-body">
        They stay in this browser either way. Importing adds them to the signed-in account and does not replace questions already there.
      </p>
      {items.length > 0 && (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={item.question.id} className="rounded-2xl border border-studio-line bg-studio-paper px-4 py-3 text-sm">
              <p>{item.question.originalText}</p>
              <p className="mt-1 text-xs text-studio-muted">
                {item.question.disposition}
                {item.question.mergedIntoId ? ' · merged' : ''}
                {item.question.consideredText ? ' · considered wording kept' : ''}
              </p>
              {item.note && <p className="mt-1 text-xs text-studio-grove">{item.note}</p>}
            </li>
          ))}
        </ul>
      )}
      {skipped.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold">Not imported</p>
          <ul className="mt-2 space-y-1 text-sm text-studio-body">
            {skipped.map((item) => (
              <li key={item.id}>{item.text}: {item.reason}</li>
            ))}
          </ul>
        </div>
      )}
      {result && (
        <p role="status" className="mt-4 text-sm text-studio-ink">
          Imported {result.imported}. Skipped {skipped.length}. Failed {result.failed.length}.
          {result.failed.map((item) => (
            <span key={item.id} className="mt-1 block">{item.text}: {item.reason}</span>
          ))}
        </p>
      )}
      {error && <p role="alert" className="mt-4 text-sm">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {items.length > 0 && (!result || result.failed.length > 0) && (
          <button type="button" className={coralButton} disabled={pending} onClick={runImport}>
            {pending ? 'Importing…' : result ? 'Try the remaining questions' : 'Import these questions'}
          </button>
        )}
        {result && result.failed.length === 0 && (
          <button type="button" className={coralButton} onClick={onConfirm}>I can see these questions in the account</button>
        )}
        <button type="button" className={quietButton} onClick={onDismiss}>Not now</button>
      </div>
    </section>
  )
}
