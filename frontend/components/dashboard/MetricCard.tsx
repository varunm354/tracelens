'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CountUp } from '@/components/marketing/motion/CountUp'

interface MetricCardProps {
  label: string
  icon?: LucideIcon
  /** Design-token name (no hsl wrapper), e.g. 'brand' or 'score-pass'. */
  accent?: string
  /** Static value to display (takes precedence over countTo). */
  value?: React.ReactNode
  /** Numeric value to animate up to. Use instead of `value` for clean numbers. */
  countTo?: number
  prefix?: string
  suffix?: string
  /** Small caption under the value (e.g. "across 12 traces"). */
  sublabel?: string
  loading?: boolean
  /** Optional override for the value text color. */
  valueColor?: string
  className?: string
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-muted', className)} />
}

/**
 * A premium-but-restrained dashboard stat card: thin border, a soft accent
 * glow in the corner, an optional icon chip, and an optional animated count-up.
 * Designed to read as a serious observability metric — not a marketing tile.
 */
export function MetricCard({
  label,
  icon: Icon,
  accent = 'brand',
  value,
  countTo,
  prefix,
  suffix,
  sublabel,
  loading,
  valueColor,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:border-border/80',
        className,
      )}
    >
      {/* Soft accent glow in the top-right corner */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full opacity-50 blur-2xl transition-opacity duration-300 group-hover:opacity-80"
        style={{ background: `hsl(var(--${accent}) / 0.18)` }}
      />

      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <span
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ backgroundColor: `hsl(var(--${accent}) / 0.15)` }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: `hsl(var(--${accent}))` }} />
          </span>
        )}
      </div>

      {loading ? (
        <Skeleton className="mt-2 h-7 w-20" />
      ) : (
        <p
          className="mt-1.5 font-mono text-2xl font-semibold leading-none tabular-nums"
          style={valueColor ? { color: valueColor } : undefined}
        >
          {value != null ? (
            value
          ) : countTo != null ? (
            <CountUp value={countTo} prefix={prefix} suffix={suffix} />
          ) : (
            '—'
          )}
        </p>
      )}

      {sublabel && !loading && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">{sublabel}</p>
      )}
    </div>
  )
}
