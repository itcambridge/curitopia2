import Image from 'next/image'
import { withBasePath } from '@/lib/paths'
import type { StageId } from '@/lib/questions/types'

const marks: Record<StageId, { src: string; width: number; height: number; alt: string }> = {
  gather: { src: '/Gather.png', width: 225, height: 196, alt: 'Illustration for Gather' },
  curate: { src: '/Curate.png', width: 237, height: 256, alt: 'Illustration for Curate' },
  visualise: { src: '/Visualise.png', width: 255, height: 344, alt: 'Illustration for Visualise' },
  distil: { src: '/Distil.png', width: 359, height: 452, alt: 'Illustration for Distil' },
  library: { src: '/Library.png', width: 434, height: 575, alt: 'Illustration for the Library of Curiosities' },
}

export function StageMark({ stage, placement }: { stage: StageId; placement: 'sidebar' | 'content' }) {
  const mark = marks[stage]
  const sidebar = placement === 'sidebar'
  return (
    <div className={sidebar ? 'mt-10 hidden w-full min-w-0 justify-center lg:flex' : 'mt-6 flex w-full min-w-0 justify-center lg:hidden'}>
      <Image
        src={withBasePath(mark.src)}
        alt={mark.alt}
        width={mark.width}
        height={mark.height}
        style={{ maxWidth: '100%', height: 'auto', ...(sidebar ? { width: '7.5rem' } : {}) }}
        className={sidebar ? 'h-auto w-[7.5rem] max-w-full object-contain' : 'h-auto w-[5.5rem] max-w-full object-contain sm:w-[7rem]'}
      />
    </div>
  )
}
