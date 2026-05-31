'use client'

import { Fragment, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, Zap } from 'lucide-react'
import { Reveal } from '@/components/marketing/motion/Reveal'

/**
 * SDK section: a premium, lightly syntax-highlighted Python code panel showing
 * how little code it takes to instrument a pipeline, plus an animated
 * "trace captured" badge and small metric cards.
 *
 * Syntax highlighting is a tiny, dependency-free tokenizer (no Prism/Shiki).
 */

const CODE = `from tracelens import TraceLens

client = TraceLens(api_url="http://localhost:8000")

with client.trace("rag.answer_question", metadata={"user_id": "u_demo"}) as trace:
    with trace.span("retrieval", metadata={"top_k": 5}):
        chunks = retrieve_chunks(question)

    with trace.span("llm.call", metadata={"model": "gpt-4o-mini"}):
        answer = generate_answer(question, chunks)

    trace.evaluate(
        relevance=0.92,
        faithfulness=0.88,
        groundedness=0.95,
        notes="Answer stayed grounded in retrieved chunks."
    )`

const KEYWORDS = new Set([
  'from', 'import', 'with', 'as', 'return', 'in', 'None', 'True', 'False',
])

const COLORS = {
  keyword: 'hsl(var(--kind-llm))',
  string: 'hsl(var(--kind-evaluation))',
  number: 'hsl(var(--kind-tool))',
  comment: 'hsl(var(--muted-foreground))',
  plain: 'hsl(var(--foreground) / 0.85)',
}

/** Tokenize one line into colored spans. Pure + XSS-safe (no innerHTML). */
function highlight(line: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(#.*$)|("(?:[^"\\]|\\.)*")|(\b\d+\.?\d*\b)|([A-Za-z_][A-Za-z0-9_]*)/g
  let last = 0
  let m: RegExpExecArray | null
  let key = 0

  while ((m = re.exec(line)) !== null) {
    if (m.index > last) {
      out.push(<Fragment key={key++}>{line.slice(last, m.index)}</Fragment>)
    }
    const [full, comment, str, num, word] = m
    let color = COLORS.plain
    if (comment) color = COLORS.comment
    else if (str) color = COLORS.string
    else if (num) color = COLORS.number
    else if (word && KEYWORDS.has(word)) color = COLORS.keyword
    else color = COLORS.plain

    out.push(
      <span key={key++} style={{ color }}>
        {full}
      </span>,
    )
    last = m.index + full.length
  }
  if (last < line.length) {
    out.push(<Fragment key={key++}>{line.slice(last)}</Fragment>)
  }
  return out
}

const METRICS = [
  { label: 'Lines to integrate', value: '3' },
  { label: 'Spans captured', value: '2' },
  { label: 'Avg score', value: '92%' },
]

// Tiny event log mirroring what the SDK emits as the code runs.
const EVENTS = [
  { method: 'POST', text: '/v1/traces', accent: 'brand' },
  { method: 'span', text: 'retrieval', accent: 'kind-retrieval' },
  { method: 'span', text: 'llm.call', accent: 'kind-llm' },
  { method: 'eval', text: 'avg 92%', accent: 'score-pass' },
] as const

export function SDKCodeSection() {
  const reduced = useReducedMotion()
  const lines = CODE.split('\n')

  return (
    <section id="sdk" className="border-t border-border/40 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Integration
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Instrument your pipeline in a few lines.
          </h2>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground">
            Wrap your RAG or agent calls in a trace and TraceLens captures the spans,
            metadata, and evaluation scores automatically.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Code panel */}
          <Reveal>
            <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-xl">
              {/* Header */}
              <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                  quickstart.py
                </span>
                {/* Animated "trace captured" badge */}
                <motion.span
                  initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6, type: 'spring', stiffness: 300, damping: 20 }}
                  className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium"
                  style={{
                    backgroundColor: 'hsl(var(--score-pass) / 0.15)',
                    color: 'hsl(var(--score-pass))',
                  }}
                >
                  <Check className="h-3 w-3" />
                  trace captured
                </motion.span>
              </div>

              {/* Code body */}
              <div className="overflow-x-auto p-4">
                <pre className="font-mono text-[12.5px] leading-relaxed">
                  <code>
                    {lines.map((line, i) => (
                      <div key={i} className="flex">
                        <span className="mr-4 w-6 shrink-0 select-none text-right text-muted-foreground/40">
                          {i + 1}
                        </span>
                        <span className="whitespace-pre">{highlight(line)}</span>
                      </div>
                    ))}
                  </code>
                </pre>
              </div>
            </div>
          </Reveal>

          {/* Metric cards + live event log */}
          <div className="flex h-full flex-col gap-4">
            <motion.div
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2 rounded-xl border border-border bg-card/50 px-4 py-3"
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: 'hsl(var(--brand) / 0.15)' }}
              >
                <Zap className="h-4 w-4" style={{ color: 'hsl(var(--brand))' }} />
              </div>
              <p className="text-sm font-medium">Zero-config tracing</p>
            </motion.div>

            {/* Metric cards reveal in sequence */}
            <div className="grid grid-cols-3 gap-3">
              {METRICS.map((mtr, i) => (
                <motion.div
                  key={mtr.label}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.96 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{
                    delay: reduced ? 0 : 0.15 + i * 0.12,
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="rounded-xl border border-border bg-card/50 px-3 py-3.5"
                >
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {mtr.label}
                  </p>
                  <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{mtr.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Live event log — events appear in sequence along a connector */}
            <div className="relative flex-1 overflow-hidden rounded-xl border border-border bg-card/50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  {!reduced && (
                    <span
                      className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                      style={{ backgroundColor: 'hsl(var(--score-pass))' }}
                    />
                  )}
                  <span
                    className="relative inline-flex h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: 'hsl(var(--score-pass))' }}
                  />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  event stream
                </span>
              </div>

              <div className="relative space-y-2.5 pl-4">
                {/* Connector spine linking the events */}
                <div
                  className="absolute left-[3px] top-1 bottom-1 w-px"
                  style={{ backgroundColor: 'hsl(var(--border))' }}
                />
                {EVENTS.map((ev, i) => (
                  <motion.div
                    key={ev.text}
                    initial={reduced ? { opacity: 0 } : { opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{
                      delay: reduced ? 0 : 0.4 + i * 0.18,
                      duration: 0.4,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="relative flex items-center gap-2"
                  >
                    <span
                      className="absolute -left-4 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full"
                      style={{
                        backgroundColor: `hsl(var(--${ev.accent}))`,
                        boxShadow: `0 0 8px hsl(var(--${ev.accent}) / 0.7)`,
                      }}
                    />
                    <span
                      className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium"
                      style={{
                        backgroundColor: `hsl(var(--${ev.accent}) / 0.15)`,
                        color: `hsl(var(--${ev.accent}))`,
                      }}
                    >
                      {ev.method}
                    </span>
                    <span className="font-mono text-[11px] text-foreground/75">{ev.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
