import Link from 'next/link'
import { Eye, Github, ArrowRight } from 'lucide-react'

/**
 * Minimal sticky top navigation for the marketing landing page.
 * Server component — no client state yet (scroll effects come in a later phase).
 */
export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{ backgroundColor: 'hsl(var(--brand) / 0.15)' }}
          >
            <Eye className="h-4 w-4" style={{ color: 'hsl(var(--brand))' }} />
          </div>
          <span className="font-semibold tracking-tight">TraceLens</span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1.5">
          <a
            href="#"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium
                       text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <Link
            href="/traces"
            className="group flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium
                       text-foreground transition-colors hover:bg-accent"
          >
            Open dashboard
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </nav>
    </header>
  )
}
