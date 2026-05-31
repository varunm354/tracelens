'use client'

import { useRef, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface MagneticGlowCardProps {
  children: ReactNode
  className?: string
  /** Lift distance on hover (px). Set 0 to disable the lift. */
  lift?: number
}

/**
 * Premium hover card: a pointer-following spotlight (via CSS `--mx/--my`),
 * an animated conic border glow, and a subtle lift. Combines the
 * `.spotlight-surface` and `.border-glow` utilities from globals.css with a
 * tiny pointer handler that writes the cursor position into CSS variables.
 *
 * Under reduced motion the pointer tracking and lift are skipped (the static
 * card styling remains).
 */
export function MagneticGlowCard({ children, className, lift = 4 }: MagneticGlowCardProps) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)

  function handlePointer(e: React.PointerEvent<HTMLDivElement>) {
    if (reduced || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    ref.current.style.setProperty('--mx', `${e.clientX - rect.left}px`)
    ref.current.style.setProperty('--my', `${e.clientY - rect.top}px`)
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={handlePointer}
      whileHover={reduced || !lift ? undefined : { y: -lift }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={cn(
        'spotlight-surface border-glow group relative overflow-hidden rounded-xl border border-border bg-card/50',
        className,
      )}
    >
      {children}
    </motion.div>
  )
}
