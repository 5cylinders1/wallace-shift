import { useEffect, useState } from 'react'
import { auditCopy } from '../../content/audit'
import type { SiteAuditState } from '../../hooks/useSiteAudit'
import './AuditPill.css'

interface AuditPillProps {
  state: SiteAuditState
  /** The report element; the pill retires once this is on screen. */
  targetId: string
}

/**
 * A small fixed marker that carries the audit's status while the visitor
 * reads the stages.
 *
 * Without it the feature has a hole: the request is fired at the top of the
 * page and the result lands at the bottom, so someone who stops reading
 * half way would never learn it finished. It removes itself as soon as the
 * report is actually on screen, which is the moment it stops being useful.
 */
export function AuditPill({ state, targetId }: AuditPillProps) {
  const { status } = state
  const [reportSeen, setReportSeen] = useState(false)

  useEffect(() => {
    if (status === 'idle') return
    const target = document.getElementById(targetId)
    if (!target) return

    // Sticky: once the report has been on screen the pill has done its
    // job and retires for good. Restoring it on scroll-up would announce
    // "your result is ready" to someone who has already read it.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setReportSeen(true)
          observer.disconnect()
        }
      },
      { threshold: 0 },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [status, targetId])

  if (status === 'idle' || reportSeen) return null

  const running = status === 'running'
  const failed = status === 'error'

  const jump = () => {
    const target = document.getElementById(targetId)
    if (!target) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  return (
    <div
      className={`audit-pill${running ? '' : failed ? ' audit-pill--failed' : ' audit-pill--ready'}`}
    >
      <span className="audit-pill__status" role="status">
        {running ? (
          <>
            <span className="audit__spinner" aria-hidden="true" />
            {auditCopy.pillRunning}
          </>
        ) : failed ? (
          auditCopy.pillError
        ) : (
          auditCopy.pillReady
        )}
      </span>
      <button type="button" className="audit-pill__jump" onClick={jump}>
        {failed ? auditCopy.pillJumpError : auditCopy.pillJump}
        <span aria-hidden="true">&#8595;</span>
      </button>
    </div>
  )
}
