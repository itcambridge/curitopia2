import type { Metadata } from 'next'
import { ConsultancyPage } from '@/components/consultancy/landing'
import { consultancyMetadata } from '@/components/consultancy/metadata'
import { CuritopiaEntry } from '@/components/studio/curitopia-entry'

const studioAtRoot = Boolean(process.env.NEXT_PUBLIC_BASE_PATH?.trim())

export const metadata: Metadata = studioAtRoot
  ? {
      title: 'Curitopia',
      description: 'Capture questions, turn them into images, and keep a library of concepts.',
    }
  : consultancyMetadata

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ curiosity?: string; library?: string; concept?: string; garden?: string; experience?: string }>
}) {
  if (studioAtRoot) return <CuritopiaEntry searchParams={searchParams} />
  return <ConsultancyPage />
}
