import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { withBasePath } from '@/lib/paths'
import './globals.css'

export const metadata: Metadata = {
  title: 'Curitopia',
  description: 'Gather questions, curate them, compare images, and keep a short title with the image.',
  generator: 'v0.app',
  icons: {
    icon: [{ url: withBasePath('/Coral-logo.png'), type: 'image/png' }],
    apple: [{ url: withBasePath('/apple-touch-icon.png'), sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
