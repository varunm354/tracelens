import { cn } from '@/lib/utils'
import { HEALTH_META, type TraceHealth } from '@/lib/metrics'

interface TraceHealthBadgeProps {
  health: TraceHealth
  /** Larger variant for the detail header. */
  size?: 'sm' | 'md'
  /** Show a leading status dot. */
  dot?: boolean
  className?: string
}

/**
 * Status pill for a derived trace health label (healthy / needs review / slow /
 * low quality / no data). Colors come from the shared score & span-kind tokens.
 * The label is always a transparent function of the trace's own metrics.
 */
export function TraceHealthBadge({
  health,
  size = 'sm',
  dot = true,
  className,
}: TraceHealthBadgeProps) {
  const meta = HEALTH_META[health]
  const color = `hsl(var(--${meta.token}))`

  return (
    <span
      title={meta.description}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        className,
      )}
      style={{
        backgroundColor: `hsl(var(--${meta.token}) / 0.14)`,
        color,
      }}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {meta.label}
    </span>
  )
}
