'use client'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import { withBasePath } from '@/lib/paths'
import type { StageId } from '@/lib/questions/types'

// /2.gif loops after 900ms. Its fully grown frame is showing from 800ms, so hold
// that frame before the loop can return to the seed.
const seedlingHoldMs = 880
const seedlingSrc = '/2.gif'
let finalSeedling: Promise<string> | null = null

function finalSeedlingFrame(src: string) {
  if (!finalSeedling) {
    finalSeedling = decodeFinalSeedling(src).catch((error: unknown) => {
      finalSeedling = null
      throw error
    })
  }
  return finalSeedling
}

type DecodedSeedlingFrame = CanvasImageSource & { displayWidth: number; displayHeight: number; close: () => void }

type SeedlingDecoder = {
  tracks: { ready: Promise<void>; selectedTrack: { frameCount: number } | null }
  decode: (options: { frameIndex: number }) => Promise<{ image: DecodedSeedlingFrame }>
  close: () => void
}

function seedlingDecoder(data: BufferSource) {
  const Decoder = (globalThis as typeof globalThis & { ImageDecoder?: new (init: { data: BufferSource; type: string }) => SeedlingDecoder }).ImageDecoder
  if (!Decoder) return null
  return new Decoder({ data, type: 'image/gif' })
}

async function decodeFinalSeedling(src: string, holdMs = seedlingHoldMs, frameWidth = 512, frameHeight = 341): Promise<string> {
  try {
    const response = await fetch(src)
    if (!response.ok) return captureSeedling(src, holdMs, frameWidth, frameHeight)
    const decoder = seedlingDecoder(await response.arrayBuffer())
    if (!decoder) return captureSeedling(src, holdMs, frameWidth, frameHeight)
    try {
      await decoder.tracks.ready
      const frameCount = decoder.tracks.selectedTrack?.frameCount ?? 1
      const { image } = await decoder.decode({ frameIndex: Math.max(0, frameCount - 1) })
      try {
        const canvas = document.createElement('canvas')
        canvas.width = image.displayWidth
        canvas.height = image.displayHeight
        const context = canvas.getContext('2d')
        if (!context) return captureSeedling(src, holdMs, frameWidth, frameHeight)
        context.drawImage(image, 0, 0)
        return canvas.toDataURL('image/png')
      } finally {
        image.close()
      }
    } finally {
      decoder.close()
    }
  } catch {
    return captureSeedling(src, holdMs, frameWidth, frameHeight)
  }
}

function captureSeedling(src: string, holdMs = seedlingHoldMs, frameWidth = 512, frameHeight = 341) {
  return new Promise<string>((resolve, reject) => {
    const image = document.createElement('img')
    image.alt = ''
    image.src = src
    image.style.cssText = `position:fixed;width:${frameWidth}px;height:${frameHeight}px;opacity:0;pointer-events:none`
    document.body.appendChild(image)
    const finish = () => {
      window.setTimeout(() => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = image.naturalWidth
          canvas.height = image.naturalHeight
          const context = canvas.getContext('2d')
          if (!context || image.naturalWidth === 0) throw new Error('The seedling illustration could not be held.')
          context.drawImage(image, 0, 0)
          resolve(canvas.toDataURL('image/png'))
        } catch (error) {
          reject(error)
        } finally {
          image.remove()
        }
      }, holdMs)
    }
    image.addEventListener('error', () => {
      image.remove()
      reject(new Error('The seedling illustration could not be loaded.'))
    }, { once: true })
    if (image.complete && image.naturalWidth > 0) finish()
    else image.addEventListener('load', finish, { once: true })
  })
}

export function GardenSeedling({ alt, width, height, frame, frameStyle }: { alt: string; width: number; height: number; frame: string; frameStyle: CSSProperties }) {
  const src = withBasePath(seedlingSrc)
  const [held, setHeld] = useState<string | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const image = imageRef.current
    if (!image) return
    let cancelled = false
    let timer = 0
    const still = finalSeedlingFrame(src)
    function hold() {
      timer = window.setTimeout(() => {
        void still.then((url) => {
          if (!cancelled) setHeld(url)
        }).catch(() => undefined)
      }, seedlingHoldMs)
    }
    if (image.complete && image.naturalWidth > 0) hold()
    else image.addEventListener('load', hold, { once: true })
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      image.removeEventListener('load', hold)
    }
  }, [src])

  return <img ref={imageRef} src={held ?? src} alt={alt} width={width} height={height} style={frameStyle} className={frame} />
}

// Nine full frames at 120ms. The finished plant is on screen from 960ms, and the
// file loops at 1,080ms, so hold that frame before playback returns to the start.
const visualiseHoldMs = 1040
const visualiseSrc = '/Growing Seedling Animation Frames.gif'
let finalVisualise: Promise<string> | null = null

function finalVisualiseFrame(src: string) {
  if (!finalVisualise) {
    finalVisualise = decodeFinalSeedling(src, visualiseHoldMs, 430, 406).catch((error: unknown) => {
      finalVisualise = null
      throw error
    })
  }
  return finalVisualise
}

function VisualiseSeedling({ alt, width, height, frame, frameStyle }: { alt: string; width: number; height: number; frame: string; frameStyle: CSSProperties }) {
  const src = withBasePath(encodeURI(visualiseSrc))
  const [held, setHeld] = useState<string | null>(null)
  const [motion, setMotion] = useState<'pending' | 'play' | 'still'>('pending')
  const imageRef = useRef<HTMLImageElement>(null)

  useLayoutEffect(() => {
    setMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'still' : 'play')
  }, [])

  useEffect(() => {
    if (motion === 'pending') return
    let cancelled = false
    const still = finalVisualiseFrame(src)
    if (motion === 'still') {
      void still.then((url) => {
        if (!cancelled) setHeld(url)
      }).catch(() => undefined)
      return () => {
        cancelled = true
      }
    }
    const image = imageRef.current
    if (!image) return
    let timer = 0
    function hold() {
      timer = window.setTimeout(() => {
        void still.then((url) => {
          if (!cancelled) setHeld(url)
        }).catch(() => undefined)
      }, visualiseHoldMs)
    }
    if (image.complete && image.naturalWidth > 0) hold()
    else image.addEventListener('load', hold, { once: true })
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      image.removeEventListener('load', hold)
    }
  }, [motion, src])

  const shown = motion === 'play' ? held ?? src : held ?? undefined
  return <img ref={imageRef} src={shown} alt={alt} width={width} height={height} style={{ ...frameStyle, aspectRatio: `${width} / ${height}` }} className={frame} />
}

// Nine full frames at 120ms. The open blossom is on screen from 960ms, and the
// file loops at 1,080ms, so hold that frame before playback returns to the bud.
const libraryHoldMs = 1040
const librarySrc = '/blossom-bloom.gif'
let finalLibrary: Promise<string> | null = null

function finalLibraryFrame(src: string) {
  if (!finalLibrary) {
    finalLibrary = decodeFinalSeedling(src, libraryHoldMs, 431, 390).catch((error: unknown) => {
      finalLibrary = null
      throw error
    })
  }
  return finalLibrary
}

function LibraryBlossom({ alt, width, height, frame, frameStyle }: { alt: string; width: number; height: number; frame: string; frameStyle: CSSProperties }) {
  const src = withBasePath(librarySrc)
  const [held, setHeld] = useState<string | null>(null)
  const [motion, setMotion] = useState<'pending' | 'play' | 'still'>('pending')
  const imageRef = useRef<HTMLImageElement>(null)

  useLayoutEffect(() => {
    setMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'still' : 'play')
  }, [])

  useEffect(() => {
    if (motion === 'pending') return
    let cancelled = false
    const still = finalLibraryFrame(src)
    if (motion === 'still') {
      void still.then((url) => {
        if (!cancelled) setHeld(url)
      }).catch(() => undefined)
      return () => {
        cancelled = true
      }
    }
    const image = imageRef.current
    if (!image) return
    let timer = 0
    function hold() {
      timer = window.setTimeout(() => {
        void still.then((url) => {
          if (!cancelled) setHeld(url)
        }).catch(() => undefined)
      }, libraryHoldMs)
    }
    if (image.complete && image.naturalWidth > 0) hold()
    else image.addEventListener('load', hold, { once: true })
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      image.removeEventListener('load', hold)
    }
  }, [motion, src])

  const shown = motion === 'play' ? held ?? src : held ?? undefined
  return <img ref={imageRef} src={shown} alt={alt} width={width} height={height} style={{ ...frameStyle, aspectRatio: `${width} / ${height}` }} className={frame} />
}

// Nine full frames at 120ms. The settled glow is on screen from 960ms, and the
// file loops at 1,080ms, so hold that frame before playback returns to the hills.
const experienceHoldMs = 1040
const experienceSrc = '/Radiant Light Across Pastel Hills.gif'
let finalExperience: Promise<string> | null = null

function finalExperienceFrame(src: string) {
  if (!finalExperience) {
    finalExperience = decodeFinalSeedling(src, experienceHoldMs, 505, 337).catch((error: unknown) => {
      finalExperience = null
      throw error
    })
  }
  return finalExperience
}

function ExperienceLandscape({ alt, width, height, frame, frameStyle }: { alt: string; width: number; height: number; frame: string; frameStyle: CSSProperties }) {
  const src = withBasePath(encodeURI(experienceSrc))
  const [held, setHeld] = useState<string | null>(null)
  const [motion, setMotion] = useState<'pending' | 'play' | 'still'>('pending')
  const imageRef = useRef<HTMLImageElement>(null)

  useLayoutEffect(() => {
    setMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'still' : 'play')
  }, [])

  useEffect(() => {
    if (motion === 'pending') return
    let cancelled = false
    const still = finalExperienceFrame(src)
    if (motion === 'still') {
      void still.then((url) => {
        if (!cancelled) setHeld(url)
      }).catch(() => undefined)
      return () => {
        cancelled = true
      }
    }
    const image = imageRef.current
    if (!image) return
    let timer = 0
    function hold() {
      timer = window.setTimeout(() => {
        void still.then((url) => {
          if (!cancelled) setHeld(url)
        }).catch(() => undefined)
      }, experienceHoldMs)
    }
    if (image.complete && image.naturalWidth > 0) hold()
    else image.addEventListener('load', hold, { once: true })
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      image.removeEventListener('load', hold)
    }
  }, [motion, src])

  const shown = motion === 'play' ? held ?? src : held ?? undefined
  return <img ref={imageRef} src={shown} alt={alt} width={width} height={height} style={{ ...frameStyle, aspectRatio: `${width} / ${height}` }} className={frame} />
}

export function ExperienceMark() {
  return (
    <div className="mt-10 hidden w-full min-w-0 justify-center lg:flex">
      <ExperienceLandscape alt="Illustration for Experience" width={505} height={337} frame="h-auto w-[7.5rem] max-w-full object-contain" frameStyle={{ maxWidth: '100%', height: 'auto', width: '7.5rem' }} />
    </div>
  )
}

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
  const frame = sidebar ? 'h-auto w-[7.5rem] max-w-full object-contain' : 'h-auto w-[5.5rem] max-w-full object-contain sm:w-[7rem]'
  const frameStyle = { maxWidth: '100%', height: 'auto', ...(sidebar ? { width: '7.5rem' } : {}) }
  return (
    <div className={sidebar ? 'mt-10 hidden w-full min-w-0 justify-center lg:flex' : 'mt-6 flex w-full min-w-0 justify-center lg:hidden'}>
      {stage === 'gather' ? (
        <GardenSeedling alt={mark.alt} width={mark.width} height={mark.height} frame={frame} frameStyle={frameStyle} />
      ) : stage === 'visualise' ? (
        <VisualiseSeedling alt={mark.alt} width={mark.width} height={mark.height} frame={frame} frameStyle={frameStyle} />
      ) : stage === 'library' ? (
        <LibraryBlossom alt={mark.alt} width={mark.width} height={mark.height} frame={frame} frameStyle={frameStyle} />
      ) : (
        <Image src={withBasePath(mark.src)} alt={mark.alt} width={mark.width} height={mark.height} style={frameStyle} className={frame} />
      )}
    </div>
  )
}
