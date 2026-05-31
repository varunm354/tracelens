'use client'

import { useId } from 'react'
import { useReducedMotion } from 'framer-motion'

/**
 * Decorative animated "trace path": a faint curved SVG line with a brighter
 * pulse of light continuously flowing along it (via an animated dash). Evokes
 * data moving through a pipeline. Sits in section backgrounds.
 *
 * Under reduced motion the flow stops but the static path still renders.
 */

interface TraceBeamProps {
  /** SVG path `d`. Defaults to a gentle left-to-right sweep. */
  d?: string
  /** Token name for the beam color. */
  accent?: string
  className?: string
  /** Seconds for one full travel of the pulse. */
  duration?: number
  delay?: number
}

export function TraceBeam({
  d = 'M -50 60 C 200 10, 400 120, 650 50 S 1050 20, 1300 90',
  accent = 'brand',
  className,
  duration = 4.5,
  delay = 0,
}: TraceBeamProps) {
  const reduced = useReducedMotion()
  const id = useId().replace(/:/g, '')
  const gradId = `beam-grad-${id}`

  return (
    <svg
      aria-hidden
      className={`pointer-events-none absolute ${className ?? ''}`}
      viewBox="0 0 1280 140"
      fill="none"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={`hsl(var(--${accent}))`} stopOpacity="0" />
          <stop offset="50%" stopColor={`hsl(var(--${accent}))`} stopOpacity="1" />
          <stop offset="100%" stopColor={`hsl(var(--${accent}))`} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Faint base track */}
      <path
        d={d}
        stroke={`hsl(var(--${accent}))`}
        strokeOpacity="0.14"
        strokeWidth="1.5"
        fill="none"
      />

      {/* Traveling pulse of light along the same path */}
      {!reduced && (
        <path
          d={d}
          stroke={`url(#${gradId})`}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          pathLength={1}
          style={{
            strokeDasharray: '0.12 0.88',
            animation: `beam-travel-${id} ${duration}s linear ${delay}s infinite`,
          }}
        />
      )}

      <style>{`
        @keyframes beam-travel-${id} {
          from { stroke-dashoffset: 1; }
          to   { stroke-dashoffset: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes beam-travel-${id} { from {} to {} }
        }
      `}</style>
    </svg>
  )
}
