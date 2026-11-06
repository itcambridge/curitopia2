import type { MetadataRoute } from 'next'
import { withBasePath } from '@/lib/paths'

const orange = '#ff7f50'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Curitopia',
    short_name: 'Curitopia',
    description: 'Capture questions, turn them into images, and keep a library of concepts.',
    id: withBasePath('/'),
    start_url: withBasePath('/'),
    scope: withBasePath('/'),
    display: 'standalone',
    background_color: orange,
    theme_color: orange,
    icons: [
      { src: withBasePath('/icon-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: withBasePath('/icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: withBasePath('/icon-maskable-192.png'), sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: withBasePath('/icon-maskable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
