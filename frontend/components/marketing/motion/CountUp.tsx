'use client'

import { useEffect, useRef, useState } from 'react'
import {
  useInView,
  useReducedMotion,
  animate,
} from 'framer-motion'

interface CountUpProps {
  /** Final numeric value. */
  value: number
  /** Optional suffix (e.g. "%"). */
  suffix?: string
  /** Optional prefix. */
  prefix?: string
  /** Animation duration in seconds. */
  duration?: number
  className?: string
}

/**
 * Counts up to `value` once it scrolls into view. Uses Framer Motion's `animate`
 * to drive a tween. Under reduced motion (or for non-numeric callers) it just
 * shows the final value immediately.
 */
export function CountUp({
  value,
  suffix = '',
  prefix = '',
  duration = 1.2,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(reduced ? value : 0)

  useEffect(() => {
    if (!inView || reduced) return
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, reduced, value, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  )
}
