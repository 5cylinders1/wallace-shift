import { useId, useState, type FormEvent } from 'react'
import { PageLink } from '../PageLink/PageLink'
import { auditCopy } from '../../content/audit'
import type { SiteAuditState } from '../../hooks/useSiteAudit'
import './SiteAudit.css'

interface SiteAuditProps {
  state: SiteAuditState
  /** Element the page scrolls to once a run starts. */
  continueTo: string
  /** The report, for the error state to point at. */
  reportId: string
  /** A compact, dark-ground version for starting the check in the hero. */
  compact?: boolean
}

/**
 * Stage 01 of the process, performed on the visitor's own site.
 *
 * This is the input half only. The result renders after stage 03 — see
 * AuditReport — because a Lighthouse run takes 10–60 seconds and the honest
 * options were to make someone watch a spinner for a minute or to give them
 * something worth reading while it happens. The page already had the
 * something: its own three stages.
 */
export function SiteAudit({ state, continueTo, reportId, compact = false }: SiteAuditProps) {
  const uid = useId()
  const [url, setUrl] = useState('')
  const { status, run } = state

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!url.trim() || status === 'running') return
    run(url)
    // The status panel changes the hero's height. Aim at the committed layout.
    requestAnimationFrame(() => scrollTo(continueTo, true))
  }

  const scrollTo = (id: string, immediate = false) => {
    const target = document.getElementById(id)
    if (!target) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({
      behavior: reduced || immediate ? 'instant' : 'smooth',
      block: 'start',
    })
  }

  /* Starts the visitor moving the moment the request is away, so the wait
     reads as progress through the page rather than a pause in it. */
  const scrollOn = () => scrollTo(continueTo)
  const scrollToReport = () => scrollTo(reportId)

  // The panel is replaced by live status once a run is away, so the column
  // never sits empty and never shows stale guidance.
  const showPanel = status === 'idle'

  return (
    <div className={`audit${compact ? ' audit--compact' : ''}`}>
      {compact && (
        <ul className="audit__signals" aria-label="The first check includes">
          <li>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 15V9m5 6V5m5 10V7m4 8V3" />
            </svg>
            Loading
          </li>
          <li>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="8.5" cy="8.5" r="5" />
              <path d="m12.5 12.5 4 4" />
            </svg>
            Search
          </li>
          <li>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="4" r="1.5" />
              <path d="m3 7 7 2 7-2M10 9v3m0 0-4 5m4-5 4 5" />
            </svg>
            Accessibility
          </li>
        </ul>
      )}
      <div className="audit__top">
        <form className="audit__form" onSubmit={handleSubmit} noValidate>
          <label className="audit__label" htmlFor={`${uid}-url`}>
            {auditCopy.inputLabel}
          </label>
          <div className="audit__row">
            <input
              id={`${uid}-url`}
              className="audit__input"
              type="text"
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              placeholder={auditCopy.placeholder}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              disabled={status === 'running'}
            />
            <button
              type="submit"
              className="audit__submit"
              disabled={status === 'running' || !url.trim()}
            >
              {status === 'done' || status === 'error'
                ? auditCopy.resubmit
                : auditCopy.submit}
            </button>
          </div>

          {/* The check only works on an existing public site — these keep
              app and automation visitors from feeling shut out by it. */}
          <ul className="audit__alts">
            {auditCopy.alternatives.map((alt, index) => (
              <li key={alt.href + alt.label}>
                <PageLink href={alt.href}>
                  {compact
                    ? index === 0
                      ? 'No website? Book a free fit call.'
                      : 'App or automation? Tell us about it.'
                    : alt.label}
                </PageLink>
              </li>
            ))}
          </ul>
        </form>

        {/* Fills the right column before anything has run, so the section
            reads as composed rather than half-empty. */}
        {showPanel && !compact && (
          <div className="audit__panel" aria-hidden="true">
            <p className="audit__panel-label">{auditCopy.previewLabel}</p>
            <ul className="audit__panel-list">
              {auditCopy.previewItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="audit__status" role="status" aria-live="polite" aria-atomic="true">
          {status === 'error' && (
            <div className="audit__panel audit__panel--error">
              <p className="audit__panel-label">{auditCopy.errorPanelTitle}</p>
              <p className="audit__running-body">{auditCopy.errorPanelBody}</p>
              <button type="button" className="audit__scroll-on" onClick={scrollToReport}>
                {auditCopy.errorPanelCta}
                <span aria-hidden="true">&#8595;</span>
              </button>
            </div>
          )}

          {status === 'running' && (
            <div className="audit__panel audit__panel--running">
              <p className="audit__panel-label">
                <span className="audit__spinner" aria-hidden="true" />
                {auditCopy.runningTitle}
              </p>
              <p className="audit__running-body">{auditCopy.runningBody}</p>
              <button type="button" className="audit__scroll-on" onClick={scrollOn}>
                {auditCopy.runningCta}
                <span aria-hidden="true">&#8595;</span>
              </button>
            </div>
          )}
          {status === 'done' && (
            <div className="audit__panel audit__panel--done">
              <p className="audit__panel-label">{auditCopy.pillReady}</p>
              <button type="button" className="audit__scroll-on" onClick={scrollToReport}>
                See your findings
                <span aria-hidden="true">&#8595;</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
