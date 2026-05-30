import type { Metadata } from 'next'
import { Reveal } from '@/components/marketing/motion/Reveal'

export const metadata: Metadata = {
  title: 'TraceLens — Observability for RAG & AI agents',
  description:
    'Open-source tracing and evaluation for RAG and AI agent systems. Trace every request, inspect every span, and score answer quality.',
}

/**
 * Placeholder landing page (Phase 8.1).
 * Establishes the final section order with labeled placeholder blocks.
 * Real content + animation arrive in Phases 8.2–8.5.
 */

interface PlaceholderProps {
  id: string
  eyebrow: string
  title: string
  note: string
  /** Larger min-height for the hero so the page reads like a real landing layout. */
  tall?: boolean
}

function SectionPlaceholder({ id, eyebrow, title, note, tall }: PlaceholderProps) {
  return (
    <section
      id={id}
      className="border-b border-border/40 px-6 py-24"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </p>
          <h2
            className={
              tall
                ? 'mt-4 text-4xl font-semibold tracking-tight sm:text-5xl'
                : 'mt-3 text-2xl font-semibold tracking-tight sm:text-3xl'
            }
          >
            {title}
          </h2>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground">{note}</p>
          <div
            className={
              tall
                ? 'mt-10 flex min-h-[18rem] items-center justify-center rounded-xl border border-dashed border-border bg-card/40'
                : 'mt-8 flex min-h-[12rem] items-center justify-center rounded-xl border border-dashed border-border bg-card/40'
            }
          >
            <span className="font-mono text-xs text-muted-foreground/60">
              {title} — placeholder
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default function LandingPage() {
  return (
    <>
      <SectionPlaceholder
        id="hero"
        eyebrow="AI Observability"
        title="See inside your AI systems."
        note="Hero section — headline, subheadline, dual CTA, and an animated request → trace visual land here in Phase 8.2."
        tall
      />
      <SectionPlaceholder
        id="trace-story"
        eyebrow="How it works"
        title="From request to scored answer."
        note="Animated trace story: request → retrieval → LLM → evaluation → waterfall. Phase 8.3."
      />
      <SectionPlaceholder
        id="dashboard"
        eyebrow="The product"
        title="A dashboard built for debugging AI."
        note="Dashboard showcase: framed browser window with spotlight glow over the real /traces UI. Phase 8.3."
      />
      <SectionPlaceholder
        id="sdk"
        eyebrow="Integration"
        title="Instrument your pipeline in three lines."
        note="SDK section: animated code block for `with tracelens.trace(...)`. Phase 8.3."
      />
      <SectionPlaceholder
        id="evaluation"
        eyebrow="Quality"
        title="Quality you can measure."
        note="Evaluation section: relevance, faithfulness, groundedness with animated gauges. Phase 8.4."
      />
      <SectionPlaceholder
        id="features"
        eyebrow="Why TraceLens"
        title="Everything you need to observe AI systems."
        note="Feature grid: traces, spans, evaluations, waterfall timelines, SDK, RAG/agent debugging. Phase 8.4."
      />
      <SectionPlaceholder
        id="cta"
        eyebrow="Get started"
        title="Start tracing AI systems."
        note="Final CTA: primary link to the dashboard, secondary link to GitHub. Phase 8.4."
      />
    </>
  )
}
