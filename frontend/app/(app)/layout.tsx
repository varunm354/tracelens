import { Providers } from '@/app/providers'
import { Sidebar } from '@/components/layout/Sidebar'

/**
 * Dashboard shell. Wraps every route under the (app) route group with the
 * TanStack Query provider, the sidebar, and the scrollable main area.
 * The (app) group does not affect URLs — /traces stays /traces.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-background">{children}</main>
      </div>
    </Providers>
  )
}
