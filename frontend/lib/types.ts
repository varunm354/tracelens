/**
 * TypeScript interfaces that mirror the TraceLens FastAPI response shapes.
 * Keep in sync with backend/app/schemas/*.py.
 */

export interface Trace {
  /** UUID string, e.g. "a3f1c2d4-0000-0000-0000-000000000000" */
  trace_id: string
  name: string
  /** Arbitrary key/value tags set by the caller, or null. */
  metadata: Record<string, unknown> | null
  /** ISO 8601 datetime string with timezone, e.g. "2026-05-30T01:00:00+00:00" */
  created_at: string
}

export interface TraceListResponse {
  items: Trace[]
  total: number
  limit: number
  offset: number
}

export type SpanKind = 'retrieval' | 'llm' | 'tool' | 'evaluation' | 'function'

export interface Span {
  span_id: string
  trace_id: string
  name: string
  kind: SpanKind
  start_time: string | null
  end_time: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface SpanListResponse {
  items: Span[]
  total: number
}

export interface Evaluation {
  evaluation_id: string
  trace_id: string
  relevance_score: number
  faithfulness_score: number
  groundedness_score: number
  notes: string | null
  created_at: string
}

export interface EvaluationListResponse {
  items: Evaluation[]
  total: number
}

// ---------------------------------------------------------------------------
// RAG observations + generated evaluation results (Phase 9.4)
// ---------------------------------------------------------------------------

export interface RagEvaluationResult {
  evaluation_result_id: string
  trace_id: string
  rag_observation_id: string | null
  span_id: string | null
  metric: string
  score: number | null
  reason: string | null
  source: string
  evaluator: string | null
  judge_version: string | null
  status: string
  error: string | null
  /** Includes judge_type, model, prompt_version, fallback_used, fallback_reason */
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface RagObservation {
  rag_observation_id: string
  trace_id: string
  question: string
  answer: string
  model: string | null
  contexts: Array<Record<string, unknown>>
  latency_ms: number | null
  usage: Record<string, unknown> | null
  reference_answer: string | null
  metadata: Record<string, unknown> | null
  evaluation_status: 'skipped' | 'running' | 'complete' | 'failed' | string
  created_at: string
  evaluations: RagEvaluationResult[]
}

export interface RagObservationListResponse {
  items: RagObservation[]
  total: number
}
