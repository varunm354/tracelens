/**
 * Client-side observability metric derivation.
 *
 * TraceLens' backend exposes traces, spans, and evaluations as separate
 * resources with no aggregate/stats endpoint. Rather than add backend APIs,
 * the dashboard derives all of its operational metrics here from the existing
 * responses. Every function is pure and transparent so the "health" labels are
 * clearly computed from real trace/span/evaluation data, not faked.
 */

import type { Span, Evaluation } from '@/lib/types'
import { computeSpanDurationMs } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Score helpers (0..1 fractions)
// ---------------------------------------------------------------------------

export type ScoreLevel = 'pass' | 'warn' | 'fail'

/** Bucket a 0..1 score into a traffic-light level. */
export function scoreLevel(value: number): ScoreLevel {
  if (value >= 0.8) return 'pass'
  if (value >= 0.5) return 'warn'
  return 'fail'
}

/** CSS hsl() string for a score, using the --score-* design tokens. */
export function scoreColor(value: number): string {
  return `hsl(var(--score-${scoreLevel(value)}))`
}

/** Average of every relevance/faithfulness/groundedness score across evals. */
export function averageEvaluationScore(evals: Evaluation[]): number | null {
  if (evals.length === 0) return null
  const all = evals.flatMap((ev) => [
    ev.relevance_score,
    ev.faithfulness_score,
    ev.groundedness_score,
  ])
  if (all.length === 0) return null
  return all.reduce((a, b) => a + b, 0) / all.length
}

// ---------------------------------------------------------------------------
// Per-trace derived metrics
// ---------------------------------------------------------------------------

export interface TraceMetrics {
  /** Wall-clock duration covered by timed spans, or null if no timing. */
  durationMs: number | null
  spanCount: number
  evalCount: number
  /** Mean evaluation score (0..1), or null when the trace has no evals. */
  avgScore: number | null
  metadataCount: number
}

export function computeTraceMetrics(
  spans: Span[],
  evals: Evaluation[],
  metadata: Record<string, unknown> | null,
): TraceMetrics {
  return {
    durationMs: computeSpanDurationMs(spans),
    spanCount: spans.length,
    evalCount: evals.length,
    avgScore: averageEvaluationScore(evals),
    metadataCount: metadata ? Object.keys(metadata).length : 0,
  }
}

// ---------------------------------------------------------------------------
// Health / status derivation
// ---------------------------------------------------------------------------

export type TraceHealth = 'healthy' | 'review' | 'slow' | 'low' | 'unknown'

export interface HealthMeta {
  label: string
  /** Design-token name (without the hsl wrapper), e.g. 'score-pass'. */
  token: string
  description: string
}

export const HEALTH_META: Record<TraceHealth, HealthMeta> = {
  healthy: {
    label: 'Healthy',
    token: 'score-pass',
    description: 'Average score ≥ 85% and latency within normal range.',
  },
  review: {
    label: 'Needs review',
    token: 'score-warn',
    description: 'Average score between 70–85%, or no evaluation recorded.',
  },
  slow: {
    label: 'Slow',
    token: 'kind-tool',
    description: 'Latency well above the median trace, despite a good score.',
  },
  low: {
    label: 'Low quality',
    token: 'score-fail',
    description: 'Average evaluation score below 70%.',
  },
  unknown: {
    label: 'No data',
    token: 'kind-function',
    description: 'No timing or evaluation data available yet.',
  },
}

/**
 * Compute a "relatively slow" latency threshold for a set of traces.
 *
 * A trace is considered slow only when its latency exceeds 1.75× the median
 * trace latency AND is at least 1s — and only once we have ≥3 timed traces to
 * compare against (otherwise "relative" is meaningless and we return null).
 */
export function computeSlowThresholdMs(durations: Array<number | null>): number | null {
  const valid = durations.filter((d): d is number => d != null && d > 0)
  if (valid.length < 3) return null
  const sorted = [...valid].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  return Math.max(median * 1.75, 1000)
}

/**
 * Derive a transparent health label from a trace's metrics.
 *
 * Precedence (worst-first): low quality → needs review → slow → healthy.
 *   - low:     avgScore < 0.70
 *   - review:  avgScore in [0.70, 0.85) OR no evaluation recorded
 *   - slow:    avgScore ≥ 0.85 but latency beyond the slow threshold
 *   - healthy: avgScore ≥ 0.85 and latency within range
 *   - unknown: neither score nor timing available
 */
export function deriveHealth(
  metrics: Pick<TraceMetrics, 'avgScore' | 'durationMs'>,
  slowThresholdMs: number | null,
): TraceHealth {
  const { avgScore, durationMs } = metrics
  if (avgScore == null && durationMs == null) return 'unknown'
  if (avgScore != null && avgScore < 0.7) return 'low'
  if (avgScore == null || avgScore < 0.85) return 'review'
  if (slowThresholdMs != null && durationMs != null && durationMs > slowThresholdMs) {
    return 'slow'
  }
  return 'healthy'
}

// ---------------------------------------------------------------------------
// Aggregate (dashboard summary) metrics
// ---------------------------------------------------------------------------

export interface AggregateMetrics {
  /** Total traces reported by the list endpoint (not just the enriched page). */
  totalTraces: number
  /** Mean latency across traces that have timing, or null. */
  avgLatencyMs: number | null
  /** Mean evaluation score (0..1) across traces that have evals, or null. */
  avgScore: number | null
  /** Mean spans per enriched trace, or null when nothing is enriched. */
  avgSpansPerTrace: number | null
  /** How many of the listed traces we successfully enriched. */
  enrichedCount: number
}

export function computeAggregate(
  totalTraces: number,
  perTrace: TraceMetrics[],
): AggregateMetrics {
  const latencies = perTrace
    .map((m) => m.durationMs)
    .filter((d): d is number => d != null)
  const scores = perTrace
    .map((m) => m.avgScore)
    .filter((s): s is number => s != null)

  const mean = (xs: number[]) =>
    xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length

  return {
    totalTraces,
    avgLatencyMs: mean(latencies),
    avgScore: mean(scores),
    avgSpansPerTrace:
      perTrace.length === 0
        ? null
        : perTrace.reduce((a, m) => a + m.spanCount, 0) / perTrace.length,
    enrichedCount: perTrace.length,
  }
}
