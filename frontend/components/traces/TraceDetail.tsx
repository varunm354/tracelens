'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ArrowLeft, AlertCircle, Clock, Tag } from 'lucide-react'
import { getTrace, getSpans, getEvaluations } from '@/lib/api'
import { cn, formatRelativeTime, shortId } from '@/lib/utils'
import type { Span, Evaluation, SpanKind } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-muted', className)} />
}

const KIND_STYLES: Record<SpanKind, string> = {
  retrieval: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  llm: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  tool: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  evaluation: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  function: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
}

function KindBadge({ kind }: { kind: SpanKind }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
        KIND_STYLES[kind] ?? KIND_STYLES.function,
      )}
    >
      {kind}
    </span>
  )
}

function ScorePill({ label, value }: { label: string; value: number }) {
  const color =
    value >= 0.8
      ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/40'
      : value >= 0.5
        ? 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/40'
        : 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/40'

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={cn('rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums', color)}>
        {(value * 100).toFixed(0)}%
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  )
}

function durationMs(start: string | null, end: string | null): string | null {
  if (!start || !end) return null
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 0) return null
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
}

// ---------------------------------------------------------------------------
// Section wrappers
// ---------------------------------------------------------------------------

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
// Spans section
// ---------------------------------------------------------------------------

function SpanRow({ span }: { span: Span }) {
  const dur = durationMs(span.start_time, span.end_time)
  const metaCount = span.metadata ? Object.keys(span.metadata).length : 0

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-0">
      <div className="mt-0.5">
        <KindBadge kind={span.kind} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{span.name}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="font-mono text-xs text-muted-foreground">{shortId(span.span_id)}…</span>
          {dur && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {dur}
            </span>
          )}
          {metaCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Tag className="w-3 h-3" />
              {metaCount} {metaCount === 1 ? 'key' : 'keys'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

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
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}
      {isError && <ErrorSection message={(error as Error).message} />}
      {data && data.items.length === 0 && <EmptySection message="No spans recorded for this trace." />}
      {data && data.items.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          {data.items.map((span) => (
            <SpanRow key={span.span_id} span={span} />
          ))}
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Evaluations section
// ---------------------------------------------------------------------------

function EvaluationRow({ evaluation }: { evaluation: Evaluation }) {
  return (
    <div className="px-4 py-4 border-b border-border last:border-0">
      <div className="flex items-center gap-6">
        <ScorePill label="Relevance" value={evaluation.relevance_score} />
        <ScorePill label="Faithfulness" value={evaluation.faithfulness_score} />
        <ScorePill label="Groundedness" value={evaluation.groundedness_score} />
      </div>
      {evaluation.notes && (
        <p className="mt-3 text-sm text-muted-foreground">{evaluation.notes}</p>
      )}
      <p className="mt-2 font-mono text-xs text-muted-foreground/60">
        {shortId(evaluation.evaluation_id)}… · {formatRelativeTime(evaluation.created_at)}
      </p>
    </div>
  )
}

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
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}
      {isError && <ErrorSection message={(error as Error).message} />}
      {data && data.items.length === 0 && (
        <EmptySection message="No evaluations recorded for this trace." />
      )}
      {data && data.items.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          {data.items.map((ev) => (
            <EvaluationRow key={ev.evaluation_id} evaluation={ev} />
          ))}
        </div>
      )}
    </section>
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
// Root export
// ---------------------------------------------------------------------------

export function TraceDetail({ traceId }: { traceId: string }) {
  const router = useRouter()

  return (
    <div className="max-w-4xl">
      {/* Back navigation */}
      <button
        onClick={() => router.push('/traces')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground
                   transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        All Traces
      </button>

      {/* Trace header */}
      <div className="mb-8">
        <TraceHeader traceId={traceId} />
      </div>

      {/* Sections */}
      <div className="space-y-8">
        <SpansSection traceId={traceId} />
        <EvaluationsSection traceId={traceId} />
      </div>
    </div>
  )
}
