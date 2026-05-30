'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Eye, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

const navItems = [
  { href: '/traces', label: 'Traces', icon: Activity },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-56 shrink-0 border-r border-border bg-card">
      {/* Logo lockup */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border">
        <div
          className="flex items-center justify-center w-7 h-7 rounded-md"
          style={{ backgroundColor: 'hsl(var(--brand) / 0.15)' }}
        >
          <Eye className="w-4 h-4" style={{ color: 'hsl(var(--brand))' }} />
        </div>
        <span className="font-semibold text-sm tracking-tight">TraceLens</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
            >
              <Icon
                className="w-4 h-4 shrink-0"
                style={isActive ? { color: 'hsl(var(--brand))' } : undefined}
              />
              <span>{label}</span>
              {isActive && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: 'hsl(var(--brand))' }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer: version + theme toggle */}
      <div className="flex items-center justify-between px-3 py-3 border-t border-border">
        <span className="font-mono text-[11px] text-muted-foreground">v0.1.0</span>
        <ThemeToggle />
      </div>
    </aside>
  )
}
