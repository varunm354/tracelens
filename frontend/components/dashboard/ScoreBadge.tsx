import { cn } from '@/lib/utils'
import { scoreLevel } from '@/lib/metrics'

interface ScoreBadgeProps {
  /** Score as a 0..1 fraction, or null when no evaluation exists. */
  value: number | null
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Compact evaluation-score pill, color-coded green/amber/red via the
 * --score-* tokens. Renders a muted "—" placeholder when no eval is present.
 */
export function ScoreBadge({ value, size = 'sm', className }: ScoreBadgeProps) {
  if (value == null) {
    return <span className="text-xs text-muted-foreground/60">—</span>
  }

  const level = scoreLevel(value)
  const color = `hsl(var(--score-${level}))`
  const pct = Math.round(value * 100)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-mono font-semibold tabular-nums',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs',
        className,
      )}
      style={{ backgroundColor: `hsl(var(--score-${level}) / 0.15)`, color }}
    >
      {pct}%
    </span>
  )
}
