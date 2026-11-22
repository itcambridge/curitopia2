'use client'

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrivalArtwork } from '@/components/studio/arrival/artwork'
import { arrivalSpecs, type ArrivalDestination } from '@/components/studio/arrival/destinations'
import { withBasePath } from '@/lib/paths'
import './arrival.css'

export function ArrivalOverlay({
  destination,
  srcOverride,
  onDone,
}: {
  destination: ArrivalDestination
  srcOverride?: string
  onDone?: () => void
}) {
  const spec = arrivalSpecs[destination]
  const [shown, setShown] = useState(true)
  const onDoneRef = useRef(onDone)
  const finished = useRef(false)
  const timerRef = useRef<number | null>(null)
  onDoneRef.current = onDone

  function clearTimer() {
    if (timerRef.current === null) return
    window.clearTimeout(timerRef.current)
    timerRef.current = null
  }

  function finish() {
    if (finished.current) return
    finished.current = true
    clearTimer()
    setShown(false)
    onDoneRef.current?.()
  }

  useLayoutEffect(() => {
    finished.current = false
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finished.current = true
      setShown(false)
      onDoneRef.current?.()
      return
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      if (finished.current) return
      finished.current = true
      setShown(false)
      onDoneRef.current?.()
    }, spec.durationMs)
    return () => {
      clearTimer()
    }
  }, [spec.durationMs])

  if (!shown) return null
  const src = srcOverride ?? spec.gif?.src ?? null
  const gif = spec.gif

  return (
    <div
      className="arrival-overlay pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center"
      data-arrival={destination}
      data-fade={src ? 'hold' : 'out'}
      style={{ '--arrival-ms': `${spec.durationMs}ms` } as CSSProperties}
      aria-hidden="true"
    >
      <div className={spec.widthClass}>
        {src ? (
          <img
            src={withBasePath(src)}
            alt=""
            width={gif?.width ?? 512}
            height={gif?.height ?? 341}
            className="h-auto w-full"
            onError={finish}
          />
        ) : (
          <ArrivalArtwork destination={destination} />
        )}
      </div>
    </div>
  )
}
