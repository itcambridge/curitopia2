'use client'

import { useLayoutEffect, useRef, useState } from 'react'

// `once` plays the first time `active` becomes true and stays quiet for the
// rest of this mount. `each` plays on every new entry, which is how Compare
// starts again after the pair is cleared without replaying a swap.
export function useArrivalCue(active: boolean, mode: 'once' | 'each') {
  const consumed = useRef(false)
  const [show, setShow] = useState(false)

  useLayoutEffect(() => {
    if (!active) {
      setShow(false)
      if (mode === 'each') consumed.current = false
      return
    }
    if (consumed.current) return
    consumed.current = true
    setShow(true)
  }, [active, mode])

  return [show, () => setShow(false)] as const
}
