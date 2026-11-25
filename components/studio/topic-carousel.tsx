'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { IconAction } from '@/components/studio/studio-ui'
import { stepConceptIndex } from '@/lib/questions/library-carousel'
import { topicIndexFromStrip, topicStrip, topicWrapStrip } from '@/lib/questions/topic-carousel'

type TopicSlide<T extends { id: string }> = {
  key: string
  item: T
  strip: number
  clone: boolean
}

function slidesFor<T extends { id: string }>(items: readonly T[]): TopicSlide<T>[] {
  if (items.length === 0) return []
  if (items.length === 1) return [{ key: items[0].id, item: items[0], strip: 0, clone: false }]
  const last = items[items.length - 1]
  const first = items[0]
  return [
    { key: `leading:${last.id}`, item: last, strip: 0, clone: true },
    ...items.map((item, index) => ({ key: item.id, item, strip: index + 1, clone: false })),
    { key: `trailing:${first.id}`, item: first, strip: items.length + 1, clone: true },
  ]
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function nearestStrip(scroller: HTMLElement) {
  const slides = [...scroller.querySelectorAll<HTMLElement>('[data-strip]')]
  if (slides.length === 0) return null
  const origin = scroller.getBoundingClientRect().left
  let best = Number(slides[0].dataset.strip)
  let distance = Number.POSITIVE_INFINITY
  for (const slide of slides) {
    const delta = Math.abs(slide.getBoundingClientRect().left - origin)
    if (delta < distance) {
      distance = delta
      best = Number(slide.dataset.strip)
    }
  }
  return best
}

export function TopicCarousel<T extends { id: string }>({
  label,
  items,
  index,
  onIndex,
  renderItem,
  className = '',
  itemNoun = 'topic',
  cardWidth = 'topic',
}: {
  label: string
  items: readonly T[]
  index: number
  onIndex: (index: number) => void
  renderItem: (item: T, interactive: boolean) => ReactNode
  className?: string
  itemNoun?: string
  cardWidth?: 'topic' | 'collection'
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const indexRef = useRef(index)
  const onIndexRef = useRef(onIndex)
  const readyRef = useRef(false)
  const holdRef = useRef(false)
  const holdTokenRef = useRef(0)
  const drivingRef = useRef(false)
  const pendingRef = useRef(index)
  const movedRef = useRef(false)
  const scrollOriginRef = useRef(0)
  indexRef.current = index
  onIndexRef.current = onIndex
  const count = items.length
  const listKey = items.map((item) => item.id).join('\0')
  const slides = slidesFor(items)

  function scrollToStrip(strip: number, behavior: ScrollBehavior) {
    const scroller = scrollerRef.current
    if (!scroller) return
    const slide = scroller.querySelector<HTMLElement>(`[data-strip="${strip}"]`)
    if (!slide) return
    const left = slide.getBoundingClientRect().left - scroller.getBoundingClientRect().left + scroller.scrollLeft
    if (Math.abs(scroller.scrollLeft - left) < 2) return
    const reduce = prefersReducedMotion()
    const instant = reduce || behavior === 'auto'
    drivingRef.current = !instant
    scroller.scrollTo({ left, behavior: instant ? 'auto' : 'smooth' })
    if (instant) drivingRef.current = false
  }

  useLayoutEffect(() => {
    pendingRef.current = index
    const scroller = scrollerRef.current
    if (!scroller || count === 0 || holdRef.current) return
    const desired = topicStrip(index, count)
    const nearest = nearestStrip(scroller)
    if (nearest === desired) {
      readyRef.current = true
      return
    }
    const fromClone = count > 1 && (nearest === 0 || nearest === count + 1)
    const behavior = !readyRef.current || prefersReducedMotion() || fromClone ? 'auto' : 'smooth'
    readyRef.current = true
    scrollToStrip(desired, behavior)
  }, [index, count, listKey])

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    let timer = 0
    function finish() {
      const node = scrollerRef.current
      if (!node) return
      if (holdRef.current) {
        holdRef.current = false
        drivingRef.current = false
        scrollToStrip(topicStrip(indexRef.current, count), 'auto')
        return
      }
      drivingRef.current = false
      const current = nearestStrip(node)
      if (current === null) return
      const resolved = topicIndexFromStrip(current, count)
      if (resolved.index !== indexRef.current) onIndexRef.current(resolved.index)
    }
    function onScroll() {
      if (holdRef.current || drivingRef.current) return
      window.clearTimeout(timer)
      timer = window.setTimeout(finish, 80)
    }
    function onScrollEnd() {
      window.clearTimeout(timer)
      finish()
    }
    scroller.addEventListener('scroll', onScroll)
    scroller.addEventListener('scrollend', onScrollEnd)
    return () => {
      window.clearTimeout(timer)
      scroller.removeEventListener('scroll', onScroll)
      scroller.removeEventListener('scrollend', onScrollEnd)
    }
  }, [count, listKey])

  function go(direction: -1 | 1) {
    if (count <= 1) return
    const current = pendingRef.current
    const next = stepConceptIndex(current, count, direction)
    const wrap = topicWrapStrip(current, count, direction)
    pendingRef.current = next
    if (wrap !== null && !prefersReducedMotion()) {
      const token = holdTokenRef.current + 1
      holdTokenRef.current = token
      holdRef.current = true
      onIndex(next)
      scrollToStrip(wrap, 'smooth')
      window.setTimeout(() => {
        if (holdTokenRef.current !== token || !holdRef.current) return
        holdRef.current = false
        scrollToStrip(topicStrip(next, count), 'auto')
      }, 450)
      return
    }
    holdRef.current = false
    onIndex(next)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (count <= 1) return
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    const target = event.target
    if (target instanceof HTMLElement && target.closest('input, textarea, select')) return
    event.preventDefault()
    go(event.key === 'ArrowRight' ? 1 : -1)
  }

  if (count === 0) return null
  const collectionSlide = 'w-[82%] max-w-[30rem] shrink-0 snap-start @min-[52rem]:w-[min(42%,30rem)]'
  const slideClass = cardWidth === 'collection'
    ? collectionSlide
    : count === 1 ? 'w-fit max-w-full shrink-0' : 'w-[82%] shrink-0 snap-start'

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={`${label} ${itemNoun === 'topic' ? 'topics' : `${itemNoun}s`}`}
      tabIndex={count > 1 ? 0 : undefined}
      onKeyDown={onKeyDown}
      className={`@container min-w-0 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-studio-coral ${className}`}
    >
      <div
        ref={scrollerRef}
        data-topic-scroller=""
        className="flex touch-pan-x snap-x snap-mandatory items-start gap-3 overflow-x-auto overscroll-x-contain px-2 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onPointerDown={() => {
          movedRef.current = false
          drivingRef.current = false
          holdRef.current = false
          scrollOriginRef.current = scrollerRef.current?.scrollLeft ?? 0
        }}
        onPointerMove={() => {
          const left = scrollerRef.current?.scrollLeft ?? 0
          if (Math.abs(left - scrollOriginRef.current) > 6) movedRef.current = true
        }}
        onClickCapture={(event) => {
          if (!movedRef.current) return
          event.preventDefault()
          event.stopPropagation()
        }}
      >
        {slides.map((slide) => (
          <div
            key={slide.key}
            data-strip={slide.strip}
            aria-hidden={slide.clone ? true : undefined}
            inert={slide.clone ? true : undefined}
            className={slideClass}
          >
            {renderItem(slide.item, !slide.clone)}
          </div>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">{label}, {index + 1} of {count}</p>
      {count > 1 ? (
        <div className="mt-1 flex items-center gap-2">
          <IconAction label={`Previous ${label} ${itemNoun}`} treatment="quiet" tipAlign="start" onClick={() => go(-1)}>
            <ChevronLeft aria-hidden="true" />
          </IconAction>
          <IconAction label={`Next ${label} ${itemNoun}`} treatment="quiet" tipAlign="end" onClick={() => go(1)}>
            <ChevronRight aria-hidden="true" />
          </IconAction>
        </div>
      ) : null}
    </div>
  )
}
