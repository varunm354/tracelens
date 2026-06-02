import { scoreColor } from '@/lib/metrics'

interface ScoreGaugeProps {
  label: string
  value: number
}

/**
 * A single score row: label + proportional bar + percentage.
 * Shared between the legacy EvaluationPanel and RAGObservationCard.
 */
export function ScoreGauge({ label, value }: ScoreGaugeProps) {
  const pct = Math.round(value * 100)
  const color = scoreColor(value)

  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-full animate-grow-x"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span
        className="w-9 text-right font-mono text-sm font-semibold tabular-nums"
        style={{ color }}
      >
        {pct}%
      </span>
    </div>
  )
}
