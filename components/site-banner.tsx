import Image from 'next/image'
import { withBasePath } from '@/lib/paths'

export function SiteBanner({ alt = '' }: { alt?: string }) {
  return (
    <div className="flex">
      <Image
        src={withBasePath('/header.png')}
        alt={alt}
        width={492}
        height={100}
        priority
        className="h-12 w-auto max-w-full object-contain sm:h-14"
      />
    </div>
  )
}
