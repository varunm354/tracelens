import Link from 'next/link'
import { Eye } from 'lucide-react'

/**
 * Minimal marketing footer. Server component.
 * No fake links or claims — only real destinations and an honest tech credit.
 */
export function MarketingFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ backgroundColor: 'hsl(var(--brand) / 0.15)' }}
          >
            <Eye className="h-3.5 w-3.5" style={{ color: 'hsl(var(--brand))' }} />
          </div>
          <span className="text-sm font-medium">TraceLens</span>
          <span className="text-sm text-muted-foreground">
            · Observability for RAG &amp; AI agents
          </span>
        </div>

        <div className="flex items-center gap-5 text-sm text-muted-foreground">
          <Link href="/traces" className="transition-colors hover:text-foreground">
            Dashboard
          </Link>
          <a href="#" className="transition-colors hover:text-foreground">
            GitHub
          </a>
          <span className="font-mono text-xs">© {year}</span>
        </div>
      </div>
    </footer>
  )
}
