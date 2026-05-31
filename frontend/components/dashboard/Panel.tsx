import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PanelProps {
  title?: string
  /** Small count chip next to the title. */
  count?: number
  /** Trailing controls (buttons, badges) on the header row. */
  actions?: ReactNode
  children: ReactNode
  className?: string
  /** Body padding. Set false for flush content like tables/waterfalls. */
  padded?: boolean
}

/**
 * Consistent dark panel used across the trace detail page: thin border, card
 * surface, optional titled header with a count chip and trailing actions.
 */
export function Panel({ title, count, actions, children, className, padded = true }: PanelProps) {
  return (
    <section className={cn('overflow-hidden rounded-xl border border-border bg-card', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {count !== undefined && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {count}
              </span>
            )}
          </div>
          {actions}
        </div>
      )}
      <div className={cn(padded && 'p-4')}>{children}</div>
    </section>
  )
}
