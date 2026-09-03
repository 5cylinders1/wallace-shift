import { useCallback, useRef, useState } from 'react'
import { auditCopy } from '../content/audit'

export type AuditStatus = 'idle' | 'running' | 'done' | 'error'
export type ErrorKey = keyof typeof auditCopy.errors

export interface AuditMetric {
  display: string | null
  value: number | null
}

export interface AuditFrame {
  data: string
  timing: number | null
}

export interface AuditResult {
  url: string
  /** Data URI of the finished page as Chrome rendered it. May be absent. */
  screenshot: string | null
  /** The page mid-load, in order. May be empty. */
  frames: AuditFrame[]
  scores: {
    performance: number | null
    seo: number | null
    accessibility: number | null
  }
  metrics: Record<'lcp' | 'cls' | 'tbt' | 'fcp', AuditMetric>
  checks: Record<string, boolean | null>
}

export interface SiteAuditState {
  status: AuditStatus
  result: AuditResult | null
  error: ErrorKey
  /** The URL the last run used — retry repeats that, not the live field. */
  lastRun: string
  /** Set when a run finishes while the visitor is still above the report. */
  run: (target: string) => void
}

/**
 * Owns the audit request for the whole page.
 *
 * The state lives here rather than inside the input because the two halves
 * of this feature are now at opposite ends of the page: the field is in
 * stage 01 and the result renders after stage 03, so the wait is spent
 * reading the process instead of watching a spinner.
 */
export function useSiteAudit(): SiteAuditState {
  const [status, setStatus] = useState<AuditStatus>('idle')
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState<ErrorKey>('network')
  const [lastRun, setLastRun] = useState('')
  /** Guards against a second submit while one is in flight, without making
   *  `run` depend on `status` and change identity every render. */
  const inFlight = useRef(false)

  const run = useCallback((target: string) => {
    const trimmed = target.trim()
    if (!trimmed || inFlight.current) return

    inFlight.current = true
    setStatus('running')
    setResult(null)
    setLastRun(trimmed)

    void (async () => {
      try {
        // GET, so Vercel's edge can cache the result by URL — see api/audit.ts.
        const response = await fetch(
          `/api/audit?url=${encodeURIComponent(trimmed)}`,
        )
        const body = (await response.json().catch(() => null)) as
          | ({ ok: boolean; error?: string } & Partial<AuditResult>)
          | null

        // The dev server has no serverless functions and answers with the
        // SPA's own HTML — treating that as a result would invent findings.
        if (!body || typeof body.ok !== 'boolean') {
          setError('network')
          setStatus('error')
          return
        }

        if (!body.ok) {
          const key = body.error as ErrorKey
          setError(key in auditCopy.errors ? key : 'network')
          setStatus('error')
          return
        }

        setResult(body as AuditResult)
        setStatus('done')
      } catch {
        setError('network')
        setStatus('error')
      } finally {
        inFlight.current = false
      }
    })()
  }, [])

  return { status, result, error, lastRun, run }
}
