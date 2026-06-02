'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Timer, GitBranch, ClipboardCheck, Gauge } from 'lucide-react'
import { getTrace, getSpans, getEvaluations, getRagObservations } from '@/lib/api'
import { cn, formatRelativeTime, formatDuration, computeSpanDurationMs } from '@/lib/utils'
import { averageEvaluationScore, scoreColor, deriveHealth } from '@/lib/metrics'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { TraceHealthBadge } from '@/components/dashboard/TraceHealthBadge'
import { Panel } from '@/components/dashboard/Panel'
import { MetadataPanel } from '@/components/dashboard/MetadataPanel'
import { LatencyBreakdown } from '@/components/dashboard/LatencyBreakdown'
import { EvaluationPanel } from '@/components/dashboard/EvaluationPanel'
import { RAGEvaluationPanel } from '@/components/dashboard/RAGEvaluationPanel'
import { RawDataPanel } from '@/components/dashboard/RawDataPanel'
import { SpanWaterfall } from '@/components/traces/SpanWaterfall'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-muted', className)} />
}

function ErrorSection({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 px-4 py-3 text-sm text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------

export function TraceDetail({ traceId }: { traceId: string }) {
  const traceQ = useQuery({ queryKey: ['trace', traceId], queryFn: () => getTrace(traceId) })
  const spansQ = useQuery({ queryKey: ['spans', traceId], queryFn: () => getSpans(traceId) })
  const evalsQ = useQuery({ queryKey: ['evaluations', traceId], queryFn: () => getEvaluations(traceId) })
  const ragQ = useQuery({
    queryKey: ['rag', traceId],
    queryFn: () => getRagObservations(traceId),
    staleTime: 60_000,
  })

  const spans = spansQ.data?.items ?? []
  const evaluations = evalsQ.data?.items ?? []

  const durationMs = spansQ.data ? computeSpanDurationMs(spans) : null
  const avgScore = evalsQ.data ? averageEvaluationScore(evaluations) : null
  // Single-trace view has no cohort to compare against, so "slow" can't be
  // derived here — health reflects score + data availability only.
  const health = deriveHealth({ avgScore, durationMs }, null)

  const metaEntries = traceQ.data?.metadata ? Object.entries(traceQ.data.metadata) : []
  const avgScorePct = avgScore != null ? Math.round(avgScore * 100) : null

  return (
    <div className="mx-auto max-w-6xl">
      {/* --- Summary header ------------------------------------------------ */}
      <div className="mb-6">
        {traceQ.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-96" />
          </div>
        ) : traceQ.isError ? (
          <ErrorSection message={(traceQ.error as Error).message} />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{traceQ.data.name}</h1>
              {!spansQ.isPending && !evalsQ.isPending && (
                <TraceHealthBadge health={health} size="md" />
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-mono text-xs text-muted-foreground">{traceQ.data.trace_id}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-sm text-muted-foreground" title={traceQ.data.created_at}>
                {formatRelativeTime(traceQ.data.created_at)}
              </span>
            </div>
            {metaEntries.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {metaEntries.map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 py-1 font-mono text-xs"
                  >
                    <span className="text-muted-foreground">{key}</span>
                    <span className="text-foreground">
                      {typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* --- Metric cards -------------------------------------------------- */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Duration"
          icon={Timer}
          accent="kind-retrieval"
          value={durationMs != null ? formatDuration(durationMs) : '—'}
          loading={spansQ.isPending}
        />
        <MetricCard
          label="Spans"
          icon={GitBranch}
          accent="kind-llm"
          countTo={spansQ.data?.total ?? 0}
          value={spansQ.data ? undefined : '—'}
          loading={spansQ.isPending}
        />
        <MetricCard
          label="Evaluations"
          icon={ClipboardCheck}
          accent="kind-evaluation"
          countTo={evalsQ.data?.total ?? 0}
          value={evalsQ.data ? undefined : '—'}
          loading={evalsQ.isPending}
        />
        <MetricCard
          label="Avg score"
          icon={Gauge}
          accent="brand"
          countTo={avgScorePct ?? undefined}
          value={avgScorePct == null ? '—' : undefined}
          suffix="%"
          valueColor={avgScore != null ? scoreColor(avgScore) : undefined}
          loading={evalsQ.isPending}
        />
      </div>

      {/* --- Main + sidebar grid ------------------------------------------ */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {spansQ.isError ? (
            <ErrorSection message={(spansQ.error as Error).message} />
          ) : spansQ.isPending ? (
            <Panel title="Spans">
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </Panel>
          ) : spans.length === 0 ? (
            <Panel title="Spans">
              <p className="py-4 text-center text-xs text-muted-foreground">
                No spans recorded for this trace.
              </p>
            </Panel>
          ) : (
            <>
              <LatencyBreakdown spans={spans} />
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="text-sm font-semibold">Span waterfall</h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {spans.length}
                  </span>
                </div>
                <SpanWaterfall spans={spans} />
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <MetadataPanel metadata={traceQ.data?.metadata ?? null} />
          {evalsQ.isError ? (
            <ErrorSection message={(evalsQ.error as Error).message} />
          ) : evalsQ.isPending ? (
            <Panel title="Evaluations">
              <Skeleton className="h-32 w-full" />
            </Panel>
          ) : (
            <EvaluationPanel evaluations={evaluations} />
          )}
        </div>
      </div>

      {/* --- RAG Evaluations ----------------------------------------------- */}
      {(ragQ.isPending || ragQ.isError || (ragQ.data?.total ?? 0) > 0) && (
        <div className="mt-6">
          {ragQ.isError ? (
            <ErrorSection message={`Failed to load RAG evaluations: ${(ragQ.error as Error).message}`} />
          ) : ragQ.isPending ? (
            <Panel title="RAG Evaluations">
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            </Panel>
          ) : (
            <RAGEvaluationPanel observations={ragQ.data!.items} />
          )}
        </div>
      )}

      {/* --- Raw data ------------------------------------------------------ */}
      <div className="mt-6">
        <RawDataPanel trace={traceQ.data} spans={spans} evaluations={evaluations} />
      </div>
    </div>
  )
}
