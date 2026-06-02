'use client'

import { AlertTriangle } from 'lucide-react'
import { ScoreGauge } from '@/components/dashboard/ScoreGauge'
import { formatRelativeTime, formatDuration, shortId } from '@/lib/utils'
import { scoreColor, scoreLevel } from '@/lib/metrics'
import {
  RAG_METRIC_ORDER,
  RAG_METRIC_LABELS,
  findRagMetric,
  getRagOverallScore,
  formatJudgeLabel,
  hasFallback,
  getFallbackReason,
  getEvalStatusMeta,
} from '@/lib/ragMetrics'
import type { RagObservation } from '@/lib/types'

// ---------------------------------------------------------------------------
// Small sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const meta = getEvalStatusMeta(status)
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold${meta.pulse ? ' animate-pulse' : ''}`}
      style={{
        backgroundColor: `hsl(var(--${meta.token}) / 0.15)`,
        color: `hsl(var(--${meta.token}))`,
      }}
    >
      {meta.label}
    </span>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
      {children}
    </span>
  )
}

function ExpandSection({
  summary,
  children,
}: {
  summary: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span className="inline-block transition-transform group-open:rotate-90">▶</span>
        {summary}
      </summary>
      <div className="mt-1.5 pl-4">{children}</div>
    </details>
  )
}

// ---------------------------------------------------------------------------
// Scores section (only when evaluation_status === 'complete')
// ---------------------------------------------------------------------------

function ScoresBlock({ obs }: { obs: RagObservation }) {
  const overall = getRagOverallScore(obs)

  return (
    <div className="mt-3 rounded-lg border border-border bg-background/30 p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Evaluation scores
        </span>
        {overall !== null && (
          <span
            className="rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold"
            style={{
              backgroundColor: `hsl(var(--score-${scoreLevel(overall)}) / 0.15)`,
              color: scoreColor(overall),
            }}
          >
            overall {Math.round(overall * 100)}%
          </span>
        )}
      </div>

      <div className="space-y-2">
        {RAG_METRIC_ORDER.filter((m) => m !== 'overall').map((metric) => {
          const row = findRagMetric(obs, metric)
          if (!row || row.score === null) return null
          return (
            <ScoreGauge
              key={metric}
              label={RAG_METRIC_LABELS[metric] ?? metric}
              value={row.score}
            />
          )
        })}
        {/* Overall last */}
        {overall !== null && (
          <ScoreGauge label={RAG_METRIC_LABELS['overall']} value={overall} />
        )}
      </div>

      {/* Expandable metric reasons */}
      <div className="mt-3 border-t border-border pt-2">
        <ExpandSection summary="Metric reasons">
          <div className="space-y-2.5">
            {RAG_METRIC_ORDER.map((metric) => {
              const row = findRagMetric(obs, metric)
              if (!row?.reason) return null
              return (
                <div key={metric}>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {RAG_METRIC_LABELS[metric] ?? metric}
                  </span>
                  <p className="mt-0.5 text-xs leading-relaxed text-foreground/80">
                    {row.reason}
                  </p>
                </div>
              )
            })}
          </div>
        </ExpandSection>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Failed evaluation notice
// ---------------------------------------------------------------------------

function FailedBlock({ obs }: { obs: RagObservation }) {
  const failedRow = obs.evaluations.find((e) => e.status === 'failed')
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{failedRow?.error ?? 'Evaluation failed. Check backend logs.'}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Contexts section
// ---------------------------------------------------------------------------

function ContextsSection({ contexts }: { contexts: Array<Record<string, unknown>> }) {
  if (contexts.length === 0) return null

  const preview = contexts.slice(0, 2)
  const rest = contexts.slice(2)

  return (
    <div className="mt-2 border-t border-border pt-2">
      <ExpandSection summary={`${contexts.length} retrieved context${contexts.length === 1 ? '' : 's'}`}>
        <div className="space-y-1.5">
          {preview.map((ctx, i) => (
            <ContextItem key={i} ctx={ctx} index={i} />
          ))}
          {rest.length > 0 && (
            <details className="group/inner">
              <summary className="cursor-pointer list-none text-[11px] text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                <span className="transition-transform group-open/inner:hidden">▶</span>
                <span className="hidden group-open/inner:inline">▼</span>
                {' '}Show {rest.length} more…
              </summary>
              <div className="mt-1.5 space-y-1.5">
                {rest.map((ctx, i) => (
                  <ContextItem key={i + 2} ctx={ctx} index={i + 2} />
                ))}
              </div>
            </details>
          )}
        </div>
      </ExpandSection>
    </div>
  )
}

function ContextItem({ ctx, index }: { ctx: Record<string, unknown>; index: number }) {
  const text = typeof ctx.text === 'string' ? ctx.text : JSON.stringify(ctx)
  const score = typeof ctx.score === 'number' ? ctx.score : null

  return (
    <div className="rounded border border-border bg-muted/30 px-2.5 py-2">
      <div className="mb-1 flex items-center gap-2">
        <span className="font-mono text-[10px] text-muted-foreground/60">#{index + 1}</span>
        {score !== null && (
          <span
            className="font-mono text-[10px] font-semibold"
            style={{ color: scoreColor(score) }}
          >
            {(score * 100).toFixed(0)}% match
          </span>
        )}
      </div>
      <p className="text-xs leading-relaxed text-foreground/80">{text}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------

export function RAGObservationCard({ obs }: { obs: RagObservation }) {
  const judgeLabel = formatJudgeLabel(obs)
  const fallback = hasFallback(obs)
  const fallbackReason = getFallbackReason(obs)
  const overallScore = getRagOverallScore(obs)

  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-medium leading-snug text-foreground"
            title={obs.question}
          >
            {obs.question}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <StatusBadge status={obs.evaluation_status} />
          {overallScore !== null && (
            <span
              className="rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold"
              style={{
                backgroundColor: `hsl(var(--score-${scoreLevel(overallScore)}) / 0.15)`,
                color: scoreColor(overallScore),
              }}
            >
              {Math.round(overallScore * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* Meta chips row */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[10px] text-muted-foreground">
          {shortId(obs.rag_observation_id)}…
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-[11px] text-muted-foreground" title={obs.created_at}>
          {formatRelativeTime(obs.created_at)}
        </span>
        {obs.model && <Chip>{obs.model}</Chip>}
        {obs.latency_ms !== null && obs.latency_ms !== undefined && (
          <Chip>{formatDuration(obs.latency_ms)}</Chip>
        )}
        {/* Judge badge */}
        <span
          className="inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold"
          style={{
            backgroundColor: 'hsl(var(--brand) / 0.12)',
            color: 'hsl(var(--brand))',
          }}
        >
          {judgeLabel}
        </span>
        {/* Fallback badge */}
        {fallback && (
          <span
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold"
            style={{
              backgroundColor: 'hsl(var(--score-warn) / 0.12)',
              color: 'hsl(var(--score-warn))',
            }}
            title={fallbackReason ?? 'LLM failed; heuristic fallback used'}
          >
            <AlertTriangle className="h-3 w-3" />
            Fallback
          </span>
        )}
      </div>

      {/* Scores */}
      {obs.evaluation_status === 'complete' && obs.evaluations.length > 0 && (
        <ScoresBlock obs={obs} />
      )}

      {/* Failed state */}
      {obs.evaluation_status === 'failed' && <FailedBlock obs={obs} />}

      {/* Expandable contexts */}
      <ContextsSection contexts={obs.contexts} />

      {/* Expandable answer */}
      <div className="mt-2 border-t border-border pt-2">
        <ExpandSection summary="Generated answer">
          <p className="text-xs leading-relaxed text-foreground/80">{obs.answer}</p>
        </ExpandSection>
      </div>

      {/* Reference answer (only when provided) */}
      {obs.reference_answer && (
        <div className="mt-1">
          <ExpandSection summary="Reference answer">
            <p className="text-xs leading-relaxed text-foreground/80">{obs.reference_answer}</p>
          </ExpandSection>
        </div>
      )}
    </div>
  )
}
