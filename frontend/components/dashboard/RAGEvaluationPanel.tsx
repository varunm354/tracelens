'use client'

import { BrainCircuit } from 'lucide-react'
import { Panel } from '@/components/dashboard/Panel'
import { RAGObservationCard } from '@/components/dashboard/RAGObservationCard'
import { averageRagScore } from '@/lib/ragMetrics'
import { scoreColor, scoreLevel } from '@/lib/metrics'
import type { RagObservation } from '@/lib/types'

interface RAGEvaluationPanelProps {
  observations: RagObservation[]
}

function OverallBadge({ observations }: { observations: RagObservation[] }) {
  const avg = averageRagScore(observations)
  if (avg === null) return null
  const level = scoreLevel(avg)

  return (
    <span
      className="rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{
        backgroundColor: `hsl(var(--score-${level}) / 0.15)`,
        color: scoreColor(avg),
      }}
    >
      avg {Math.round(avg * 100)}%
    </span>
  )
}

export function RAGEvaluationPanel({ observations }: RAGEvaluationPanelProps) {
  return (
    <Panel
      title="RAG Evaluations"
      count={observations.length}
      actions={<OverallBadge observations={observations} />}
    >
      {observations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <BrainCircuit className="h-6 w-6 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">
            No RAG observations recorded for this trace.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {observations.map((obs) => (
            <RAGObservationCard key={obs.rag_observation_id} obs={obs} />
          ))}
        </div>
      )}
    </Panel>
  )
}
