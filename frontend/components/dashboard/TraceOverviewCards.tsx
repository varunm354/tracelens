'use client'

import { Layers, Timer, Gauge, GitBranch } from 'lucide-react'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { formatDuration } from '@/lib/utils'
import { scoreColor, type AggregateMetrics } from '@/lib/metrics'

interface TraceOverviewCardsProps {
  aggregate: AggregateMetrics | null
  /** Trace list still loading. */
  loading: boolean
  /** Per-trace span/eval enrichment still resolving (derived stats firming up). */
  enriching: boolean
}

/**
 * Top-of-page summary band for /traces. Four derived metrics give an at-a-glance
 * sense of system health before the user scans the table:
 *   - Total traces      (from the list endpoint)
 *   - Average latency   (mean of per-trace span durations)
 *   - Average score     (mean evaluation score across traces)
 *   - Spans / trace     (mean span count across enriched traces)
 *
 * Latency / score / sp-per-trace are derived client-side from the per-trace
 * spans & evaluations, so they "firm up" as enrichment resolves.
 */
export function TraceOverviewCards({ aggregate, loading, enriching }: TraceOverviewCardsProps) {
  const enriched = aggregate?.enrichedCount ?? 0
  const enrichedLabel = `across ${enriched} ${enriched === 1 ? 'trace' : 'traces'}`
  const pending = loading || (enriching && enriched === 0)

  const avgScorePct =
    aggregate?.avgScore != null ? Math.round(aggregate.avgScore * 100) : null

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard
        label="Total traces"
        icon={Layers}
        accent="brand"
        countTo={aggregate?.totalTraces ?? 0}
        loading={loading}
        sublabel={
          aggregate && aggregate.totalTraces > 0 ? 'ingested all-time' : 'none yet'
        }
      />

      <MetricCard
        label="Avg latency"
        icon={Timer}
        accent="kind-retrieval"
        value={
          aggregate?.avgLatencyMs != null ? formatDuration(Math.round(aggregate.avgLatencyMs)) : '—'
        }
        loading={pending}
        sublabel={aggregate?.avgLatencyMs != null ? enrichedLabel : 'no timing data'}
      />

      <MetricCard
        label="Avg eval score"
        icon={Gauge}
        accent="kind-evaluation"
        countTo={avgScorePct ?? undefined}
        value={avgScorePct == null ? '—' : undefined}
        suffix="%"
        valueColor={aggregate?.avgScore != null ? scoreColor(aggregate.avgScore) : undefined}
        loading={pending}
        sublabel={aggregate?.avgScore != null ? enrichedLabel : 'no evaluations'}
      />

      <MetricCard
        label="Spans / trace"
        icon={GitBranch}
        accent="kind-llm"
        value={
          aggregate?.avgSpansPerTrace != null
            ? aggregate.avgSpansPerTrace.toFixed(1)
            : '—'
        }
        loading={pending}
        sublabel={aggregate?.avgSpansPerTrace != null ? enrichedLabel : 'no spans'}
      />
    </div>
  )
}
