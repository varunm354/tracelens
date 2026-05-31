'use client'

import { useMemo, useState } from 'react'
import { useTracesWithMetrics } from '@/components/dashboard/useTracesWithMetrics'
import { TraceOverviewCards } from '@/components/dashboard/TraceOverviewCards'
import { TraceTable } from '@/components/traces/TraceTable'

/**
 * Client orchestrator for the /traces dashboard. Runs the enrichment hook once,
 * owns the search query, and feeds derived data to the summary cards and the
 * trace table. Keeping the fan-out in one place means the table rows and the
 * top-line aggregates stay consistent.
 */
export function TracesView() {
  const { rows, aggregate, total, isPending, isError, error, isFetching, refetch, enriching } =
    useTracesWithMetrics()
  const [query, setQuery] = useState('')

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(({ trace }) => {
      if (trace.name.toLowerCase().includes(q)) return true
      if (trace.trace_id.toLowerCase().includes(q)) return true
      if (trace.metadata) {
        for (const [k, v] of Object.entries(trace.metadata)) {
          if (k.toLowerCase().includes(q)) return true
          if (String(v).toLowerCase().includes(q)) return true
        }
      }
      return false
    })
  }, [rows, query])

  return (
    <div className="space-y-6">
      <TraceOverviewCards aggregate={aggregate} loading={isPending} enriching={enriching} />
      <TraceTable
        rows={filteredRows}
        total={total}
        query={query}
        onQueryChange={setQuery}
        isPending={isPending}
        isError={isError}
        error={error}
        isFetching={isFetching}
        onRetry={refetch}
      />
    </div>
  )
}
