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

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(basePath ? { basePath } : {}),
  images: {
    unoptimized: true,
  },
}

export default nextConfig
