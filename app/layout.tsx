import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { withBasePath } from '@/lib/paths'
import './globals.css'

export const metadata: Metadata = {
  applicationName: 'Curitopia',
  title: 'Curitopia',
  description: 'Capture questions, turn them into images, and keep a library of concepts.',
  icons: {
    icon: [
      { url: withBasePath('/icon-light-32x32.jpg'), sizes: '32x32', type: 'image/jpeg' },
      { url: withBasePath('/icon-192.png'), sizes: '192x192', type: 'image/png' },
      { url: withBasePath('/icon-512.png'), sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: withBasePath('/apple-touch-icon.png'), sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: '#ff7f50',
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
