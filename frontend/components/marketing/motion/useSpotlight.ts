'use client'

import { useCallback, type PointerEvent } from 'react'

/**
 * Pointer-follow spotlight helper. Returns an onPointerMove handler that writes
 * the cursor position (as percentages) into `--mx` / `--my` CSS variables on the
 * target element. Pair with the `.spotlight-surface` utility, which reads those
 * vars to position a soft radial highlight that tracks the cursor.
 */
export function useSpotlight() {
  const onPointerMove = useCallback((e: PointerEvent<HTMLElement>) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width) * 100
    const my = ((e.clientY - rect.top) / rect.height) * 100
    el.style.setProperty('--mx', `${mx}%`)
    el.style.setProperty('--my', `${my}%`)
  }, [])

  return { onPointerMove }
}
