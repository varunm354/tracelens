import type {
  TraceListResponse,
  Trace,
  SpanListResponse,
  EvaluationListResponse,
} from '@/lib/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    // Always fetch fresh — TanStack Query owns the cache.
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${body}`)
  }
  return res.json() as Promise<T>
}

export function getTraces(limit = 50, offset = 0): Promise<TraceListResponse> {
  return apiFetch<TraceListResponse>(`/v1/traces?limit=${limit}&offset=${offset}`)
}

export function getTrace(traceId: string): Promise<Trace> {
  return apiFetch<Trace>(`/v1/traces/${traceId}`)
}

export function getSpans(traceId: string): Promise<SpanListResponse> {
  return apiFetch<SpanListResponse>(`/v1/traces/${traceId}/spans`)
}

export function getEvaluations(traceId: string): Promise<EvaluationListResponse> {
  return apiFetch<EvaluationListResponse>(`/v1/traces/${traceId}/evaluations`)
}
