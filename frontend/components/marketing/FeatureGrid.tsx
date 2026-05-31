'use client'

import { motion, useReducedMotion } from 'framer-motion'
import {
  GitBranch,
  BarChart3,
  Gauge,
  Search,
  Code2,
  TerminalSquare,
  type LucideIcon,
} from 'lucide-react'
import { staggerGrid, scaleIn, fadeOnly } from '@/components/marketing/motion/variants'
import { MagneticGlowCard } from '@/components/marketing/MagneticGlowCard'

interface Feature {
  icon: LucideIcon
  title: string
  description: string
  /** token name for the accent, e.g. 'kind-retrieval' */
  accent: string
}

const FEATURES: Feature[] = [
  {
    icon: GitBranch,
    title: 'Trace timelines',
    description: 'Every request becomes a replayable trace with full timing and metadata.',
    accent: 'kind-retrieval',
  },
  {
    icon: BarChart3,
    title: 'Span waterfalls',
    description: 'See retrieval, model calls, and tools laid out on a precise timeline.',
    accent: 'kind-llm',
  },
  {
    icon: Gauge,
    title: 'Evaluation scoring',
    description: 'Track relevance, faithfulness, and groundedness on every answer.',
    accent: 'kind-evaluation',
  },
  {
    icon: Search,
    title: 'Metadata search',
    description: 'Attach structured metadata to traces and spans for fast triage.',
    accent: 'kind-tool',
  },
  {
    icon: Code2,
    title: 'Python SDK',
    description: 'A context-manager API that captures traces and spans automatically.',
    accent: 'brand',
  },
  {
    icon: TerminalSquare,
    title: 'Local-first workflow',
    description: 'Runs in Docker on your machine — no vendor lock-in, no data leaving your box.',
    accent: 'kind-function',
  },
]

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon
  const accent = `hsl(var(--${feature.accent}))`

  return (
    <motion.div variants={scaleIn}>
      <MagneticGlowCard className="h-full p-5 transition-colors hover:border-border/80">
        {/* Hover glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: accent }}
        />
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
          style={{ backgroundColor: `hsl(var(--${feature.accent}) / 0.15)` }}
        >
          <Icon className="h-4.5 w-4.5" style={{ color: accent, width: 18, height: 18 }} />
        </div>
        <h3 className="mt-4 font-semibold">{feature.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {feature.description}
        </p>
      </MagneticGlowCard>
    </motion.div>
  )
}

export function FeatureGrid() {
  const reduced = useReducedMotion()

  return (
    <section id="features" className="border-t border-border/40 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Why TraceLens
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything you need to observe AI systems.
        </h2>

        <motion.div
          variants={reduced ? fadeOnly : staggerGrid}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} feature={f} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
