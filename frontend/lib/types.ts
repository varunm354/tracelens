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
