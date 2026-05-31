'use client'

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'

/**
 * The hero's animated product visual: a request flows into a trace, the trace
 * splits into spans, and an evaluation score appears. Pure CSS/Tailwind + a few
 * Framer Motion transitions — no images, no chart library.
 *
 * Uses the same span-kind tokens as the real dashboard so the visual language
 * matches the product.
 */

interface SpanRowData {
  kind: 'retrieval' | 'llm' | 'evaluation'
  label: string
  /** bar left offset and width as percentages of the track */
  offset: number
  width: number
  duration: string
}

const SPANS: SpanRowData[] = [
  { kind: 'retrieval', label: 'retrieval', offset: 0, width: 34, duration: '240ms' },
  { kind: 'llm', label: 'llm.call', offset: 36, width: 50, duration: '610ms' },
  { kind: 'evaluation', label: 'evaluation', offset: 88, width: 10, duration: '70ms' },
]

function kindColor(kind: SpanRowData['kind']) {
  return `hsl(var(--kind-${kind}))`
}

// Small floating observability nodes scattered around the panel for depth.
const ORBIT_NODES = [
  { top: '-6%', left: '-7%', size: 7, accent: 'kind-retrieval', dur: 8, delay: 0 },
  { top: '12%', left: '102%', size: 5, accent: 'kind-llm', dur: 10, delay: -2 },
  { top: '78%', left: '-9%', size: 6, accent: 'kind-evaluation', dur: 9, delay: -4 },
  { top: '104%', left: '70%', size: 5, accent: 'brand', dur: 11, delay: -1 },
  { top: '46%', left: '105%', size: 4, accent: 'brand', dur: 7, delay: -3 },
]

export function AnimatedTraceMockup() {
  const reduced = useReducedMotion()

  // Pointer-driven tilt for depth (disabled under reduced motion).
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [6, -6]), { stiffness: 150, damping: 18 })
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-8, 8]), { stiffness: 150, damping: 18 })

  function handlePointer(e: React.PointerEvent<HTMLDivElement>) {
    if (reduced) return
    const rect = e.currentTarget.getBoundingClientRect()
    px.set((e.clientX - rect.left) / rect.width - 0.5)
    py.set((e.clientY - rect.top) / rect.height - 0.5)
  }
  function resetPointer() {
    px.set(0)
    py.set(0)
  }

  // Float animation applied to the whole panel (disabled for reduced motion).
  const floatAnim = reduced
    ? undefined
    : {
        y: [0, -8, 0],
        transition: { duration: 7, ease: 'easeInOut' as const, repeat: Infinity },
      }

  return (
    <motion.div
      animate={floatAnim}
      onPointerMove={handlePointer}
      onPointerLeave={resetPointer}
      style={reduced ? undefined : { rotateX, rotateY, transformPerspective: 1200 }}
      className="relative w-full max-w-md [transform-style:preserve-3d]"
    >
      {/* Glow behind the panel */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2rem] opacity-60 blur-2xl animate-glow-drift"
        style={{
          background:
            'radial-gradient(circle at 30% 20%, hsl(var(--kind-llm) / 0.35), transparent 60%), radial-gradient(circle at 80% 80%, hsl(var(--kind-retrieval) / 0.3), transparent 55%)',
        }}
      />

      {/* Floating observability nodes orbiting the panel */}
      {ORBIT_NODES.map((n, i) => (
        <span
          key={i}
          aria-hidden
          className={reduced ? '' : 'animate-node-float'}
          style={{
            position: 'absolute',
            top: n.top,
            left: n.left,
            width: n.size,
            height: n.size,
            borderRadius: '9999px',
            backgroundColor: `hsl(var(--${n.accent}))`,
            boxShadow: `0 0 ${n.size * 2.5}px hsl(var(--${n.accent}) / 0.8)`,
            ['--float-dur' as string]: `${n.dur}s`,
            ['--float-delay' as string]: `${n.delay}s`,
          }}
        />
      ))}

      {/* Glassy panel */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card/80 shadow-2xl backdrop-blur-sm">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="ml-2 font-mono text-[11px] text-muted-foreground">
            rag.answer_question
          </span>
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">920ms</span>
        </div>

        <div className="space-y-4 p-4">
          {/* Incoming request pill */}
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="relative flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2"
          >
            {/* Request packet pulse that travels into the pill */}
            {!reduced && (
              <motion.span
                aria-hidden
                className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
                style={{
                  backgroundColor: 'hsl(var(--brand))',
                  boxShadow: '0 0 12px 3px hsl(var(--brand) / 0.8)',
                }}
                initial={{ x: -34, opacity: 0 }}
                animate={{ x: [-34, 6, 6], opacity: [0, 1, 0] }}
                transition={{
                  duration: 2.6,
                  times: [0, 0.55, 1],
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatDelay: 1.4,
                  delay: 1,
                }}
              />
            )}
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium"
              style={{ backgroundColor: 'hsl(var(--brand) / 0.15)', color: 'hsl(var(--brand))' }}
            >
              POST
            </span>
            <span className="font-mono text-xs text-foreground/80">/v1/answer</span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">user_id: u_demo</span>
          </motion.div>

          {/* Span waterfall */}
          <div className="space-y-2.5">
            {SPANS.map((span, i) => (
              <div key={span.label} className="flex items-center gap-3">
                <span className="w-20 shrink-0 font-mono text-[11px] text-muted-foreground">
                  {span.label}
                </span>
                <div className="relative h-4 flex-1 overflow-hidden rounded bg-muted/40">
                  <motion.div
                    className="absolute h-full rounded"
                    style={{
                      left: `${span.offset}%`,
                      backgroundColor: kindColor(span.kind),
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${span.width}%` }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { delay: 0.5 + i * 0.18, duration: 0.5, ease: [0.16, 1, 0.3, 1] }
                    }
                  />
                </div>
                <span className="w-12 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                  {span.duration}
                </span>
              </div>
            ))}
          </div>

          {/* Evaluation score badges */}
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.15, duration: 0.5 }}
            className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2.5"
          >
            <span className="font-mono text-[11px] text-muted-foreground">eval</span>
            {[
              { label: 'rel', value: 92 },
              { label: 'faith', value: 88 },
              { label: 'ground', value: 95 },
            ].map((s) => (
              <span
                key={s.label}
                className="rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold"
                style={{
                  backgroundColor: 'hsl(var(--score-pass) / 0.15)',
                  color: 'hsl(var(--score-pass))',
                }}
              >
                {s.label} {s.value}%
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
