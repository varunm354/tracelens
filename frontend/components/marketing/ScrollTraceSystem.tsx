'use client'

import { type MotionValue, motion, useTransform } from 'framer-motion'

/**
 * The animated centerpiece of the "Request → Trace → Insight" story.
 *
 * Instead of cross-fading three separate cards, this renders ONE trace visual
 * that progressively builds as the user scrolls through the sticky section.
 * Everything is driven off a single `progress` MotionValue (0 → 1), so the
 * motion is perfectly scroll-linked and only animates transform / opacity /
 * width — never layout.
 *
 * Timeline (by scroll progress):
 *   0.00 – 0.30  Capture the request   (request node + packet + metadata chips)
 *   0.28 – 0.64  Break it into spans   (spine draws, span rows + bars branch in)
 *   0.60 – 1.00  Score the result      (eval bars fill, scores reveal, insight)
 *
 * This component is only mounted in the full-motion layout; the reduced-motion
 * path renders a plain stacked version instead.
 */

const SPANS = [
  { kind: 'retrieval', label: 'retrieval', width: 34, duration: '240ms', in: [0.3, 0.4] },
  { kind: 'llm', label: 'llm.call', width: 58, duration: '610ms', in: [0.38, 0.48] },
  { kind: 'evaluation', label: 'evaluation', width: 14, duration: '70ms', in: [0.5, 0.58] },
] as const

const SPAN_OFFSET = [0, 36, 88] as const

const SCORES = [
  { label: 'Relevance', value: 92, in: [0.68, 0.78] },
  { label: 'Faithfulness', value: 88, in: [0.74, 0.84] },
  { label: 'Groundedness', value: 95, in: [0.8, 0.9] },
] as const

function NodeDot({ active }: { active: MotionValue<number> }) {
  const scale = useTransform(active, [0, 1], [0.4, 1])
  return (
    <motion.span
      className="relative z-10 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border"
      style={{
        scale,
        opacity: active,
        borderColor: 'hsl(var(--brand) / 0.6)',
        backgroundColor: 'hsl(var(--background))',
        boxShadow: '0 0 12px hsl(var(--brand) / 0.55)',
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: 'hsl(var(--brand))' }}
      />
    </motion.span>
  )
}

export function ScrollTraceSystem({ progress }: { progress: MotionValue<number> }) {
  // --- Phase activations (used to light up node dots + section opacity) ----
  const requestActive = useTransform(progress, [0.02, 0.12], [0, 1])
  const spansActive = useTransform(progress, [0.28, 0.4], [0, 1])
  const evalActive = useTransform(progress, [0.62, 0.74], [0, 1])

  // --- Central spine draw (scaleY from the top) ----------------------------
  const spineScale = useTransform(progress, [0.06, 0.66], [0, 1])

  // --- Glow behind the whole panel intensifies as the trace fills ----------
  const glowOpacity = useTransform(progress, [0, 0.5, 1], [0.35, 0.6, 0.85])

  // --- Request packet travels down the spine into the span region ----------
  const packetTop = useTransform(progress, [0.04, 0.3], ['9%', '46%'])
  const packetOpacity = useTransform(progress, [0.04, 0.1, 0.26, 0.32], [0, 1, 1, 0])

  // --- Metadata chips attach one by one ------------------------------------
  const chip1 = useTransform(progress, [0.08, 0.14], [0, 1])
  const chip2 = useTransform(progress, [0.13, 0.19], [0, 1])
  const chip3 = useTransform(progress, [0.18, 0.24], [0, 1])

  // --- Span bar widths grow with scroll (staggered) ------------------------
  const barW0 = useTransform(progress, [...SPANS[0].in], ['0%', `${SPANS[0].width}%`])
  const barW1 = useTransform(progress, [...SPANS[1].in], ['0%', `${SPANS[1].width}%`])
  const barW2 = useTransform(progress, [...SPANS[2].in], ['0%', `${SPANS[2].width}%`])
  const barWidths = [barW0, barW1, barW2]

  const rowOpacity0 = useTransform(progress, [0.28, 0.36], [0.15, 1])
  const rowOpacity1 = useTransform(progress, [0.36, 0.44], [0.15, 1])
  const rowOpacity2 = useTransform(progress, [0.46, 0.54], [0.15, 1])
  const rowOpacities = [rowOpacity0, rowOpacity1, rowOpacity2]

  const branch0 = useTransform(progress, [0.28, 0.34], [0, 1])
  const branch1 = useTransform(progress, [0.36, 0.42], [0, 1])
  const branch2 = useTransform(progress, [0.46, 0.52], [0, 1])
  const branches = [branch0, branch1, branch2]

  // --- Evaluation bars fill -------------------------------------------------
  const scoreW0 = useTransform(progress, [...SCORES[0].in], ['0%', `${SCORES[0].value}%`])
  const scoreW1 = useTransform(progress, [...SCORES[1].in], ['0%', `${SCORES[1].value}%`])
  const scoreW2 = useTransform(progress, [...SCORES[2].in], ['0%', `${SCORES[2].value}%`])
  const scoreWidths = [scoreW0, scoreW1, scoreW2]

  const score0 = useTransform(progress, [0.72, 0.78], [0, 1])
  const score1 = useTransform(progress, [0.78, 0.84], [0, 1])
  const score2 = useTransform(progress, [0.84, 0.9], [0, 1])
  const scoreReveals = [score0, score1, score2]

  // --- Final insight card ---------------------------------------------------
  const insightOpacity = useTransform(progress, [0.88, 0.98], [0, 1])
  const insightY = useTransform(progress, [0.88, 0.98], [16, 0])

  // --- Derived panel opacities + chip scales (precomputed to obey hook rules)
  const requestPanelOpacity = useTransform(requestActive, [0, 1], [0.2, 1])
  const spansPanelOpacity = useTransform(spansActive, [0, 1], [0.2, 1])
  const evalPanelOpacity = useTransform(evalActive, [0, 1], [0.2, 1])

  const chip1Scale = useTransform(chip1, [0, 1], [0.8, 1])
  const chip2Scale = useTransform(chip2, [0, 1], [0.8, 1])
  const chip3Scale = useTransform(chip3, [0, 1], [0.8, 1])
  const chips = [
    { v: 'user_id: u_demo', a: chip1, s: chip1Scale },
    { v: 'env: prod', a: chip2, s: chip2Scale },
    { v: 'top_k: 5', a: chip3, s: chip3Scale },
  ]

  return (
    <div className="relative w-full">
      {/* Glow behind the panel */}
      <motion.div
        aria-hidden
        className="absolute -inset-8 -z-10 rounded-[2.5rem] blur-3xl"
        style={{
          opacity: glowOpacity,
          background:
            'radial-gradient(circle at 30% 18%, hsl(var(--kind-llm) / 0.3), transparent 60%), radial-gradient(circle at 78% 82%, hsl(var(--kind-retrieval) / 0.26), transparent 58%), radial-gradient(circle at 50% 50%, hsl(var(--brand) / 0.18), transparent 65%)',
        }}
      />

      {/* The trace panel */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/70 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <div className="pointer-events-none absolute inset-0 sheen-sweep" />

        {/* Window chrome */}
        <div className="mb-6 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="ml-2 font-mono text-[11px] text-muted-foreground">
            rag.answer_question
          </span>
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">trace.live</span>
        </div>

        {/* Body: a left spine connects three node groups */}
        <div className="relative pl-8">
          {/* Spine track */}
          <div
            className="absolute left-[6px] top-2 bottom-2 w-px"
            style={{ backgroundColor: 'hsl(var(--border))' }}
          />
          {/* Spine lit overlay (draws downward) */}
          <motion.div
            className="absolute left-[6px] top-2 bottom-2 w-px origin-top"
            style={{
              scaleY: spineScale,
              background:
                'linear-gradient(to bottom, hsl(var(--brand)), hsl(var(--kind-retrieval)), hsl(var(--kind-evaluation)))',
              boxShadow: '0 0 8px hsl(var(--brand) / 0.6)',
            }}
          />
          {/* Traveling request packet */}
          <motion.span
            aria-hidden
            className="absolute left-[1px] h-2.5 w-2.5 rounded-full"
            style={{
              top: packetTop,
              opacity: packetOpacity,
              backgroundColor: 'hsl(var(--brand))',
              boxShadow: '0 0 14px 3px hsl(var(--brand) / 0.8)',
            }}
          />

          {/* --- Group 1: Request ------------------------------------------ */}
          <div className="relative flex gap-4">
            <div className="absolute -left-8 top-1">
              <NodeDot active={requestActive} />
            </div>
            <motion.div
              className="w-full rounded-xl border border-border bg-background/60 p-4"
              style={{ opacity: requestPanelOpacity }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
                  style={{ backgroundColor: 'hsl(var(--brand) / 0.15)', color: 'hsl(var(--brand))' }}
                >
                  POST
                </span>
                <span className="font-mono text-xs text-foreground/80">/v1/answer</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  received
                </span>
              </div>
              {/* Metadata chips attach one by one */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <motion.span
                    key={c.v}
                    className="rounded-md border border-border bg-card/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                    style={{ opacity: c.a, scale: c.s }}
                  >
                    {c.v}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* --- Group 2: Spans -------------------------------------------- */}
          <div className="relative mt-5 flex gap-4">
            <div className="absolute -left-8 top-1">
              <NodeDot active={spansActive} />
            </div>
            <motion.div
              className="w-full space-y-3 rounded-xl border border-border bg-background/60 p-4"
              style={{ opacity: spansPanelOpacity }}
            >
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                spans
              </p>
              {SPANS.map((s, i) => (
                <motion.div
                  key={s.label}
                  className="flex items-center gap-3"
                  style={{ opacity: rowOpacities[i] }}
                >
                  <span className="w-[4.5rem] shrink-0 font-mono text-[11px] text-muted-foreground">
                    {s.label}
                  </span>
                  {/* connector branch from spine to bar */}
                  <motion.span
                    aria-hidden
                    className="h-px w-3 origin-left"
                    style={{
                      scaleX: branches[i],
                      backgroundColor: `hsl(var(--kind-${s.kind}))`,
                    }}
                  />
                  <div className="relative h-4 flex-1 overflow-hidden rounded bg-muted/40">
                    <motion.div
                      className="absolute h-full rounded"
                      style={{
                        left: `${SPAN_OFFSET[i]}%`,
                        width: barWidths[i],
                        backgroundColor: `hsl(var(--kind-${s.kind}))`,
                      }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                    {s.duration}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* --- Group 3: Evaluation + insight ----------------------------- */}
          <div className="relative mt-5 flex gap-4">
            <div className="absolute -left-8 top-1">
              <NodeDot active={evalActive} />
            </div>
            <motion.div
              className="w-full space-y-3 rounded-xl border border-border bg-background/60 p-4"
              style={{ opacity: evalPanelOpacity }}
            >
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                evaluation
              </p>
              {SCORES.map((s, i) => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="w-[6.5rem] shrink-0 text-xs text-muted-foreground">
                    {s.label}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/50">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        width: scoreWidths[i],
                        backgroundColor: 'hsl(var(--score-pass))',
                      }}
                    />
                  </div>
                  <motion.span
                    className="w-9 text-right font-mono text-xs font-semibold tabular-nums"
                    style={{ opacity: scoreReveals[i], color: 'hsl(var(--score-pass))' }}
                  >
                    {s.value}%
                  </motion.span>
                </div>
              ))}

              {/* Final insight card */}
              <motion.div
                className="mt-1 flex items-center gap-2 rounded-lg border px-3 py-2"
                style={{
                  opacity: insightOpacity,
                  y: insightY,
                  borderColor: 'hsl(var(--score-pass) / 0.4)',
                  backgroundColor: 'hsl(var(--score-pass) / 0.08)',
                }}
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{
                    backgroundColor: 'hsl(var(--score-pass) / 0.2)',
                    color: 'hsl(var(--score-pass))',
                  }}
                >
                  ✓
                </span>
                <span className="text-xs text-foreground/80">
                  Answer stayed grounded in retrieved context — avg{' '}
                  <span className="font-semibold" style={{ color: 'hsl(var(--score-pass))' }}>
                    92%
                  </span>
                </span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
