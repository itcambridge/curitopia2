import Image from 'next/image'
import type { StageId } from '@/lib/questions/types'

// Sizes are the full canvas. shiftX and shiftY, measured from each PNG, move the
// opaque artwork's bottom-right corner onto one shared soil line. Visible height
// grows from the seed to the blossoming tree; the canvases are not the same size.
const marks: Record<StageId, { src: string; width: number; height: number; alt: string; shiftX: string; shiftY: string; frame: string }> = {
  gather: {
    src: '/Gather.png',
    width: 225,
    height: 196,
    alt: 'Illustration for Gather',
    shiftX: '0.889%',
    shiftY: '18.878%',
    frame: 'h-[4.308rem] w-[4.945rem] sm:h-[5.923rem] sm:w-[6.799rem] lg:h-[8.077rem] lg:w-[9.272rem]',
  },
  curate: {
    src: '/Curate.png',
    width: 237,
    height: 256,
    alt: 'Illustration for Curate',
    shiftX: '0.844%',
    shiftY: '11.328%',
    frame: 'h-[4.923rem] w-[4.558rem] sm:h-[6.769rem] sm:w-[6.267rem] lg:h-[8.615rem] lg:w-[7.976rem]',
  },
  visualise: {
    src: '/Visualise.png',
    width: 255,
    height: 344,
    alt: 'Illustration for Visualise',
    shiftX: '1.569%',
    shiftY: '4.942%',
    frame: 'h-[5.77rem] w-[4.277rem] sm:h-[7.968rem] sm:w-[5.906rem] lg:h-[10.166rem] lg:w-[7.536rem]',
  },
  distil: {
    src: '/Distil.png',
    width: 359,
    height: 452,
    alt: 'Illustration for Distil',
    shiftX: '0%',
    shiftY: '5.531%',
    frame: 'h-[6.897rem] w-[5.478rem] sm:h-[9.549rem] sm:w-[7.584rem] lg:h-[12.202rem] lg:w-[9.691rem]',
  },
  library: {
    src: '/Library.png',
    width: 434,
    height: 575,
    alt: 'Illustration for the Library of Curiosities',
    shiftX: '4.608%',
    shiftY: '8.87%',
    frame: 'h-[8.05rem] w-[6.076rem] sm:h-[11.213rem] sm:w-[8.463rem] lg:h-[14.375rem] lg:w-[10.85rem]',
  },
}

export function StageMark({ stage }: { stage: StageId }) {
  const mark = marks[stage]
  return (
    <div className="pointer-events-none absolute right-1 top-[7.25rem] z-[1] size-0 sm:right-4 sm:top-[10.75rem] lg:right-8 lg:top-[13.25rem]">
      <Image
        src={mark.src}
        alt={mark.alt}
        width={mark.width}
        height={mark.height}
        style={{ transform: `translate(${mark.shiftX}, ${mark.shiftY})` }}
        className={`absolute bottom-0 right-0 max-w-none object-contain ${mark.frame}`}
      />
    </div>
  )
}
