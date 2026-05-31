'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Eye, Activity } from 'lucide-react'
import { Reveal } from '@/components/marketing/motion/Reveal'
import { cn } from '@/lib/utils'

/**
 * A CSS/Tailwind recreation of the TraceLens dashboard (not a screenshot),
 * framed in a browser window. Mirrors the real product's layout: sidebar,
 * trace list, trace detail with a span waterfall and evaluation score cards.
 *
 * Bars animate from 0 to their final width when the panel enters the viewport.
 */

const TRACE_ROWS = [
  { name: 'rag.answer_question', id: 'a3f1c2d4', active: true },
  { name: 'agent.plan_steps', id: '7b2e9f01', active: false },
  { name: 'rag.summarize_doc', id: 'c5d8a6b2', active: false },
  { name: 'tool.web_search', id: '1f4e2a9c', active: false },
]

const WATERFALL = [
  { kind: 'retrieval', label: 'retrieval', offset: 0, width: 32 },
  { kind: 'llm', label: 'llm.call', offset: 34, width: 52 },
  { kind: 'evaluation', label: 'evaluation', offset: 88, width: 9 },
] as const

const SCORE_CARDS = [
  { label: 'Relevance', value: 92 },
  { label: 'Faithfulness', value: 88 },
  { label: 'Groundedness', value: 95 },
]

function Bar({ offset, width, color, animate }: { offset: number; width: number; color: string; animate: boolean }) {
  return (
    <div className="relative h-3 flex-1 overflow-hidden rounded bg-muted/40">
      <motion.div
        className="absolute h-full rounded"
        style={{ left: `${offset}%`, backgroundColor: color }}
        initial={animate ? { width: 0 } : false}
        whileInView={{ width: `${width}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  )
}

export function DashboardPreview() {
  const reduced = useReducedMotion()
  const animate = !reduced

  return (
    <section id="dashboard" className="border-t border-border/40 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            The product
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            A dashboard built for debugging AI.
          </h2>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground">
            Inspect every trace, replay every span, and read evaluation scores at a glance —
            the same interface that ships at <span className="font-mono">/traces</span>.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-10">
          <div className="relative">
            {/* Spotlight glow behind the frame */}
            <div
              aria-hidden
              className="absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[3rem] opacity-50 blur-3xl"
              style={{
                background:
                  'radial-gradient(circle at 50% 0%, hsl(var(--brand) / 0.2), transparent 60%)',
              }}
            />

            {/* Browser frame */}
            <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
              {/* Slow scan/highlight sweeping down the preview */}
              {!reduced && (
                <div
                  aria-hidden
                  className="animate-scan pointer-events-none absolute inset-x-0 top-0 z-20 h-24"
                  style={{
                    background:
                      'linear-gradient(to bottom, transparent, hsl(var(--brand) / 0.07), transparent)',
                  }}
                />
              )}
              {/* Chrome */}
              <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                <div className="mx-auto flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-1">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    tracelens.dev/traces
                  </span>
                </div>
              </div>

              {/* App body */}
              <div className="flex h-[26rem] text-xs">
                {/* Sidebar */}
                <div className="hidden w-44 shrink-0 flex-col border-r border-border bg-card sm:flex">
                  <div className="flex items-center gap-2 border-b border-border px-3 py-3">
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-md"
                      style={{ backgroundColor: 'hsl(var(--brand) / 0.15)' }}
                    >
                      <Eye className="h-3.5 w-3.5" style={{ color: 'hsl(var(--brand))' }} />
                    </div>
                    <span className="text-sm font-semibold">TraceLens</span>
                  </div>
                  <div className="px-2 py-3">
                    <div
                      className="flex items-center gap-2 rounded-md px-2.5 py-1.5"
                      style={{ backgroundColor: 'hsl(var(--accent))' }}
                    >
                      <Activity className="h-3.5 w-3.5" style={{ color: 'hsl(var(--brand))' }} />
                      <span className="font-medium">Traces</span>
                      <span
                        className="ml-auto h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: 'hsl(var(--brand))' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Trace list */}
                <div className="hidden w-56 shrink-0 flex-col border-r border-border md:flex">
                  <div className="border-b border-border px-3 py-2.5 font-medium text-muted-foreground">
                    Traces
                  </div>
                  <div className="flex-1">
                    {TRACE_ROWS.map((row) => (
                      <div
                        key={row.id}
                        className={cn(
                          'group relative flex flex-col gap-0.5 border-b border-border px-3 py-2.5 transition-colors hover:bg-muted/40',
                          row.active && 'bg-muted/40',
                        )}
                        style={
                          row.active
                            ? { boxShadow: 'inset 2px 0 0 hsl(var(--brand))' }
                            : undefined
                        }
                      >
                        {row.active && (
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0"
                            style={{
                              background:
                                'linear-gradient(to right, hsl(var(--brand) / 0.10), transparent 70%)',
                            }}
                          />
                        )}
                        <span className="flex items-center gap-1.5 font-medium text-foreground/90">
                          {row.name}
                          {row.active && (
                            <span className="relative flex h-1.5 w-1.5">
                              {!reduced && (
                                <span
                                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                                  style={{ backgroundColor: 'hsl(var(--brand))' }}
                                />
                              )}
                              <span
                                className="relative inline-flex h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: 'hsl(var(--brand))' }}
                              />
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {row.id}…
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detail panel */}
                <div className="flex-1 overflow-hidden p-4">
                  <div className="text-sm font-semibold">rag.answer_question</div>
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                    a3f1c2d4-0000-0000-0000-000000000000 · 920ms
                  </div>

                  {/* Overview stats */}
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[
                      { label: 'Duration', value: '920ms' },
                      { label: 'Spans', value: '3' },
                      { label: 'Avg Score', value: '92%' },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg border border-border px-2.5 py-2">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                          {s.label}
                        </p>
                        <p className="mt-0.5 font-mono text-sm font-semibold">{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Waterfall */}
                  <div className="mt-4 space-y-2 rounded-lg border border-border p-3">
                    {WATERFALL.map((s) => (
                      <div key={s.label} className="flex items-center gap-2">
                        <span className="w-16 shrink-0 font-mono text-[10px] text-muted-foreground">
                          {s.label}
                        </span>
                        <Bar
                          offset={s.offset}
                          width={s.width}
                          color={`hsl(var(--kind-${s.kind}))`}
                          animate={animate}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Evaluation cards */}
                  <div className="mt-3 space-y-1.5 rounded-lg border border-border p-3">
                    {SCORE_CARDS.map((s) => (
                      <div key={s.label} className="flex items-center gap-2">
                        <span className="w-20 shrink-0 text-[10px] text-muted-foreground">
                          {s.label}
                        </span>
                        <Bar
                          offset={0}
                          width={s.value}
                          color="hsl(var(--score-pass))"
                          animate={animate}
                        />
                        <span
                          className="w-8 text-right font-mono text-[10px] font-semibold"
                          style={{ color: 'hsl(var(--score-pass))' }}
                        >
                          {s.value}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
