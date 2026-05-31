'use client'

import { useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'

/**
 * Ambient floating "trace nodes" rendered as soft glowing dots that drift
 * vertically at varying speeds. Purely decorative depth layer for section
 * backgrounds. Deterministic layout (seeded) so SSR and client match.
 *
 * Disabled entirely under reduced-motion (renders a static, faint field).
 */

interface FloatingNodesProps {
  /** How many nodes to scatter. */
  count?: number
  /** Token name for the node color (e.g. 'brand', 'kind-retrieval'). */
  accent?: string
  className?: string
}

// Tiny deterministic PRNG so node positions are stable between renders.
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

export function FloatingNodes({
  count = 18,
  accent = 'brand',
  className,
}: FloatingNodesProps) {
  const reduced = useReducedMotion()

  const nodes = useMemo(() => {
    const rand = seeded(count * 1337)
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: rand() * 100,
      top: rand() * 100,
      size: 2 + rand() * 4,
      dur: 7 + rand() * 8,
      delay: -rand() * 8,
      opacity: 0.25 + rand() * 0.5,
    }))
  }, [count])

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}
    >
      {nodes.map((n) => (
        <span
          key={n.id}
          className={reduced ? '' : 'animate-node-float'}
          style={{
            position: 'absolute',
            left: `${n.left}%`,
            top: `${n.top}%`,
            width: n.size,
            height: n.size,
            borderRadius: '9999px',
            backgroundColor: `hsl(var(--${accent}))`,
            opacity: n.opacity,
            boxShadow: `0 0 ${n.size * 3}px hsl(var(--${accent}) / 0.7)`,
            // CSS vars consumed by the .animate-node-float keyframes
            ['--float-dur' as string]: `${n.dur}s`,
            ['--float-delay' as string]: `${n.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
