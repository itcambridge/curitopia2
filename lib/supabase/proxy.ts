import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/supabase/database.types'
import { sessionRedirectPath } from '@/lib/paths'
import { readPublicSupabaseEnv } from '@/lib/supabase/env'

function redirectWithSession(request: NextRequest, supabaseResponse: NextResponse, pathname: string) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  const redirect = NextResponse.redirect(url)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value)
  })
  for (const header of ['cache-control', 'expires', 'pragma']) {
    const value = supabaseResponse.headers.get(header)
    if (value) redirect.headers.set(header, value)
  }
  return redirect
}

export async function updateSession(request: NextRequest) {
  const env = readPublicSupabaseEnv()
  if (!env) return NextResponse.next({ request })

  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value)
        })
      },
    },
  })

  let signedIn = false
  try {
    const { data } = await supabase.auth.getClaims()
    signedIn = Boolean(data?.claims)
  } catch {
    return supabaseResponse
  }

  const destination = sessionRedirectPath(request.nextUrl.pathname, signedIn)
  if (destination) return redirectWithSession(request, supabaseResponse, destination)
  return supabaseResponse
}
