import Image from 'next/image'
import { withBasePath } from '@/lib/paths'

const sizes = {
  md: { box: 'size-11', pixels: 44 },
  sm: { box: 'size-10', pixels: 40 },
} as const

export function BrandMark({ size = 'md' }: { size?: keyof typeof sizes }) {
  const mark = sizes[size]
  return (
    <Image
      src={withBasePath('/Coral-logo.png')}
      alt=""
      width={mark.pixels}
      height={mark.pixels}
      className={`${mark.box} shrink-0 object-contain`}
    />
  )
}
