import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function pngSize(name: string) {
  const bytes = readFileSync(new URL(`../public/${name}`, import.meta.url))
  assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

assert.deepEqual(pngSize('icon-192.png'), { width: 192, height: 192 })
assert.deepEqual(pngSize('icon-512.png'), { width: 512, height: 512 })
assert.deepEqual(pngSize('icon-maskable-192.png'), { width: 192, height: 192 })
assert.deepEqual(pngSize('icon-maskable-512.png'), { width: 512, height: 512 })
assert.deepEqual(pngSize('apple-touch-icon.png'), { width: 180, height: 180 })

const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8')
const manifest = readFileSync(new URL('../app/manifest.ts', import.meta.url), 'utf8')
const proxy = readFileSync(new URL('../proxy.ts', import.meta.url), 'utf8')
assert.equal(proxy.includes('manifest.webmanifest'), true)
assert.equal(layout.includes('v0.app'), false)
assert.equal(layout.includes('icon.svg'), false)
assert.equal(layout.includes("withBasePath('/icon-light-32x32.jpg')"), true)
assert.equal(layout.includes("withBasePath('/icon-192.png')"), true)
assert.equal(layout.includes("withBasePath('/icon-512.png')"), true)
assert.equal(layout.includes("withBasePath('/apple-touch-icon.png')"), true)
assert.equal(layout.includes("themeColor: '#ff7f50'"), true)
assert.equal(layout.includes("applicationName: 'Curitopia'"), true)

assert.equal(manifest.includes("name: 'Curitopia'"), true)
assert.equal(manifest.includes("short_name: 'Curitopia'"), true)
assert.equal(manifest.includes("background_color: orange"), true)
assert.equal(manifest.includes("theme_color: orange"), true)
assert.equal(manifest.includes("const orange = '#ff7f50'"), true)
assert.equal(manifest.includes("start_url: withBasePath('/')"), true)
assert.equal(manifest.includes("scope: withBasePath('/')"), true)
assert.equal(manifest.includes("src: withBasePath('/icon-192.png')"), true)
assert.equal(manifest.includes("src: withBasePath('/icon-512.png')"), true)
assert.equal(manifest.includes("src: withBasePath('/icon-maskable-192.png')"), true)
assert.equal(manifest.includes("src: withBasePath('/icon-maskable-512.png')"), true)
assert.equal(manifest.includes("purpose: 'maskable'"), true)
assert.equal(manifest.includes("purpose: 'any'"), true)
assert.equal(manifest.includes('icon.svg'), false)
assert.equal(manifest.includes('v0'), false)

console.log('pwa branding checks passed')
