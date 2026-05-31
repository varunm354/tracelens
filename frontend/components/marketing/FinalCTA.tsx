'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Activity, Github } from 'lucide-react'
import { Reveal } from '@/components/marketing/motion/Reveal'

/**
 * Final call-to-action — the closing moment of the page. A large looping trace
 * path drifts behind a glowing grid, a compact "request → trace → score" motif
 * restates the product story one last time, and the primary actions point to
 * the dashboard and GitHub.
 */

const MOTIF = [
  { label: 'request', accent: 'brand' },
  { label: 'trace', accent: 'kind-retrieval' },
  { label: 'score', accent: 'score-pass' },
] as const

export function FinalCTA() {
  const reduced = useReducedMotion()

  return (
    <section id="cta" className="relative overflow-hidden border-t border-border/40 px-6 py-28">
      {/* Background: grid + glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid mask-radial-faded opacity-40" />
        <div
          className="absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-3xl animate-glow-drift"
          style={{ background: 'radial-gradient(circle, hsl(var(--brand) / 0.25), transparent 60%)' }}
        />
      </div>

      {/* Big looping trace path drifting behind the CTA */}
      <svg
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[26rem] w-[52rem] max-w-[120%] -translate-x-1/2 -translate-y-1/2 opacity-50"
        viewBox="0 0 800 400"
        fill="none"
      >
        <defs>
          <linearGradient id="cta-loop-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--brand))" stopOpacity="0.7" />
            <stop offset="50%" stopColor="hsl(var(--kind-retrieval))" stopOpacity="0.7" />
            <stop offset="100%" stopColor="hsl(var(--kind-evaluation))" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        {/* Faint base loop */}
        <path
          d="M150 200 C 150 90, 650 90, 650 200 S 150 310, 150 200 Z"
          stroke="hsl(var(--brand))"
          strokeOpacity="0.12"
          strokeWidth="1.5"
          fill="none"
        />
        {/* Flowing pulse traveling around the loop */}
        <path
          d="M150 200 C 150 90, 650 90, 650 200 S 150 310, 150 200 Z"
          stroke="url(#cta-loop-grad)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          strokeDasharray="120 900"
          className={reduced ? '' : 'animate-trace-flow'}
        />
      </svg>

      <div className="mx-auto max-w-2xl text-center">
        <Reveal>
          <Activity className="mx-auto h-8 w-8" style={{ color: 'hsl(var(--brand))' }} />
          <h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            See what your AI system is actually doing.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground">
            Open the dashboard and start tracing requests, spans, and evaluation
            scores across your RAG and agent pipelines.
          </p>

          {/* request → trace → score motif */}
          <div className="mt-8 flex items-center justify-center gap-2 sm:gap-3">
            {MOTIF.map((m, i) => (
              <div key={m.label} className="flex items-center gap-2 sm:gap-3">
                <motion.span
                  initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 font-mono text-xs backdrop-blur-sm"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: `hsl(var(--${m.accent}))`,
                      boxShadow: `0 0 8px hsl(var(--${m.accent}) / 0.7)`,
                    }}
                  />
                  {m.label}
                </motion.span>
                {i < MOTIF.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/traces"
              className="btn-sheen group inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:scale-[1.02]"
              style={{
                backgroundColor: 'hsl(var(--brand))',
                boxShadow: '0 8px 30px hsl(var(--brand) / 0.35)',
              }}
            >
              Open dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="https://github.com/varunm354/tracelens"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card/60 px-6 py-3 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-accent"
            >
              <Github className="h-4 w-4" />
              View GitHub
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
