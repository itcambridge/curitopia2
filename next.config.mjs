import { readFileSync } from 'node:fs'
import { resolveConfiguredBasePath } from './lib/base-path.mjs'

function manifestBasePath() {
  try {
    const manifest = JSON.parse(readFileSync(new URL('./.next/routes-manifest.json', import.meta.url), 'utf8'))
    return typeof manifest.basePath === 'string' ? manifest.basePath : ''
  } catch {
    return ''
  }
}

function nextCommand() {
  const args = process.argv
  for (let index = 0; index < args.length; index += 1) {
    const name = args[index].replaceAll('\\', '/').split('/').pop()
    if (name !== 'next' && name !== 'next.js') continue
    const command = args[index + 1]
    if (command === 'build' || command === 'start' || command === 'dev') return command
  }
  return ''
}

const basePath = resolveConfiguredBasePath({
  envValue: process.env.NEXT_PUBLIC_BASE_PATH,
  phase: process.env.NEXT_PHASE,
  nodeEnv: process.env.NODE_ENV,
  manifestBasePath: manifestBasePath(),
  command: nextCommand(),
})

function listenPort() {
  const args = process.argv
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '-p' || arg === '--port') return args[index + 1] || '3017'
    if (arg.startsWith('--port=')) return arg.slice('--port='.length)
  }
  return process.env.PORT || '3017'
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(basePath ? { basePath } : {}),
  images: {
    unoptimized: true,
  },
  async rewrites() {
    if (basePath) {
      // Next will not render an app route outside basePath. Proxy the public
      // root to the consultancy page, which is served at /42/site.
      // The port is recorded at build time. Match it to the port `next start` uses.
      return {
        beforeFiles: [
          {
            source: '/',
            destination: `http://127.0.0.1:${listenPort()}${basePath}/site`,
            basePath: false,
          },
        ],
      }
    }
    return {
      beforeFiles: [
        { source: '/42', destination: '/workspace' },
        { source: '/42/sign-in', destination: '/sign-in' },
        { source: '/42/sign-up', destination: '/sign-up' },
        { source: '/42/api/:path*', destination: '/api/:path*' },
      ],
    }
  },
}

export default nextConfig
