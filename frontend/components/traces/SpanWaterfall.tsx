'use client'

import { cn, formatDuration } from '@/lib/utils'
import type { Span, SpanKind } from '@/lib/types'

// ---------------------------------------------------------------------------
// CSS-variable-based color helpers
// Each span kind has two tokens defined in globals.css:
//   --kind-<name>        → bar / accent color (full saturation)
//   --kind-<name>-muted  → badge background (muted tint)
// Both respond correctly to dark/light mode from a single source of truth.
// ---------------------------------------------------------------------------

function kindBarColor(kind: SpanKind): string {
  return `hsl(var(--kind-${kind}, var(--kind-function)))`
}

function kindMutedColor(kind: SpanKind): string {
  return `hsl(var(--kind-${kind}-muted, var(--kind-function-muted)))`
}

// ---------------------------------------------------------------------------
// Timeline math
// ---------------------------------------------------------------------------

interface Timeline {
  startMs: number
  totalMs: number
}

function buildTimeline(spans: Span[]): Timeline {
  const starts = spans
    .filter((s) => s.start_time != null)
    .map((s) => new Date(s.start_time!).getTime())

  const ends = spans
    .filter((s) => s.end_time != null)
    .map((s) => new Date(s.end_time!).getTime())

  if (starts.length === 0) return { startMs: 0, totalMs: 0 }

  const startMs = Math.min(...starts)
  const endMs = Math.max(...(ends.length > 0 ? ends : starts))
  return { startMs, totalMs: Math.max(endMs - startMs, 1) }
}

function spanDurationMs(span: Span): number | null {
  if (!span.start_time || !span.end_time) return null
  const ms = new Date(span.end_time).getTime() - new Date(span.start_time).getTime()
  return ms >= 0 ? ms : null
}

// Sort spans by start_time ascending; spans without timing sink to the bottom.
function sortedByStartTime(spans: Span[]): Span[] {
  return [...spans].sort((a, b) => {
    if (!a.start_time) return 1
    if (!b.start_time) return -1
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  })
}

// ---------------------------------------------------------------------------
// Timeline header row: tick labels at 0, midpoint, and total
// ---------------------------------------------------------------------------

function TimelineHeader({ totalMs }: { totalMs: number }) {
  return (
    <div className="flex items-center border-b border-border bg-muted/20">
      <div className="w-52 shrink-0 px-3 py-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Span
        </span>
      </div>
      <div className="flex-1 px-2 py-1.5">
        <div className="relative h-4">
          <span className="absolute left-0 font-mono text-[10px] text-muted-foreground">0</span>
          <span className="absolute left-1/2 -translate-x-1/2 font-mono text-[10px] text-muted-foreground">
            {formatDuration(Math.round(totalMs / 2))}
          </span>
          <span className="absolute right-0 font-mono text-[10px] text-muted-foreground">
            {formatDuration(totalMs)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual span row
// ---------------------------------------------------------------------------

function WaterfallRow({ span, timeline }: { span: Span; timeline: Timeline }) {
  const durMs = spanDurationMs(span)
  const hasTimeline = timeline.totalMs > 0 && span.start_time != null

  let offsetPct = 0
  let widthPct = 0

  if (hasTimeline) {
    const spanStartMs = new Date(span.start_time!).getTime()
    offsetPct = ((spanStartMs - timeline.startMs) / timeline.totalMs) * 100

    if (durMs != null && durMs > 0) {
      widthPct = (durMs / timeline.totalMs) * 100
    }
    // Minimum visible width so even instant spans appear as a sliver
    widthPct = Math.max(widthPct, 0.5)
  }

  // Determine if the duration label fits to the right of the bar.
  // If the bar ends past 85% of the track, flip the label inside the bar
  // (right-aligned, white text) to prevent overflow.
  const barEnd = offsetPct + widthPct
  const labelFlip = barEnd > 85

  return (
    <div className="flex items-center border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      {/* Label column: kind badge + span name */}
      <div className="w-52 shrink-0 flex items-center gap-2 px-3 py-2.5">
        <span
          className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize"
          style={{
            backgroundColor: kindMutedColor(span.kind),
            color: kindBarColor(span.kind),
          }}
        >
          {span.kind}
        </span>
        <span className="text-xs font-medium truncate" title={span.name}>
          {span.name}
        </span>
      </div>

      {/* Bar column */}
      <div className="flex-1 px-2 py-2.5">
        {hasTimeline ? (
          <div className="relative h-5 flex items-center overflow-hidden rounded">
            {/* Faint track shows the full time axis */}
            <div className="absolute inset-0 bg-muted/30" />

            {/* Colored span bar with grow-in animation */}
            <div
              className={cn('absolute h-full rounded animate-grow-x')}
              style={{
                backgroundColor: kindBarColor(span.kind),
                left: `${offsetPct.toFixed(2)}%`,
                width: `${widthPct.toFixed(2)}%`,
              }}
            />

            {/* Duration label — floats right of bar, or flips inside when near right edge */}
            {durMs != null && (
              <span
                className={cn(
                  'absolute font-mono text-[10px] whitespace-nowrap z-10 pointer-events-none',
                  labelFlip ? 'text-white/80' : 'text-foreground/60',
                )}
                style={
                  labelFlip
                    ? { right: `${(100 - barEnd).toFixed(2)}%`, paddingRight: '4px' }
                    : { left: `${barEnd.toFixed(2)}%`, paddingLeft: '4px' }
                }
              >
                {formatDuration(durMs)}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs italic text-muted-foreground/40">no timing</span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export function SpanWaterfall({ spans }: { spans: Span[] }) {
  const sorted = sortedByStartTime(spans)
  const timeline = buildTimeline(sorted)

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card text-sm">
      {timeline.totalMs > 0 && <TimelineHeader totalMs={timeline.totalMs} />}
      {sorted.map((span) => (
        <WaterfallRow key={span.span_id} span={span} timeline={timeline} />
      ))}
    </div>
  )
}
