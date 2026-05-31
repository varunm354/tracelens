'use client'

import { useMemo } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { getTraces, getSpans, getEvaluations } from '@/lib/api'
import type { Trace } from '@/lib/types'
import {
  computeTraceMetrics,
  computeAggregate,
  computeSlowThresholdMs,
  deriveHealth,
  type TraceMetrics,
  type TraceHealth,
  type AggregateMetrics,
} from '@/lib/metrics'

/** A trace plus its derived metrics + health, ready for table display. */
export interface EnrichedTrace {
  trace: Trace
  metrics: TraceMetrics | null
  health: TraceHealth
  /** True while this row's spans/evaluations are still loading. */
  loading: boolean
}

export interface TracesWithMetrics {
  rows: EnrichedTrace[]
  aggregate: AggregateMetrics | null
  total: number
  isPending: boolean
  isError: boolean
  error: Error | null
  isFetching: boolean
  refetch: () => void
  /** True until every per-trace enrichment query has resolved. */
  enriching: boolean
}

// Spans/evaluations rarely change once ingested; cache generously so revisiting
// the page or opening a detail view doesn't refetch.
const STALE_TIME = 60_000

/**
 * Fetches the trace list and enriches each trace with derived observability
 * metrics (latency, span count, evaluation score, health) by fanning out to the
 * existing per-trace spans/evaluations endpoints via `useQueries`.
 *
 * The per-trace queries reuse the same query keys as the trace detail page
 * (`['spans', id]`, `['evaluations', id]`), so TanStack Query deduplicates and
 * caches them — opening a trace after viewing the list is instant.
 */
export function useTracesWithMetrics(): TracesWithMetrics {
  const list = useQuery({
    queryKey: ['traces'],
    queryFn: () => getTraces(),
  })

  const traces = useMemo<Trace[]>(() => list.data?.items ?? [], [list.data])

  const spanQueries = useQueries({
    queries: traces.map((t) => ({
      queryKey: ['spans', t.trace_id],
      queryFn: () => getSpans(t.trace_id),
      staleTime: STALE_TIME,
    })),
  })

  const evalQueries = useQueries({
    queries: traces.map((t) => ({
      queryKey: ['evaluations', t.trace_id],
      queryFn: () => getEvaluations(t.trace_id),
      staleTime: STALE_TIME,
    })),
  })

  // Recompute derived data whenever any underlying query result changes.
  // We depend on the queries' data arrays rather than the array identities.
  const spanData = spanQueries.map((q) => q.data)
  const evalData = evalQueries.map((q) => q.data)
  const spanPending = spanQueries.map((q) => q.isPending)
  const evalPending = evalQueries.map((q) => q.isPending)

  return useMemo(() => {
    const perTraceMetrics: TraceMetrics[] = []

    const partialRows = traces.map((trace, i) => {
      const spans = spanData[i]?.items ?? []
      const evals = evalData[i]?.items ?? []
      const loading = spanPending[i] || evalPending[i]
      const metrics =
        loading && !spanData[i] && !evalData[i]
          ? null
          : computeTraceMetrics(spans, evals, trace.metadata)
      if (metrics) perTraceMetrics.push(metrics)
      return { trace, metrics, loading }
    })

    const slowThresholdMs = computeSlowThresholdMs(
      perTraceMetrics.map((m) => m.durationMs),
    )

    const rows: EnrichedTrace[] = partialRows.map((r) => ({
      ...r,
      health: r.metrics
        ? deriveHealth(r.metrics, slowThresholdMs)
        : ('unknown' as TraceHealth),
    }))

    const aggregate = list.data
      ? computeAggregate(list.data.total, perTraceMetrics)
      : null

    const enriching =
      traces.length > 0 && (spanPending.some(Boolean) || evalPending.some(Boolean))

    return {
      rows,
      aggregate,
      total: list.data?.total ?? 0,
      isPending: list.isPending,
      isError: list.isError,
      error: (list.error as Error) ?? null,
      isFetching: list.isFetching,
      refetch: () => list.refetch(),
      enriching,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    traces,
    list.data,
    list.isPending,
    list.isError,
    list.isFetching,
    // stringify the per-row loading/data signals so memo updates as they resolve
    spanData.map((d) => (d ? d.total : -1)).join(','),
    evalData.map((d) => (d ? d.total : -1)).join(','),
    spanPending.join(','),
    evalPending.join(','),
  ])
}
