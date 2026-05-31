'use client'

import { useRef, useState } from 'react'
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  useMotionValueEvent,
} from 'framer-motion'
import { cn } from '@/lib/utils'
import { ScrollTraceSystem } from '@/components/marketing/ScrollTraceSystem'

/**
 * Sticky scrollytelling section — the product's core story.
 *
 * As the user scrolls through a tall container, a pinned panel on the right
 * builds a single trace from request → spans → evaluation (see
 * `ScrollTraceSystem`), while the matching step text highlights on the left:
 *   1. Capture the request
 *   2. Break it into spans
 *   3. Score the result
 *
 * The right visual is intentionally dominant (wider column) and scroll-linked,
 * so the section reads like an animated product demo rather than three cards.
 *
 * Reduced motion / mobile: falls back to a plain stacked layout (all steps +
 * fully-built visuals shown statically, no pinning, no scroll math).
 */

const STEPS = [
  {
    title: 'Capture the request',
    body: 'Every call into your RAG or agent pipeline becomes a trace — with metadata, timing, and context attached automatically.',
  },
  {
    title: 'Break it into spans',
    body: 'Each trace splits into spans: retrieval, model calls, tools, and evaluation. See exactly where time goes, step by step.',
  },
  {
    title: 'Score the result',
    body: 'Attach evaluation scores — relevance, faithfulness, groundedness — so you can measure answer quality, not just latency.',
  },
]

// --- Reduced-motion / mobile-friendly stacked layout ----------------------

const SPANS = [
  { kind: 'retrieval', label: 'retrieval', offset: 0, width: 34 },
  { kind: 'llm', label: 'llm.call', offset: 36, width: 58 },
  { kind: 'evaluation', label: 'evaluation', offset: 88, width: 14 },
] as const

const SCORES = [
  { label: 'Relevance', value: 92 },
  { label: 'Faithfulness', value: 88 },
  { label: 'Groundedness', value: 95 },
]

function StaticStep({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="rounded-xl border border-border bg-background/60 p-4">
        <div className="flex items-center gap-2">
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
            style={{ backgroundColor: 'hsl(var(--brand) / 0.15)', color: 'hsl(var(--brand))' }}
          >
            POST
          </span>
          <span className="font-mono text-xs text-foreground/80">/v1/answer</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {['user_id: u_demo', 'env: prod', 'top_k: 5'].map((c) => (
            <span
              key={c}
              className="rounded-md border border-border bg-card/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    )
  }
  if (index === 1) {
    return (
      <div className="space-y-2.5 rounded-xl border border-border bg-background/60 p-4">
        {SPANS.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <span className="w-20 shrink-0 font-mono text-[11px] text-muted-foreground">
              {s.label}
            </span>
            <div className="relative h-3.5 flex-1 overflow-hidden rounded bg-muted/40">
              <div
                className="absolute h-full rounded"
                style={{
                  left: `${s.offset}%`,
                  width: `${s.width}%`,
                  backgroundColor: `hsl(var(--kind-${s.kind}))`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="space-y-3 rounded-xl border border-border bg-background/60 p-4">
      {SCORES.map((s) => (
        <div key={s.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-sm text-muted-foreground">{s.label}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/50">
            <div
              className="h-full rounded-full"
              style={{ width: `${s.value}%`, backgroundColor: 'hsl(var(--score-pass))' }}
            />
          </div>
          <span
            className="w-9 text-right font-mono text-sm font-semibold"
            style={{ color: 'hsl(var(--score-pass))' }}
          >
            {s.value}%
          </span>
        </div>
      ))}
    </div>
  )
}

function StackedLayout() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {STEPS.map((s, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card/40 p-6">
          <p className="font-mono text-xs text-muted-foreground">Step {i + 1}</p>
          <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
          <div className="mt-5">
            <StaticStep index={i} />
          </div>
        </div>
      ))}
    </div>
  )
}

// --- Main component -------------------------------------------------------

export function ScrollytellingTrace() {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })

  // Remap the raw 0..1 progress into a slightly compressed 0..1 window so the
  // build completes a touch before the very end (feels less abrupt on release).
  const progress = useTransform(scrollYProgress, [0.02, 0.95], [0, 1])

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const next = v < 0.34 ? 0 : v < 0.66 ? 1 : 2
    setActive((prev) => (prev === next ? prev : next))
  })

  return (
    <section id="trace-story" className="relative border-t border-border/40 px-6 py-24">
      <div className="mx-auto mb-4 max-w-6xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          How it works
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Request → Trace → Insight
        </h2>
      </div>

      {reduced ? (
        <div className="mt-10">
          <StackedLayout />
        </div>
      ) : (
        // Tall scroll container; the inner panel pins while we scroll through it.
        <div ref={ref} className="relative mx-auto max-w-6xl" style={{ height: '320vh' }}>
          <div className="sticky top-0 flex min-h-screen items-center py-16">
            <div className="grid w-full items-center gap-10 lg:grid-cols-[0.78fr_1.22fr]">
              {/* Left: step text */}
              <div className="space-y-8">
                {STEPS.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActive(i)}
                    className={cn(
                      'block w-full text-left transition-all duration-300',
                      active === i ? 'opacity-100' : 'opacity-40 hover:opacity-70',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-full border font-mono text-xs transition-colors',
                          active === i
                            ? 'border-transparent text-white'
                            : 'border-border text-muted-foreground',
                        )}
                        style={
                          active === i
                            ? {
                                backgroundColor: 'hsl(var(--brand))',
                                boxShadow: '0 0 16px hsl(var(--brand) / 0.5)',
                              }
                            : undefined
                        }
                      >
                        {i + 1}
                      </span>
                      <h3 className="text-xl font-semibold">{s.title}</h3>
                    </div>
                    <p className="mt-2 pl-10 text-sm leading-relaxed text-muted-foreground">
                      {s.body}
                    </p>
                    {/* Per-step progress underline */}
                    <div className="mt-3 ml-10 h-px w-full max-w-xs overflow-hidden rounded-full bg-border">
                      <motion.div
                        className="h-full origin-left rounded-full"
                        style={{
                          backgroundColor: 'hsl(var(--brand))',
                          scaleX: active === i ? 1 : 0,
                          transformOrigin: 'left',
                        }}
                        initial={false}
                        animate={{ scaleX: active === i ? 1 : 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </button>
                ))}
              </div>

              {/* Right: dominant, scroll-linked building trace */}
              <div className="relative">
                <ScrollTraceSystem progress={progress} />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
