import type { ReactNode } from 'react'

interface PageHeaderProps {
  title?: string
  description?: string
  /** Navigation breadcrumb rendered above the title row */
  breadcrumb?: ReactNode
  /** Action buttons rendered at the trailing end of the title row */
  actions?: ReactNode
}

/**
 * Sticky page-level header used by every route.
 * Provides consistent title, breadcrumb, and action slot layout.
 * Stays fixed at the top of the scrollable main area.
 */
export function PageHeader({ title, description, breadcrumb, actions }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm px-6 py-3.5">
      {breadcrumb && (
        <div className="mb-1.5 flex items-center">{breadcrumb}</div>
      )}
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4">
          <div>
            {title && (
              <h1 className="text-lg font-semibold tracking-tight leading-tight">{title}</h1>
            )}
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">{actions}</div>
          )}
        </div>
      )}
    </div>
  )
}
