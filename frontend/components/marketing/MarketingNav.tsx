'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, Github, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Sticky top navigation for the marketing landing page.
 * Starts transparent over the hero, then settles into a frosted-glass bar with
 * a subtle border + brand glow once the user scrolls — a small touch that makes
 * the page feel more polished without being distracting.
 */
export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b border-border/60 bg-background/70 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
      )}
      style={
        scrolled
          ? { boxShadow: '0 1px 0 hsl(var(--brand) / 0.15), 0 8px 30px -12px hsl(var(--brand) / 0.25)' }
          : undefined
      }
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md transition-transform group-hover:scale-105"
            style={{ backgroundColor: 'hsl(var(--brand) / 0.15)' }}
          >
            <Eye className="h-4 w-4" style={{ color: 'hsl(var(--brand))' }} />
          </div>
          <span className="font-semibold tracking-tight">TraceLens</span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1.5">
          <a
            href="https://github.com/varunm354/tracelens"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium
                       text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <Link
            href="/traces"
            className="group flex items-center gap-1.5 rounded-md border border-border bg-card/50 px-3 py-1.5 text-sm font-medium
                       text-foreground backdrop-blur-sm transition-colors hover:bg-accent"
          >
            Open dashboard
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </nav>
    </header>
  )
}
