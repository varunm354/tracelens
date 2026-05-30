import Link from 'next/link'
import { Activity } from 'lucide-react'

export function Sidebar() {
  return (
    <aside className="flex flex-col w-56 shrink-0 border-r border-border bg-card">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary">
          <Activity className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm tracking-tight">TraceLens</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        <Link
          href="/traces"
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium
                     text-muted-foreground hover:text-foreground hover:bg-accent
                     transition-colors"
        >
          <Activity className="w-4 h-4" />
          Traces
        </Link>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <p className="text-[11px] text-muted-foreground">v0.1.0</p>
      </div>
    </aside>
  )
}
