import { TraceTable } from '@/components/traces/TraceTable'

export default function TracesPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Traces</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All traces ingested from your AI pipelines.
        </p>
      </div>
      <TraceTable />
    </div>
  )
}
