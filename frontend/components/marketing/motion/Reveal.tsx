'use client'

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { fadeUp, fadeOnly } from '@/components/marketing/motion/variants'

interface RevealProps {
  children: ReactNode
  className?: string
  /** Delay before this element's reveal begins (seconds). */
  delay?: number
  /** Render as a different element if needed (defaults to div). */
  as?: 'div' | 'section' | 'li' | 'span'
}

/**
 * Reusable scroll-reveal wrapper.
 * Animates children in (fade + rise) the first time they enter the viewport.
 * When the user prefers reduced motion, falls back to an opacity-only fade
 * with no transform.
 */
export function Reveal({ children, className, delay = 0, as = 'div' }: RevealProps) {
  const prefersReduced = useReducedMotion()
  const variants = prefersReduced ? fadeOnly : fadeUp

  const MotionTag = motion[as]

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      transition={delay ? { delay } : undefined}
    >
      {children}
    </MotionTag>
  )
}
