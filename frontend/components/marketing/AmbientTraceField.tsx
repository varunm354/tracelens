'use client'

import { useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'

/**
 * Page-wide ambient background for the marketing route group.
 *
 * Renders a single fixed, full-viewport, pointer-events-none layer that sits
 * behind all page content (the body paints the base color). It combines:
 *   - a faint grid texture
 *   - slow drifting gradient orbs (brand / retrieval / evaluation tints)
 *   - fine grain to kill gradient banding
 *   - a sparse field of tiny "trace nodes"
 *   - one or two faint SVG trace paths suggesting data flow
 *
 * The goal is to make the empty space between sections feel intentional —
 * like data quietly flowing through an observability system — without ever
 * competing with the foreground copy. Everything that loops is frozen under
 * `prefers-reduced-motion`.
 */

// Deterministic PRNG so SSR and client markup match exactly (no hydration mismatch).
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

export function AmbientTraceField() {
  const reduced = useReducedMotion()

  const nodes = useMemo(() => {
    const rand = seeded(73)
    return Array.from({ length: 22 }, (_, i) => ({
      id: i,
      left: rand() * 100,
      top: rand() * 100,
      size: 1.5 + rand() * 2.5,
      dur: 9 + rand() * 10,
      delay: -rand() * 12,
      opacity: 0.12 + rand() * 0.3,
      accent: rand() > 0.7 ? 'kind-retrieval' : rand() > 0.5 ? 'kind-evaluation' : 'brand',
    }))
  }, [])

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Faint grid texture, dissolving toward the edges */}
      <div className="absolute inset-0 bg-grid opacity-[0.18] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_30%,#000_30%,transparent_85%)]" />

      {/* Slow drifting gradient orbs for depth */}
      <div
        className={`absolute left-[-10%] top-[8%] h-[34rem] w-[34rem] rounded-full blur-3xl ${reduced ? '' : 'animate-glow-drift-slow'}`}
        style={{
          background: 'radial-gradient(circle, hsl(var(--brand) / 0.10), transparent 65%)',
        }}
      />
      <div
        className={`absolute right-[-8%] top-[42%] h-[30rem] w-[30rem] rounded-full blur-3xl ${reduced ? '' : 'animate-glow-drift-slow'}`}
        style={{
          animationDelay: '-11s',
          background: 'radial-gradient(circle, hsl(var(--kind-retrieval) / 0.09), transparent 65%)',
        }}
      />
      <div
        className={`absolute bottom-[4%] left-[30%] h-[28rem] w-[28rem] rounded-full blur-3xl ${reduced ? '' : 'animate-glow-drift'}`}
        style={{
          background: 'radial-gradient(circle, hsl(var(--kind-evaluation) / 0.08), transparent 65%)',
        }}
      />

      {/* Two faint trace paths suggesting data flow across the page */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.5]"
        preserveAspectRatio="none"
        viewBox="0 0 1440 1600"
        fill="none"
      >
        <path
          d="M -50 220 C 380 120, 520 360, 900 280 S 1500 240, 1500 240"
          stroke="hsl(var(--brand))"
          strokeOpacity="0.12"
          strokeWidth="1.25"
          fill="none"
          strokeDasharray="3 9"
          className={reduced ? '' : 'animate-trace-flow'}
        />
        <path
          d="M -50 1080 C 300 1180, 700 980, 1040 1120 S 1500 1040, 1500 1040"
          stroke="hsl(var(--kind-retrieval))"
          strokeOpacity="0.10"
          strokeWidth="1.25"
          fill="none"
          strokeDasharray="3 9"
          className={reduced ? '' : 'animate-trace-flow'}
          style={{ animationDelay: '-6s', animationDirection: 'reverse' }}
        />
      </svg>

      {/* Sparse drifting trace nodes */}
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
            backgroundColor: `hsl(var(--${n.accent}))`,
            opacity: n.opacity,
            boxShadow: `0 0 ${n.size * 3}px hsl(var(--${n.accent}) / 0.6)`,
            ['--float-dur' as string]: `${n.dur}s`,
            ['--float-delay' as string]: `${n.delay}s`,
          }}
        />
      ))}

      {/* Fine grain to remove banding */}
      <div className="absolute inset-0 bg-noise opacity-[0.12] mix-blend-soft-light" />
    </div>
  )
}
