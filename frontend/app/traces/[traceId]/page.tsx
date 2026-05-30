import { TraceDetail } from '@/components/traces/TraceDetail'

interface Props {
  params: { traceId: string }
}

export default function TraceDetailPage({ params }: Props) {
  return (
    <div className="p-8">
      <TraceDetail traceId={params.traceId} />
    </div>
  )
}
