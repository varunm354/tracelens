'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { RefreshCw, Inbox, AlertCircle } from 'lucide-react'
import { getTraces } from '@/lib/api'
import { cn, formatRelativeTime, shortId } from '@/lib/utils'
import type { Trace } from '@/lib/types'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-muted', className)} />
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
        </tr>
      ))}
    </>
  )
}

function EmptyState() {
  return (
    <tr>
      <td colSpan={4}>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="w-8 h-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No traces yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Send your first trace using the TraceLens SDK or the API.
          </p>
          <code className="mt-3 text-xs font-mono bg-muted px-2 py-1 rounded">
            POST /v1/traces
          </code>
        </div>
      </td>
    </tr>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <tr>
      <td colSpan={4}>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="w-8 h-8 text-destructive mb-3" />
          <p className="text-sm font-medium">Failed to load traces</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm font-mono">{message}</p>
          <button
            onClick={onRetry}
            className="mt-4 text-xs px-3 py-1.5 rounded-md border border-border
                       hover:bg-accent transition-colors"
          >
            Try again
          </button>
        </div>
      </td>
    </tr>
  )
}

function MetadataCell({ metadata }: { metadata: Trace['metadata'] }) {
  if (!metadata) return <span className="text-muted-foreground">—</span>
  const count = Object.keys(metadata).length
  return (
    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
      {count} {count === 1 ? 'key' : 'keys'}
    </span>
  )
}

function TraceRow({ trace, onClick }: { trace: Trace; onClick: () => void }) {
  return (
    <tr
      className="border-b border-border hover:bg-muted/40 transition-colors group cursor-pointer"
      onClick={onClick}
    >
      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
        <span title={trace.created_at}>{formatRelativeTime(trace.created_at)}</span>
      </td>
      <td className="px-4 py-3 text-sm font-medium max-w-xs truncate">
        {trace.name}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
        {shortId(trace.trace_id)}…
      </td>
      <td className="px-4 py-3 text-sm">
        <MetadataCell metadata={trace.metadata} />
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TraceTable() {
  const router = useRouter()
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['traces'],
    queryFn: () => getTraces(),
  })

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <span className="text-sm text-muted-foreground">
          {isPending ? (
            <Skeleton className="h-4 w-24 inline-block" />
          ) : isError ? (
            'Error loading'
          ) : (
            <>
              <span className="font-medium text-foreground">{data.total}</span>{' '}
              {data.total === 1 ? 'trace' : 'traces'}
            </>
          )}
        </span>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-border
                     hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={cn('w-3 h-3', isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">
                Created
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">
                Trace ID
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-28">
                Metadata
              </th>
            </tr>
          </thead>
          <tbody className="bg-card">
            {isPending && <LoadingRows />}
            {isError && (
              <ErrorState
                message={(error as Error).message}
                onRetry={refetch}
              />
            )}
            {data && data.items.length === 0 && <EmptyState />}
            {data?.items.map((trace) => (
              <TraceRow
                key={trace.trace_id}
                trace={trace}
                onClick={() => router.push(`/traces/${trace.trace_id}`)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
