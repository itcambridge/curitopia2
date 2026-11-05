import { CuritopiaEntry } from '@/components/studio/curitopia-entry'

export default function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ curiosity?: string; library?: string; concept?: string; garden?: string }>
}) {
  return <CuritopiaEntry searchParams={searchParams} />
}
