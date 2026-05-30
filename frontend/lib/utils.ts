import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind class names, resolving conflicts correctly. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert an ISO 8601 datetime string to a human-readable relative time.
 * Falls back to an absolute date for anything older than 7 days.
 */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const diffMs = Date.now() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Truncate a UUID to its first 8 characters for compact display. */
export function shortId(uuid: string): string {
  return uuid.slice(0, 8)
}

/**
 * Format a duration in milliseconds into a human-readable string.
 * Used by both SpanWaterfall bars and the TraceOverview duration stat.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`
  return `${(ms / 60_000).toFixed(1)}m`
}

/**
 * Compute the wall-clock span covered by a set of timed spans.
 * Returns null when no spans carry start/end timestamps.
 * Accepts a structural subtype so it works without importing the full Span type.
 */
export function computeSpanDurationMs(
  spans: Array<{ start_time: string | null; end_time: string | null }>,
): number | null {
  const starts = spans
    .filter((s) => s.start_time != null)
    .map((s) => new Date(s.start_time!).getTime())

  const ends = spans
    .filter((s) => s.end_time != null)
    .map((s) => new Date(s.end_time!).getTime())

  if (starts.length === 0) return null

  const earliest = Math.min(...starts)
  const latest = Math.max(...(ends.length > 0 ? ends : starts))
  return Math.max(latest - earliest, 0)
}

