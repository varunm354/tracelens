'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import { getTrace, getSpans, getEvaluations } from '@/lib/api'
import {
  cn,
  formatRelativeTime,
  shortId,
  formatDuration,
  computeSpanDurationMs,
} from '@/lib/utils'
import type { Evaluation } from '@/lib/types'
import { SpanWaterfall } from '@/components/traces/SpanWaterfall'

// ---------------------------------------------------------------------------
// Score threshold helpers
// ---------------------------------------------------------------------------

type ScoreLevel = 'pass' | 'warn' | 'fail'

function scoreLevel(value: number): ScoreLevel {
  if (value >= 0.8) return 'pass'
  if (value >= 0.5) return 'warn'
  return 'fail'
}

/** Returns a CSS hsl() string using the appropriate --score-* token. */
function scoreColor(value: number): string {
  return `hsl(var(--score-${scoreLevel(value)}))`
}

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-muted', className)} />
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {count !== undefined && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  )
}

function EmptySection({ message }: { message: string }) {
  return (
    <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
      {message}
    </p>
  )
}

function ErrorSection({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-destructive border border-destructive/30 rounded-lg px-4 py-3">
      <AlertCircle className="w-4 h-4 shrink-0" />
      {message}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Trace metadata header
// ---------------------------------------------------------------------------

function TraceHeader({ traceId }: { traceId: string }) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['trace', traceId],
    queryFn: () => getTrace(traceId),
  })

  if (isPending) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
    )
  }

  if (isError) {
    return <ErrorSection message={(error as Error).message} />
  }

  const metaEntries = data.metadata ? Object.entries(data.metadata) : []

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
      <div className="flex items-center gap-3 mt-1.5">
        <span className="font-mono text-xs text-muted-foreground">{data.trace_id}</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-sm text-muted-foreground" title={data.created_at}>
          {formatRelativeTime(data.created_at)}
        </span>
      </div>
      {metaEntries.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {metaEntries.map(([key, value]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-mono"
            >
              <span className="text-muted-foreground">{key}</span>
              <span className="text-foreground">{String(value)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Trace overview band
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string
  value: string
  loading?: boolean
  valueColor?: string
}

function StatCard({ label, value, loading, valueColor }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3.5">
      <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider font-medium">
        {label}
      </p>
      {loading ? (
        <Skeleton className="h-6 w-16 mt-0.5" />
      ) : (
        <p
          className="text-xl font-semibold font-mono tabular-nums leading-none"
          style={valueColor ? { color: valueColor } : undefined}
        >
          {value}
        </p>
      )}
    </div>
  )
}

function TraceOverview({ traceId }: { traceId: string }) {
  // These share query keys with SpansSection and EvaluationsSection below.
  // TanStack Query deduplicates the network requests; both components read
  // from the same cached result.
  const spansQuery = useQuery({
    queryKey: ['spans', traceId],
    queryFn: () => getSpans(traceId),
  })

  const evalsQuery = useQuery({
    queryKey: ['evaluations', traceId],
    queryFn: () => getEvaluations(traceId),
  })

  const totalDurationMs =
    spansQuery.data ? computeSpanDurationMs(spansQuery.data.items) : null

  let avgScore: number | null = null
  if (evalsQuery.data && evalsQuery.data.items.length > 0) {
    const all = evalsQuery.data.items.flatMap((ev) => [
      ev.relevance_score,
      ev.faithfulness_score,
      ev.groundedness_score,
    ])
    avgScore = all.reduce((a, b) => a + b, 0) / all.length
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
      <StatCard
        label="Duration"
        value={totalDurationMs != null ? formatDuration(totalDurationMs) : '—'}
        loading={spansQuery.isPending}
      />
      <StatCard
        label="Spans"
        value={spansQuery.data ? String(spansQuery.data.total) : '—'}
        loading={spansQuery.isPending}
      />
      <StatCard
        label="Evaluations"
        value={evalsQuery.data ? String(evalsQuery.data.total) : '—'}
        loading={evalsQuery.isPending}
      />
      <StatCard
        label="Avg Score"
        value={avgScore != null ? `${Math.round(avgScore * 100)}%` : '—'}
        loading={evalsQuery.isPending}
        valueColor={avgScore != null ? scoreColor(avgScore) : undefined}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Spans section
// ---------------------------------------------------------------------------

function SpansSection({ traceId }: { traceId: string }) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['spans', traceId],
    queryFn: () => getSpans(traceId),
  })

  return (
    <section>
      <SectionHeader title="Spans" count={data?.total} />
      {isPending && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}
      {isError && <ErrorSection message={(error as Error).message} />}
      {data && data.items.length === 0 && (
        <EmptySection message="No spans recorded for this trace." />
      )}
      {data && data.items.length > 0 && <SpanWaterfall spans={data.items} />}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Evaluation score gauge
// ---------------------------------------------------------------------------

function ScoreGauge({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)
  const color = scoreColor(value)

  return (
    <div className="flex items-center gap-3">
      {/* Fixed-width label so all gauges align */}
      <span className="w-28 shrink-0 text-sm text-muted-foreground">{label}</span>

      {/* Track + fill */}
      <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-muted/50">
        <div
          className="h-full rounded-full animate-grow-x"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>

      {/* Numeric value */}
      <span
        className="w-9 text-right font-mono text-sm font-semibold tabular-nums"
        style={{ color }}
      >
        {pct}%
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Evaluation card
// ---------------------------------------------------------------------------

function EvaluationCard({ evaluation }: { evaluation: Evaluation }) {
  const avgScore =
    (evaluation.relevance_score +
      evaluation.faithfulness_score +
      evaluation.groundedness_score) /
    3
  const level = scoreLevel(avgScore)
  const avgColor = scoreColor(avgScore)

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Card header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs text-muted-foreground">
            {shortId(evaluation.evaluation_id)}…
          </span>
          <span className="text-muted-foreground/40 shrink-0">·</span>
          <span
            className="text-xs text-muted-foreground truncate"
            title={evaluation.created_at}
          >
            {formatRelativeTime(evaluation.created_at)}
          </span>
        </div>

        {/* Average score badge */}
        <span
          className="shrink-0 ml-3 font-mono text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: `hsl(var(--score-${level}) / 0.15)`,
            color: avgColor,
          }}
        >
          avg {Math.round(avgScore * 100)}%
        </span>
      </div>

      {/* Score gauges */}
      <div className="space-y-2.5">
        <ScoreGauge label="Relevance" value={evaluation.relevance_score} />
        <ScoreGauge label="Faithfulness" value={evaluation.faithfulness_score} />
        <ScoreGauge label="Groundedness" value={evaluation.groundedness_score} />
      </div>

      {/* Optional notes */}
      {evaluation.notes && (
        <p className="mt-4 pt-3 border-t border-border text-sm text-muted-foreground leading-relaxed">
          {evaluation.notes}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Evaluations section
// ---------------------------------------------------------------------------

function EvaluationsSection({ traceId }: { traceId: string }) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['evaluations', traceId],
    queryFn: () => getEvaluations(traceId),
  })

  return (
    <section>
      <SectionHeader title="Evaluations" count={data?.total} />
      {isPending && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}
      {isError && <ErrorSection message={(error as Error).message} />}
      {data && data.items.length === 0 && (
        <EmptySection message="No evaluations recorded for this trace." />
      )}
      {data && data.items.length > 0 && (
        <div className="space-y-3">
          {data.items.map((ev) => (
            <EvaluationCard key={ev.evaluation_id} evaluation={ev} />
          ))}
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------

export function TraceDetail({ traceId }: { traceId: string }) {
  return (
    <div className="max-w-5xl">
      {/* Trace name, ID, timestamp, metadata */}
      <div className="mb-5">
        <TraceHeader traceId={traceId} />
      </div>

      {/* At-a-glance stats: duration, span count, eval count, avg score */}
      <TraceOverview traceId={traceId} />

      {/* Detailed sections */}
      <div className="space-y-8">
        <SpansSection traceId={traceId} />
        <EvaluationsSection traceId={traceId} />
      </div>
    </div>
  )
}
