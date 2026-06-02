/**
 * Pure helpers for RAG observation metric display (Phase 9.4).
 *
 * All functions are free of side-effects so they can be used in components,
 * tests, or any server-side utility without importing the React runtime.
 */

import type { RagEvaluationResult, RagObservation } from '@/lib/types'

// ---------------------------------------------------------------------------
// Metric ordering + display labels
// ---------------------------------------------------------------------------

/** Canonical display order for the four generated RAG metrics. */
export const RAG_METRIC_ORDER = [
  'context_relevance',
  'faithfulness',
  'answer_quality',
  'overall',
] as const

export type RagMetricName = (typeof RAG_METRIC_ORDER)[number]

export const RAG_METRIC_LABELS: Record<string, string> = {
  context_relevance: 'Context relevance',
  faithfulness: 'Faithfulness',
  answer_quality: 'Answer quality',
  overall: 'Overall',
}

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Return the EvaluationResult row for a specific metric, or undefined. */
export function findRagMetric(
  obs: RagObservation,
  metric: string,
): RagEvaluationResult | undefined {
  return obs.evaluations.find((e) => e.metric === metric)
}

/** Return the 0–1 "overall" score for an observation, or null. */
export function getRagOverallScore(obs: RagObservation): number | null {
  const row = findRagMetric(obs, 'overall')
  return row?.score ?? null
}

/**
 * Average the overall scores across multiple observations.
 * Returns null when none of the observations have a completed "overall" score.
 */
export function averageRagScore(observations: RagObservation[]): number | null {
  const scores = observations.map(getRagOverallScore).filter((s): s is number => s !== null)
  if (scores.length === 0) return null
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

// ---------------------------------------------------------------------------
// Judge provenance helpers
// ---------------------------------------------------------------------------

/**
 * Return a short human-readable judge label for display in a badge.
 * Examples: "Heuristic", "LLM · gpt-4.1-mini", "LLM (fallback)"
 */
export function formatJudgeLabel(obs: RagObservation): string {
  const firstEval = obs.evaluations[0]
  if (!firstEval) return 'Unknown'

  const evaluator = firstEval.evaluator ?? 'unknown'
  const meta = firstEval.metadata

  if (evaluator === 'heuristic') {
    // Check if this was a fallback from an LLM attempt
    if (meta && meta.fallback_used === true) {
      return 'LLM (fallback)'
    }
    return 'Heuristic'
  }

  if (evaluator === 'llm') {
    const model = typeof meta?.model === 'string' ? meta.model : null
    return model ? `LLM · ${model}` : 'LLM'
  }

  return evaluator.charAt(0).toUpperCase() + evaluator.slice(1)
}

/** True if any evaluation result has fallback_used=true in its metadata. */
export function hasFallback(obs: RagObservation): boolean {
  return obs.evaluations.some((e) => e.metadata?.fallback_used === true)
}

/** Return the fallback_reason from the first evaluation result that has one. */
export function getFallbackReason(obs: RagObservation): string | null {
  for (const e of obs.evaluations) {
    const reason = e.metadata?.fallback_reason
    if (typeof reason === 'string' && reason.length > 0) return reason
  }
  return null
}

// ---------------------------------------------------------------------------
// Evaluation status helpers
// ---------------------------------------------------------------------------

export type EvalStatusMeta = {
  label: string
  /** Design token name — e.g. 'score-pass', 'score-fail', 'kind-function' */
  token: string
  pulse?: boolean
}

export const EVAL_STATUS_META: Record<string, EvalStatusMeta> = {
  complete: { label: 'Evaluated', token: 'score-pass' },
  skipped: { label: 'Not evaluated', token: 'kind-function' },
  running: { label: 'Running…', token: 'score-warn', pulse: true },
  failed: { label: 'Failed', token: 'score-fail' },
}

export function getEvalStatusMeta(status: string): EvalStatusMeta {
  return EVAL_STATUS_META[status] ?? { label: status, token: 'kind-function' }
}
