'use client'

import { Panel } from '@/components/dashboard/Panel'
import { formatDuration, spanDurationMs, computeSpanDurationMs } from '@/lib/utils'
import type { Span, SpanKind } from '@/lib/types'

function kindColor(kind: SpanKind): string {
  return `hsl(var(--kind-${kind}, var(--kind-function)))`
}

/**
 * Latency contribution breakdown: which spans dominated the trace's wall-clock
 * time. Each row shows the span name, kind, duration, its share of the total
 * trace time, and a proportional bar. Sorted slowest-first.
 *
 * "% of total" is each span's duration over the trace's wall-clock duration;
 * with overlapping spans the shares can sum to more than 100%, so bar widths
 * are clamped and the figure is labelled as a contribution, not a partition.
 */
export function LatencyBreakdown({ spans }: { spans: Span[] }) {
  const totalMs = computeSpanDurationMs(spans)

  const rows = spans
    .map((s) => ({ span: s, durMs: spanDurationMs(s) }))
    .filter((r): r is { span: Span; durMs: number } => r.durMs != null)
    .sort((a, b) => b.durMs - a.durMs)

  if (totalMs == null || totalMs === 0 || rows.length === 0) {
    return (
      <Panel title="Latency breakdown">
        <p className="py-4 text-center text-xs text-muted-foreground">
          No span timing available to break down latency.
        </p>
      </Panel>
    )
  }

  return (
    <Panel
      title="Latency breakdown"
      actions={
        <span className="font-mono text-xs text-muted-foreground">{formatDuration(totalMs)} total</span>
      }
    >
      <div className="space-y-3">
        {rows.map(({ span, durMs }) => {
          const pct = (durMs / totalMs) * 100
          return (
            <div key={span.span_id}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: kindColor(span.kind) }}
                  />
                  <span className="truncate font-medium" title={span.name}>
                    {span.name}
                  </span>
                  <span className="shrink-0 capitalize text-muted-foreground/70">{span.kind}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2 font-mono tabular-nums">
                  <span className="text-muted-foreground">{Math.round(pct)}%</span>
                  <span>{formatDuration(durMs)}</span>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted/40">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(pct, 100).toFixed(1)}%`,
                    backgroundColor: kindColor(span.kind),
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
