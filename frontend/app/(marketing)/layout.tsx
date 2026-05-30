import { MarketingNav } from '@/components/marketing/MarketingNav'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'

/**
 * Full-bleed marketing layout for the public landing page.
 * Deliberately does NOT include the dashboard Sidebar or the TanStack Query
 * Providers — the landing page is static and self-contained.
 * Inherits the dark theme + design tokens from the root layout.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  )
}
