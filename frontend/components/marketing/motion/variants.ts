import type { Variants } from 'framer-motion'

/**
 * Shared Framer Motion variants for the marketing landing page.
 * Centralizing timing/easing here keeps every section's reveal consistent.
 * Framer Motion is intentionally imported only under components/marketing/**.
 */

// Standard ease-out curve used across all reveals.
const EASE = [0.16, 1, 0.3, 1] as const

/** Fade + rise. Applied to a single element entering the viewport. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE },
  },
}

/**
 * Container that staggers its direct children's reveals.
 * Pair with `fadeUp` (or any item variant) on the children.
 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

/** Reduced-motion equivalent: opacity only, no transform, near-instant. */
export const fadeOnly: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
}
