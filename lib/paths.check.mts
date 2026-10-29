import assert from 'node:assert/strict'
import { NextRequest } from 'next/server.js'
import { authReturnUrl, sessionRedirectPath, withBasePath } from './paths.ts'
import { readBasePath } from './base-path.mjs'

const saved = process.env.NEXT_PUBLIC_BASE_PATH

function useBase(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH
  else process.env.NEXT_PUBLIC_BASE_PATH = value
}

try {
  useBase(undefined)
  assert.equal(readBasePath(undefined), '')
  assert.equal(readBasePath(''), '')
  assert.equal(withBasePath('/api/images'), '/api/images')
  assert.equal(withBasePath('/?curiosity=abc'), '/?curiosity=abc')
  assert.equal(authReturnUrl('http://localhost:3000'), 'http://localhost:3000/sign-in')
  assert.equal(withBasePath('https://api.openai.com/v1/images/generations'), 'https://api.openai.com/v1/images/generations')
  assert.equal(withBasePath('https://example.supabase.co/storage/v1/object/sign/concept-images/a.png'), 'https://example.supabase.co/storage/v1/object/sign/concept-images/a.png')
  assert.equal(withBasePath('data:image/png;base64,abc'), 'data:image/png;base64,abc')

  useBase('/42')
  assert.equal(readBasePath('/42'), '/42')
  assert.equal(withBasePath('/api/consider'), '/42/api/consider')
  assert.equal(withBasePath('/api/images'), '/42/api/images')
  assert.equal(withBasePath('/api/titles'), '/42/api/titles')
  assert.equal(withBasePath('/Gather.png'), '/42/Gather.png')
  assert.equal(withBasePath('/'), '/42/')
  assert.equal(withBasePath('/?curiosity=abc'), '/42/?curiosity=abc')
  assert.equal(withBasePath('/42/sign-in'), '/42/sign-in')
  assert.equal(authReturnUrl('https://curitopia.com/'), 'https://curitopia.com/42/sign-in')
  assert.equal(withBasePath('https://api.openai.com/v1/chat/completions'), 'https://api.openai.com/v1/chat/completions')
  assert.throws(() => readBasePath('42'), /NEXT_PUBLIC_BASE_PATH/)
  assert.throws(() => readBasePath('/42/'), /NEXT_PUBLIC_BASE_PATH/)
  assert.throws(() => readBasePath('https://curitopia.com/42'), /NEXT_PUBLIC_BASE_PATH/)

  assert.equal(sessionRedirectPath('/', false), '/sign-in')
  assert.equal(sessionRedirectPath('/sign-in', false), null)
  assert.equal(sessionRedirectPath('/sign-up', false), null)
  assert.equal(sessionRedirectPath('/api/images', false), null)
  assert.equal(sessionRedirectPath('/sign-in', true), '/')
  assert.equal(sessionRedirectPath('/', true), null)

  const request = new NextRequest('https://curitopia.com/42/library', {
    nextConfig: { basePath: '/42' },
  })
  assert.equal(request.nextUrl.pathname, '/library')
  assert.equal(request.nextUrl.basePath, '/42')
  const signedOut = request.nextUrl.clone()
  signedOut.pathname = sessionRedirectPath(request.nextUrl.pathname, false) ?? signedOut.pathname
  assert.equal(signedOut.href, 'https://curitopia.com/42/sign-in')

  const authRequest = new NextRequest('https://curitopia.com/42/sign-in', {
    nextConfig: { basePath: '/42' },
  })
  const signedIn = authRequest.nextUrl.clone()
  signedIn.pathname = sessionRedirectPath(authRequest.nextUrl.pathname, true) ?? signedIn.pathname
  assert.equal(signedIn.pathname, '/')
  assert.equal(signedIn.href, 'https://curitopia.com/42')

  const apiRequest = new NextRequest('https://curitopia.com/42/api/images', {
    nextConfig: { basePath: '/42' },
  })
  assert.equal(apiRequest.nextUrl.pathname, '/api/images')
  assert.equal(sessionRedirectPath(apiRequest.nextUrl.pathname, false), null)

  const local = new NextRequest('http://localhost:3000/sign-in')
  assert.equal(local.nextUrl.pathname, '/sign-in')
  assert.equal(local.nextUrl.basePath, '')
  const localHome = local.nextUrl.clone()
  localHome.pathname = sessionRedirectPath(local.nextUrl.pathname, true) ?? localHome.pathname
  assert.equal(localHome.href, 'http://localhost:3000/')
} finally {
  useBase(saved)
}

console.log('base path checks passed')
