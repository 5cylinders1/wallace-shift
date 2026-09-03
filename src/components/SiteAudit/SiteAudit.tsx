import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { PageLink } from '../PageLink/PageLink'
import {
  auditCopy,
  findingSpecs,
  scoreBands,
  stageResponse,
  type Band,
} from '../../content/audit'
import './SiteAudit.css'

type Scores = {
  performance: number | null
  seo: number | null
  accessibility: number | null
  bestPractices: number | null
}

type AuditResult = {
  url: string
  scores: Scores
  metrics: { lcp: string | null; cls: string | null; tbt: string | null }
  checks: Record<string, boolean | null>
}

type Status = 'idle' | 'running' | 'done' | 'error'

type ErrorKey = keyof typeof auditCopy.errors

/** How long each running-step message holds before the next. */
const STEP_MS = 4200

function bandFor(score: number | null, key: keyof typeof scoreBands): Band {
  if (score === null) return 'mixed'
  const { goodAt, mixedAt } = scoreBands[key]
  if (score >= goodAt) return 'good'
  if (score >= mixedAt) return 'mixed'
  return 'attention'
}

/**
 * Stage 01 of the process, performed on the visitor's own site.
 *
 * The page claims it finds friction; this finds it, on their actual
 * business, before they have spoken to anyone. Everything it reports comes
 * from a real Lighthouse run on Google's infrastructure — see api/audit.ts
 * for why the audit is never fetched by us directly.
 */
export function SiteAudit() {
  const uid = useId()
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<ErrorKey>('network')
  const [result, setResult] = useState<AuditResult | null>(null)
  const [step, setStep] = useState(0)
  const resultRef = useRef<HTMLDivElement>(null)

  // Cycles the honest waiting copy while Lighthouse runs. The reset to
  // step 0 belongs to the submit handler, not here — resetting it in the
  // effect body is a synchronous setState during render commit, which
  // cascades an extra render every time the status changes.
  useEffect(() => {
    if (status !== 'running') return
    const timer = window.setInterval(() => {
      setStep((s) => Math.min(s + 1, auditCopy.runningSteps.length - 1))
    }, STEP_MS)
    return () => window.clearInterval(timer)
  }, [status])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!url.trim() || status === 'running') return

    setStatus('running')
    setResult(null)
    setStep(0)

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
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
    }
  }

  const findings = result
    ? findingSpecs
        .map((spec) => {
          const passed =
            spec.id === 'lcp'
              ? bandFor(result.scores.performance, 'performance') === 'good'
              : result.checks[spec.id]
          if (passed === null || passed === undefined) return null
          return { spec, passed }
        })
        .filter((f): f is { spec: (typeof findingSpecs)[number]; passed: boolean } => !!f)
    : []

  const attention = findings.filter((f) => !f.passed)
  const working = findings.filter((f) => f.passed)

  const showPanel = status === 'idle'

  return (
    <div className="audit">
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
            {status === 'done' ? auditCopy.resubmit : auditCopy.submit}
          </button>
        </div>

        {/* The check only works on an existing public site — these keep
            app and automation visitors from feeling shut out by it. */}
        <ul className="audit__alts">
          {auditCopy.alternatives.map((alt) => (
            <li key={alt.href + alt.label}>
              <PageLink href={alt.href}>{alt.label}</PageLink>
            </li>
          ))}
        </ul>
        </form>

        {/* Fills the right column before anything has run, so the section
            reads as composed rather than half-empty. */}
        {showPanel && (
          <div className="audit__panel" aria-hidden="true">
            <p className="audit__panel-label">{auditCopy.previewLabel}</p>
            <ul className="audit__panel-list">
              {auditCopy.previewItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div aria-live="polite" className="audit__live">
        {status === 'running' && (
          <div className="audit__running">
            <p className="audit__running-title">{auditCopy.runningTitle}</p>
            <ul className="audit__steps">
              {auditCopy.runningSteps.map((text, index) => (
                <li
                  key={text}
                  className={`audit__step${index <= step ? ' audit__step--done' : ''}`}
                >
                  {text}
                </li>
              ))}
            </ul>
            <p className="audit__running-note">{auditCopy.runningNote}</p>
          </div>
        )}

        {status === 'error' && (
          <p className="audit__error">{auditCopy.errors[error]}</p>
        )}

        {status === 'done' && result && (
          <div className="audit__result" ref={resultRef}>
            <p className="audit__result-lead">{auditCopy.resultLead}</p>

            {attention.length > 0 && (
              <ol className="audit__findings">
                {attention.map(({ spec }) => (
                  <li className="finding" key={spec.id}>
                    <span className="finding__stage">Stage {spec.stage}</span>
                    <h3 className="finding__label">{spec.label}</h3>
                    <p className="finding__body">{spec.attention}</p>
                    <p className="finding__response">
                      {stageResponse[spec.stage]}
                    </p>
                  </li>
                ))}
              </ol>
            )}

            {working.length > 0 && (
              <div className="audit__working">
                <p className="audit__working-label">Already working</p>
                <ul>
                  {working.map(({ spec }) => (
                    <li key={spec.id}>{spec.good}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="audit__next">
              <p className="audit__next-title">{auditCopy.nextTitle}</p>
              <div className="audit__next-actions">
                <PageLink href="/contact" className="audit__next-primary">
                  {auditCopy.nextPrimary}
                  <span aria-hidden="true">&#8599;</span>
                </PageLink>
                <PageLink href="/pricing" className="audit__next-secondary">
                  {auditCopy.nextSecondary}
                </PageLink>
              </div>
            </div>

            <p className="audit__disclaimer">{auditCopy.disclaimer}</p>
          </div>
        )}
      </div>
    </div>
  )
}
