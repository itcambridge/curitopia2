import type { Metadata } from 'next'
import { ConsultancyPage } from '@/components/consultancy/landing'
import { consultancyMetadata } from '@/components/consultancy/metadata'
import { CuritopiaEntry } from '@/components/studio/curitopia-entry'

const studioAtRoot = Boolean(process.env.NEXT_PUBLIC_BASE_PATH?.trim())

export const metadata: Metadata = studioAtRoot
  ? {
      title: 'Curitopia',
      description: 'Gather questions, curate them, compare images, and keep a short title with the image.',
    }
  : consultancyMetadata

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ curiosity?: string }>
}) {
  if (studioAtRoot) return <CuritopiaEntry searchParams={searchParams} />
  return <ConsultancyPage />
}
