import { PageHeader } from '@/components/layout/PageHeader'
import { TracesView } from '@/components/dashboard/TracesView'

export default function TracesPage() {
  return (
    <>
      <PageHeader
        title="Traces"
        description="All traces ingested from your AI pipelines."
      />
      <div className="px-6 py-5">
        <TracesView />
      </div>
    </>
  )
}
