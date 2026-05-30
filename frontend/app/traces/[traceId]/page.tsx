import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { TraceDetail } from '@/components/traces/TraceDetail'

interface Props {
  params: { traceId: string }
}

export default function TraceDetailPage({ params }: Props) {
  return (
    <>
      <PageHeader
        breadcrumb={
          <nav className="flex items-center gap-1.5 text-sm">
            <Link
              href="/traces"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Traces
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
            <span className="font-mono text-xs text-muted-foreground">
              {params.traceId.slice(0, 8)}…
            </span>
          </nav>
        }
      />
      <div className="px-6 py-5">
        <TraceDetail traceId={params.traceId} />
      </div>
    </>
  )
}
