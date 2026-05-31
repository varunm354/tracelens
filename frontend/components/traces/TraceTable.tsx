'use client'

import { useRouter } from 'next/navigation'
import { RefreshCw, Inbox, AlertCircle, Search, SearchX } from 'lucide-react'
import { cn, formatRelativeTime, shortId, formatDuration } from '@/lib/utils'
import type { EnrichedTrace } from '@/components/dashboard/useTracesWithMetrics'
import { TraceHealthBadge } from '@/components/dashboard/TraceHealthBadge'
import { ScoreBadge } from '@/components/dashboard/ScoreBadge'

const COL_COUNT = 8

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('inline-block animate-pulse rounded bg-muted align-middle', className)} />
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          <td className="px-4 py-3.5"><Skeleton className="h-5 w-20" /></td>
          <td className="px-4 py-3.5"><Skeleton className="h-4 w-44" /></td>
          <td className="px-4 py-3.5"><Skeleton className="h-4 w-16" /></td>
          <td className="px-4 py-3.5"><Skeleton className="h-4 w-14" /></td>
          <td className="px-4 py-3.5"><Skeleton className="h-4 w-8" /></td>
          <td className="px-4 py-3.5"><Skeleton className="h-5 w-10" /></td>
          <td className="px-4 py-3.5"><Skeleton className="h-5 w-12" /></td>
          <td className="px-4 py-3.5"><Skeleton className="h-4 w-16" /></td>
        </tr>
      ))}
    </>
  )
}

function FullRow({ children }: { children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={COL_COUNT}>{children}</td>
    </tr>
  )
}

function EmptyState() {
  return (
    <FullRow>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">No traces yet</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Send your first trace using the TraceLens SDK or the API.
        </p>
        <code className="mt-3 rounded bg-muted px-2 py-1 font-mono text-xs">POST /v1/traces</code>
      </div>
    </FullRow>
  )
}

function NoMatchState({ query }: { query: string }) {
  return (
    <FullRow>
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <SearchX className="mb-3 h-7 w-7 text-muted-foreground" />
        <p className="text-sm font-medium">No traces match “{query}”</p>
        <p className="mt-1 text-xs text-muted-foreground">Try a different name, ID, or metadata value.</p>
      </div>
    </FullRow>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <FullRow>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">Failed to load traces</p>
        <p className="mt-1 max-w-sm font-mono text-xs text-muted-foreground">{message}</p>
        <button
          onClick={onRetry}
          className="mt-4 rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:bg-accent"
        >
          Try again
        </button>
      </div>
    </FullRow>
  )
}

function MetadataCell({ count }: { count: number }) {
  if (count === 0) return <span className="text-muted-foreground/60">—</span>
  return (
    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
      {count} {count === 1 ? 'key' : 'keys'}
    </span>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground',
        className,
      )}
    >
      {children}
    </th>
  )
}

function TraceRow({ row, onClick }: { row: EnrichedTrace; onClick: () => void }) {
  const { trace, metrics, loading } = row
  return (
    <tr
      onClick={onClick}
      className="group relative cursor-pointer border-b border-border transition-colors hover:bg-muted/40"
    >
      {/* Health */}
      <td className="px-4 py-3 align-middle">
        {/* Subtle hover accent bar */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-full w-0.5 opacity-0 transition-opacity group-hover:opacity-100"
          style={{ backgroundColor: 'hsl(var(--brand))' }}
        />
        {loading ? <Skeleton className="h-5 w-20" /> : <TraceHealthBadge health={row.health} />}
      </td>

      {/* Name */}
      <td className="max-w-xs truncate px-4 py-3 align-middle text-sm font-medium" title={trace.name}>
        {trace.name}
      </td>

      {/* Created */}
      <td className="whitespace-nowrap px-4 py-3 align-middle text-sm text-muted-foreground">
        <span title={trace.created_at}>{formatRelativeTime(trace.created_at)}</span>
      </td>

      {/* Duration */}
      <td className="whitespace-nowrap px-4 py-3 align-middle font-mono text-xs tabular-nums">
        {loading ? (
          <Skeleton className="h-4 w-12" />
        ) : metrics?.durationMs != null ? (
          formatDuration(metrics.durationMs)
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </td>

      {/* Spans */}
      <td className="px-4 py-3 align-middle font-mono text-xs tabular-nums">
        {loading ? (
          <Skeleton className="h-4 w-6" />
        ) : metrics ? (
          metrics.spanCount
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </td>

      {/* Score */}
      <td className="px-4 py-3 align-middle">
        {loading ? <Skeleton className="h-5 w-10" /> : <ScoreBadge value={metrics?.avgScore ?? null} />}
      </td>

      {/* Metadata */}
      <td className="px-4 py-3 align-middle text-sm">
        <MetadataCell count={metrics?.metadataCount ?? (trace.metadata ? Object.keys(trace.metadata).length : 0)} />
      </td>

      {/* Trace ID */}
      <td className="px-4 py-3 align-middle font-mono text-xs text-muted-foreground">
        {shortId(trace.trace_id)}…
      </td>
    </tr>
  )
}

interface TraceTableProps {
  rows: EnrichedTrace[]
  total: number
  query: string
  onQueryChange: (q: string) => void
  isPending: boolean
  isError: boolean
  error: Error | null
  isFetching: boolean
  onRetry: () => void
}

/**
 * Presentational, information-dense trace table. Receives already-enriched +
 * filtered rows from `TracesView`. Each row surfaces derived operational
 * metrics (health, latency, span count, score) alongside the trace basics.
 */
export function TraceTable({
  rows,
  total,
  query,
  onQueryChange,
  isPending,
  isError,
  error,
  isFetching,
  onRetry,
}: TraceTableProps) {
  const router = useRouter()
  const hasQuery = query.trim().length > 0

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-muted-foreground">
          {isPending ? (
            <Skeleton className="h-4 w-24" />
          ) : isError ? (
            'Error loading'
          ) : (
            <>
              <span className="font-medium text-foreground">{hasQuery ? rows.length : total}</span>{' '}
              {hasQuery ? `of ${total} ` : ''}
              {total === 1 && !hasQuery ? 'trace' : 'traces'}
            </>
          )}
        </span>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search name, ID, metadata…"
              className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-ring sm:w-64"
            />
          </div>
          <button
            onClick={onRetry}
            disabled={isFetching}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <Th className="w-28">Status</Th>
              <Th>Name</Th>
              <Th className="w-28">Created</Th>
              <Th className="w-24">Duration</Th>
              <Th className="w-16">Spans</Th>
              <Th className="w-20">Score</Th>
              <Th className="w-24">Metadata</Th>
              <Th className="w-28">Trace ID</Th>
            </tr>
          </thead>
          <tbody className="bg-card">
            {isPending && <LoadingRows />}
            {isError && <ErrorState message={error?.message ?? 'Unknown error'} onRetry={onRetry} />}
            {!isPending && !isError && total === 0 && <EmptyState />}
            {!isPending && !isError && total > 0 && rows.length === 0 && hasQuery && (
              <NoMatchState query={query.trim()} />
            )}
            {rows.map((row) => (
              <TraceRow
                key={row.trace.trace_id}
                row={row}
                onClick={() => router.push(`/traces/${row.trace.trace_id}`)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
