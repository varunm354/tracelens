'use client'

import { MessageSquareQuote } from 'lucide-react'
import { Panel } from '@/components/dashboard/Panel'
import { formatRelativeTime, shortId } from '@/lib/utils'
import {
  scoreColor,
  scoreLevel,
  averageEvaluationScore,
  type ScoreLevel,
} from '@/lib/metrics'
import type { Evaluation } from '@/lib/types'

const ASSESSMENT: Record<ScoreLevel, string> = {
  pass: 'Strong',
  warn: 'Needs review',
  fail: 'Weak',
}

function ScoreGauge({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)
  const color = scoreColor(value)
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/50">
        <div className="h-full rounded-full animate-grow-x" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-9 text-right font-mono text-sm font-semibold tabular-nums" style={{ color }}>
        {pct}%
      </span>
    </div>
  )
}

function EvaluationCard({ evaluation }: { evaluation: Evaluation }) {
  const avg =
    (evaluation.relevance_score + evaluation.faithfulness_score + evaluation.groundedness_score) / 3
  const level = scoreLevel(avg)

  return (
    <div className="rounded-lg border border-border bg-background/40 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {shortId(evaluation.evaluation_id)}…
          </span>
          <span className="shrink-0 text-muted-foreground/40">·</span>
          <span className="truncate text-xs text-muted-foreground" title={evaluation.created_at}>
            {formatRelativeTime(evaluation.created_at)}
          </span>
        </div>
        <span
          className="ml-3 shrink-0 rounded-full px-2 py-0.5 font-mono text-xs font-semibold"
          style={{ backgroundColor: `hsl(var(--score-${level}) / 0.15)`, color: scoreColor(avg) }}
        >
          avg {Math.round(avg * 100)}%
        </span>
      </div>

      <div className="space-y-2.5">
        <ScoreGauge label="Relevance" value={evaluation.relevance_score} />
        <ScoreGauge label="Faithfulness" value={evaluation.faithfulness_score} />
        <ScoreGauge label="Groundedness" value={evaluation.groundedness_score} />
      </div>

      {evaluation.notes && (
        <div className="mt-4 flex gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <MessageSquareQuote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-sm leading-relaxed text-foreground/80">{evaluation.notes}</p>
        </div>
      )}
    </div>
  )
}

export function EvaluationPanel({ evaluations }: { evaluations: Evaluation[] }) {
  const overall = averageEvaluationScore(evaluations)
  const level = overall != null ? scoreLevel(overall) : null

  return (
    <Panel
      title="Evaluations"
      count={evaluations.length}
      actions={
        overall != null && level ? (
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ backgroundColor: `hsl(var(--score-${level}) / 0.15)`, color: scoreColor(overall) }}
          >
            {ASSESSMENT[level]} · {Math.round(overall * 100)}%
          </span>
        ) : undefined
      }
    >
      {evaluations.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No evaluations recorded for this trace.
        </p>
      ) : (
        <div className="space-y-3">
          {evaluations.map((ev) => (
            <EvaluationCard key={ev.evaluation_id} evaluation={ev} />
          ))}
        </div>
      )}
    </Panel>
  )
}
