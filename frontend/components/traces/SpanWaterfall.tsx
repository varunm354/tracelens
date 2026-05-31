'use client'

import { useState } from 'react'
import { cn, formatDuration, spanDurationMs } from '@/lib/utils'
import type { Span, SpanKind } from '@/lib/types'

// ---------------------------------------------------------------------------
// CSS-variable-based color helpers
//   --kind-<name>        → bar / accent color (full saturation)
//   --kind-<name>-muted  → badge background (muted tint)
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

function sortedByStartTime(spans: Span[]): Span[] {
  return [...spans].sort((a, b) => {
    if (!a.start_time) return 1
    if (!b.start_time) return -1
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  })
}

// ---------------------------------------------------------------------------
// Timeline header row
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
          <span className="absolute left-1/4 -translate-x-1/2 font-mono text-[10px] text-muted-foreground/70">
            {formatDuration(Math.round(totalMs / 4))}
          </span>
          <span className="absolute left-1/2 -translate-x-1/2 font-mono text-[10px] text-muted-foreground">
            {formatDuration(Math.round(totalMs / 2))}
          </span>
          <span className="absolute left-3/4 -translate-x-1/2 font-mono text-[10px] text-muted-foreground/70">
            {formatDuration(Math.round((totalMs * 3) / 4))}
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
// Span row
// ---------------------------------------------------------------------------

function WaterfallRow({
  span,
  timeline,
  selected,
  onSelect,
}: {
  span: Span
  timeline: Timeline
  selected: boolean
  onSelect: () => void
}) {
  const durMs = spanDurationMs(span)
  const hasTimeline = timeline.totalMs > 0 && span.start_time != null

  let offsetPct = 0
  let widthPct = 0

  if (hasTimeline) {
    const spanStartMs = new Date(span.start_time!).getTime()
    offsetPct = ((spanStartMs - timeline.startMs) / timeline.totalMs) * 100
    if (durMs != null && durMs > 0) widthPct = (durMs / timeline.totalMs) * 100
    widthPct = Math.max(widthPct, 0.5)
  }

  const barEnd = offsetPct + widthPct
  const labelFlip = barEnd > 85

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center border-b border-border text-left transition-colors last:border-0',
        selected ? 'bg-accent/60' : 'hover:bg-muted/30',
      )}
    >
      {/* Label column */}
      <div className="relative flex w-52 shrink-0 items-center gap-2 px-3 py-2.5">
        {selected && (
          <span
            aria-hidden
            className="absolute left-0 top-0 h-full w-0.5"
            style={{ backgroundColor: kindBarColor(span.kind) }}
          />
        )}
        <span
          className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize"
          style={{ backgroundColor: kindMutedColor(span.kind), color: kindBarColor(span.kind) }}
        >
          {span.kind}
        </span>
        <span className="truncate text-xs font-medium" title={span.name}>
          {span.name}
        </span>
      </div>

      {/* Bar column */}
      <div className="flex-1 px-2 py-2.5">
        {hasTimeline ? (
          <div className="relative flex h-5 items-center overflow-hidden rounded">
            <div className="absolute inset-0 bg-muted/30" />
            <div
              className="absolute h-full rounded animate-grow-x"
              style={{
                backgroundColor: kindBarColor(span.kind),
                left: `${offsetPct.toFixed(2)}%`,
                width: `${widthPct.toFixed(2)}%`,
                boxShadow: selected ? `0 0 10px ${kindBarColor(span.kind)}` : undefined,
              }}
            />
            {durMs != null && (
              <span
                className={cn(
                  'pointer-events-none absolute z-10 whitespace-nowrap font-mono text-[10px]',
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
    </button>
  )
}

// ---------------------------------------------------------------------------
// Selected span detail strip
// ---------------------------------------------------------------------------

function SpanDetails({ span, timeline }: { span: Span; timeline: Timeline }) {
  const durMs = spanDurationMs(span)
  const startOffset =
    span.start_time != null && timeline.totalMs > 0
      ? new Date(span.start_time).getTime() - timeline.startMs
      : null
  const endOffset =
    span.end_time != null && timeline.totalMs > 0
      ? new Date(span.end_time).getTime() - timeline.startMs
      : null

  const metaEntries = span.metadata ? Object.entries(span.metadata) : []

  const facts: Array<{ label: string; value: string }> = [
    { label: 'Kind', value: span.kind },
    { label: 'Duration', value: durMs != null ? formatDuration(durMs) : '—' },
    { label: 'Start', value: startOffset != null ? `+${formatDuration(startOffset)}` : '—' },
    { label: 'End', value: endOffset != null ? `+${formatDuration(endOffset)}` : '—' },
  ]

  return (
    <div className="border-t border-border bg-muted/15 px-4 py-3">
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize"
          style={{ backgroundColor: kindMutedColor(span.kind), color: kindBarColor(span.kind) }}
        >
          {span.kind}
        </span>
        <span className="text-sm font-medium">{span.name}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="rounded-lg border border-border bg-card px-2.5 py-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</p>
            <p className="mt-0.5 font-mono text-xs font-medium capitalize tabular-nums">{f.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          Span ID
        </p>
        <p className="break-all font-mono text-[11px] text-muted-foreground">{span.span_id}</p>
      </div>

      {metaEntries.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Metadata</p>
          <div className="flex flex-wrap gap-1.5">
            {metaEntries.map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-0.5 font-mono text-[11px]"
              >
                <span className="text-muted-foreground">{k}</span>
                <span>{typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export function SpanWaterfall({ spans }: { spans: Span[] }) {
  const sorted = sortedByStartTime(spans)
  const timeline = buildTimeline(sorted)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = sorted.find((s) => s.span_id === selectedId) ?? null

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card text-sm">
      {timeline.totalMs > 0 && <TimelineHeader totalMs={timeline.totalMs} />}
      {sorted.map((span) => (
        <WaterfallRow
          key={span.span_id}
          span={span}
          timeline={timeline}
          selected={span.span_id === selectedId}
          onSelect={() => setSelectedId((prev) => (prev === span.span_id ? null : span.span_id))}
        />
      ))}
      {selected ? (
        <SpanDetails span={selected} timeline={timeline} />
      ) : (
        <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground/70">
          Select a span to see its timing and metadata.
        </p>
      )}
    </div>
  )
}
