'use client'

import { cn } from '@/lib/utils'
import type { Span, SpanKind } from '@/lib/types'

// ---------------------------------------------------------------------------
// Color maps
// ---------------------------------------------------------------------------

const KIND_BADGE: Record<SpanKind, string> = {
  retrieval: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  llm: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  tool: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  evaluation: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  function: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
}

const KIND_BAR: Record<SpanKind, string> = {
  retrieval: 'bg-blue-400 dark:bg-blue-500',
  llm: 'bg-purple-400 dark:bg-purple-500',
  tool: 'bg-orange-400 dark:bg-orange-500',
  evaluation: 'bg-green-400 dark:bg-green-500',
  function: 'bg-zinc-400 dark:bg-zinc-500',
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
  // Guarantee at least 1ms so we never divide by zero
  return { startMs, totalMs: Math.max(endMs - startMs, 1) }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`
  return `${(ms / 60_000).toFixed(1)}m`
}

function spanDurationMs(span: Span): number | null {
  if (!span.start_time || !span.end_time) return null
  const ms = new Date(span.end_time).getTime() - new Date(span.start_time).getTime()
  return ms >= 0 ? ms : null
}

// ---------------------------------------------------------------------------
// Timeline header row (tick labels: 0, midpoint, total)
// ---------------------------------------------------------------------------

function TimelineHeader({ totalMs }: { totalMs: number }) {
  return (
    <div className="flex items-center border-b border-border bg-muted/20">
      {/* Matches the label column below */}
      <div className="w-52 shrink-0 px-3 py-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Span
        </span>
      </div>
      <div className="flex-1 px-2 py-1.5">
        <div className="relative h-4">
          <span className="absolute left-0 text-[10px] font-mono text-muted-foreground">0</span>
          <span className="absolute left-1/2 -translate-x-1/2 text-[10px] font-mono text-muted-foreground">
            {formatDuration(Math.round(totalMs / 2))}
          </span>
          <span className="absolute right-0 text-[10px] font-mono text-muted-foreground">
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
    // Enforce a minimum visible width so even instant spans are visible
    widthPct = Math.max(widthPct, 0.5)
  }

  return (
    <div className="flex items-center border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      {/* Label column: kind badge + span name */}
      <div className="w-52 shrink-0 flex items-center gap-2 px-3 py-2.5">
        <span
          className={cn(
            'shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize',
            KIND_BADGE[span.kind] ?? KIND_BADGE.function,
          )}
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
          <div className="relative h-5 flex items-center">
            {/* Faint track so the whole axis is visible */}
            <div className="absolute inset-0 rounded bg-muted/40" />
            {/* Colored span bar */}
            <div
              className={cn('absolute h-full rounded', KIND_BAR[span.kind] ?? KIND_BAR.function)}
              style={{ left: `${offsetPct}%`, width: `${widthPct}%` }}
            />
            {/* Duration label floats just past the right edge of the bar */}
            {durMs != null && (
              <span
                className="absolute text-[10px] font-mono text-foreground/70 whitespace-nowrap"
                style={{ left: `calc(${offsetPct + widthPct}% + 4px)` }}
              >
                {formatDuration(durMs)}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs italic text-muted-foreground/50">no timing</span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export function SpanWaterfall({ spans }: { spans: Span[] }) {
  const timeline = buildTimeline(spans)

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card text-sm">
      {timeline.totalMs > 0 && <TimelineHeader totalMs={timeline.totalMs} />}
      {spans.map((span) => (
        <WaterfallRow key={span.span_id} span={span} timeline={timeline} />
      ))}
    </div>
  )
}
