import { PageHeader } from '@/components/layout/PageHeader'
import { TraceTable } from '@/components/traces/TraceTable'

export default function TracesPage() {
  return (
    <>
      <PageHeader
        title="Traces"
        description="All traces ingested from your AI pipelines."
      />
      <div className="px-6 py-5">
        <TraceTable />
      </div>
    </>
  )
}
