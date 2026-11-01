import { CuritopiaEntry } from '@/components/studio/curitopia-entry'

export default function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ curiosity?: string }>
}) {
  return <CuritopiaEntry searchParams={searchParams} />
}
