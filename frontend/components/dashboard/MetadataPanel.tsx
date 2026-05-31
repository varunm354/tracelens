'use client'

import { useState } from 'react'
import { Copy, Check, Braces } from 'lucide-react'
import { Panel } from '@/components/dashboard/Panel'

interface MetadataPanelProps {
  metadata: Record<string, unknown> | null
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy JSON'}
    </button>
  )
}

/**
 * Clean key/value view of a trace's metadata. Values are rendered in monospace;
 * objects/arrays are JSON-stringified. Includes a copy-as-JSON action so the
 * panel doubles as a quick debugging tool.
 */
export function MetadataPanel({ metadata }: MetadataPanelProps) {
  const entries = metadata ? Object.entries(metadata) : []

  return (
    <Panel
      title="Metadata"
      count={entries.length}
      actions={entries.length > 0 ? <CopyButton value={JSON.stringify(metadata, null, 2)} /> : undefined}
    >
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Braces className="mb-2 h-5 w-5 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">No metadata attached to this trace.</p>
        </div>
      ) : (
        <dl className="divide-y divide-border/60">
          {entries.map(([key, value]) => {
            const display =
              typeof value === 'object' && value !== null
                ? JSON.stringify(value)
                : String(value)
            return (
              <div key={key} className="flex items-start justify-between gap-4 py-2 first:pt-0 last:pb-0">
                <dt className="font-mono text-xs text-muted-foreground">{key}</dt>
                <dd className="break-all text-right font-mono text-xs text-foreground">{display}</dd>
              </div>
            )
          })}
        </dl>
      )}
    </Panel>
  )
}
