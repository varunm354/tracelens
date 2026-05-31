'use client'

import { ChevronRight, Code2 } from 'lucide-react'
import { spanDurationMs } from '@/lib/utils'
import type { Trace, Span, Evaluation } from '@/lib/types'

interface RawDataPanelProps {
  trace: Trace | undefined
  spans: Span[]
  evaluations: Evaluation[]
}

/**
 * Collapsible "raw data" inspector — makes the detail page feel like a real
 * developer tool. Shows the trace metadata plus compact summaries of spans and
 * evaluations as formatted JSON, without dumping every raw field.
 */
export function RawDataPanel({ trace, spans, evaluations }: RawDataPanelProps) {
  const payload = {
    trace: trace
      ? { trace_id: trace.trace_id, name: trace.name, created_at: trace.created_at, metadata: trace.metadata }
      : null,
    spans: spans.map((s) => ({
      span_id: s.span_id,
      name: s.name,
      kind: s.kind,
      duration_ms: spanDurationMs(s),
      metadata: s.metadata,
    })),
    evaluations: evaluations.map((e) => ({
      evaluation_id: e.evaluation_id,
      relevance: e.relevance_score,
      faithfulness: e.faithfulness_score,
      groundedness: e.groundedness_score,
      notes: e.notes,
    })),
  }

  return (
    <details className="group overflow-hidden rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
        <Code2 className="h-4 w-4 text-muted-foreground" />
        Raw data
        <span className="ml-auto font-mono text-[11px] font-normal text-muted-foreground">
          {spans.length} spans · {evaluations.length} evals
        </span>
      </summary>
      <div className="border-t border-border">
        <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </div>
    </details>
  )
}
