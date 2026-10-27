'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { MissingSupabaseEnv } from '@/components/auth/missing-env'
import { coralButton, quietButton } from '@/components/studio/studio-ui'
import { createClient } from '@/lib/supabase/client'
import { readPublicSupabaseEnv } from '@/lib/supabase/env'

type AuthMode = 'sign-in' | 'sign-up'

function authMessage(mode: AuthMode, error: { message?: string; code?: string; name?: string }) {
  const message = error.message ?? ''
  const code = error.code ?? ''
  if (/fetch|network/i.test(message) || error.name === 'AuthRetryableFetchError') {
    return 'The network could not reach the account service. Try again.'
  }
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    return 'That email and password do not match an account.'
  }
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) {
    return 'Confirm the email first, then sign in.'
  }
  if (code === 'user_already_exists' || /already registered/i.test(message)) {
    return 'An account with this email already exists. Sign in instead.'
  }
  if (code === 'weak_password' || /password/i.test(message)) {
    return 'Use at least 8 characters for the password.'
  }
  if (mode === 'sign-up') return 'The account could not be created. Try again.'
  return 'The account could not be opened. Try again.'
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const signIn = mode === 'sign-in'

  if (!readPublicSupabaseEnv()) return <MissingSupabaseEnv />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setPending(true)
    try {
      const supabase = createClient()
      if (signIn) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (signInError) {
          setError(authMessage(mode, signInError))
          return
        }
        router.push('/')
        router.refresh()
        return
      }
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/sign-in` },
      })
      if (signUpError) {
        setError(authMessage(mode, signUpError))
        return
      }
      if (data.session) {
        router.push('/')
        router.refresh()
        return
      }
      const identities = data.user?.identities ?? []
      if (data.user && identities.length === 0) {
        setNotice('An account with this email already exists. Sign in instead.')
        return
      }
      setNotice('Check your email to confirm the account, then sign in.')
    } catch (caught) {
      setError(authMessage(mode, caught instanceof Error ? caught : {}))
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="min-h-screen bg-studio-cream px-6 py-16 text-studio-ink">
      <section className="mx-auto max-w-lg rounded-[30px] border border-studio-line bg-studio-paper p-8 shadow-studio-card">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-[14px] bg-studio-coral text-studio-ivory shadow-studio-stamp">
            <Sparkles size={19} />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-studio-kicker">Field notes</p>
            <p className="font-serif text-[22px] font-semibold tracking-tight">curitopia</p>
          </div>
        </div>
        <h1 className="font-serif text-4xl tracking-tight">{signIn ? 'Return to the garden.' : 'Open a place for your questions.'}</h1>
        <p className="mt-3 text-sm leading-relaxed text-studio-body">
          {signIn
            ? 'Sign in to gather and curate the questions saved to this account.'
            : 'Create an account with email and a password. Questions stay with this account.'}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-studio-line bg-studio-ivory px-3 py-2.5 text-sm font-normal outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral"
            />
          </label>
          <label className="block text-sm font-semibold">
            Password
            <input
              type="password"
              autoComplete={signIn ? 'current-password' : 'new-password'}
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-studio-line bg-studio-ivory px-3 py-2.5 text-sm font-normal outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-coral"
            />
          </label>
          {error && <p role="alert" className="text-sm text-studio-ink">{error}</p>}
          {notice && <p role="status" className="rounded-2xl bg-studio-mint-soft px-4 py-3 text-sm text-studio-grove">{notice}</p>}
          <button type="submit" className={coralButton} disabled={pending}>
            {pending ? 'Working…' : signIn ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <p className="mt-6 text-sm text-studio-body">
          {signIn ? (
            <>New here? <Link className={`${quietButton} ml-2 inline-block`} href="/sign-up">Create an account</Link></>
          ) : (
            <>Already have an account? <Link className={`${quietButton} ml-2 inline-block`} href="/sign-in">Sign in</Link></>
          )}
        </p>
      </section>
    </main>
  )
}
