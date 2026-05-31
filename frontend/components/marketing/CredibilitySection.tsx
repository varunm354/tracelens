'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Server, Code2, LayoutDashboard, Container, type LucideIcon } from 'lucide-react'
import { staggerGrid, scaleIn, fadeOnly } from '@/components/marketing/motion/variants'
import { MagneticGlowCard } from '@/components/marketing/MagneticGlowCard'

/**
 * Portfolio-honest credibility band. No fake customers or logos — just the
 * real architecture that makes TraceLens serious, presented as connected
 * infrastructure blocks (FastAPI → SDK → dashboard → Docker) wired together
 * by an animated trace rail so it reads like a real system diagram.
 */

interface StackBlock {
  icon: LucideIcon
  label: string
  sub: string
  accent: string
}

const STACK: StackBlock[] = [
  { icon: Server, label: 'FastAPI backend', sub: 'Typed REST API + PostgreSQL', accent: 'kind-retrieval' },
  { icon: Code2, label: 'Python SDK', sub: 'Context-manager instrumentation', accent: 'kind-llm' },
  { icon: LayoutDashboard, label: 'Next.js dashboard', sub: 'TanStack Query + Tailwind', accent: 'brand' },
  { icon: Container, label: 'Dockerized workflow', sub: 'Runs locally, no lock-in', accent: 'kind-evaluation' },
]

export function CredibilitySection() {
  const reduced = useReducedMotion()

  return (
    <section className="border-t border-border/40 px-6 py-20">
      <div className="mx-auto max-w-6xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Built for modern RAG debugging
        </p>
        <h2 className="mx-auto mt-3 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
          A real stack, end to end.
        </h2>

        <div className="relative mt-12">
          {/* Connecting rail (desktop): spans from the center of the first block
              to the center of the last, with a faint track + flowing pulse. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-[12.5%] top-[1.6rem] hidden lg:block"
          >
            <svg
              className="h-2 w-full"
              viewBox="0 0 100 2"
              preserveAspectRatio="none"
              fill="none"
            >
              <line
                x1="0"
                y1="1"
                x2="100"
                y2="1"
                stroke="hsl(var(--border))"
                strokeWidth="0.5"
              />
              <line
                x1="0"
                y1="1"
                x2="100"
                y2="1"
                stroke="hsl(var(--brand))"
                strokeWidth="0.5"
                strokeOpacity="0.7"
                strokeDasharray="4 8"
                className={reduced ? '' : 'animate-trace-flow'}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>

          {/* Node ports aligned to each column center (desktop) */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-[1.1rem] hidden grid-cols-4 lg:grid"
          >
            {STACK.map((s, i) => (
              <div key={i} className="flex justify-center">
                <span
                  className="h-3 w-3 rounded-full border-2"
                  style={{
                    borderColor: `hsl(var(--${s.accent}))`,
                    backgroundColor: 'hsl(var(--background))',
                    boxShadow: `0 0 10px hsl(var(--${s.accent}) / 0.6)`,
                  }}
                />
              </div>
            ))}
          </div>

          <motion.div
            variants={reduced ? fadeOnly : staggerGrid}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid gap-4 sm:grid-cols-2 lg:mt-8 lg:grid-cols-4"
          >
            {STACK.map(({ icon: Icon, label, sub, accent }) => (
              <motion.div key={label} variants={scaleIn}>
                <MagneticGlowCard className="h-full p-5 text-left" lift={3}>
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `hsl(var(--${accent}) / 0.15)` }}
                  >
                    <Icon className="h-4.5 w-4.5" style={{ color: `hsl(var(--${accent}))`, width: 18, height: 18 }} />
                  </div>
                  <p className="mt-3 font-medium">{label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
                </MagneticGlowCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
