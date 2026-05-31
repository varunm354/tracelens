import { MarketingNav } from '@/components/marketing/MarketingNav'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'
import { AmbientTraceField } from '@/components/marketing/AmbientTraceField'

/**
 * Full-bleed marketing layout for the public landing page.
 * Deliberately does NOT include the dashboard Sidebar or the TanStack Query
 * Providers — the landing page is static and self-contained.
 * Inherits the dark theme + design tokens from the root layout.
 *
 * The wrapper intentionally has no opaque background — the body paints the base
 * color and `AmbientTraceField` (fixed, -z-10) shows through behind the content,
 * giving every section a shared sense of depth and data flow.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen text-foreground">
      <AmbientTraceField />
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  )
}
