import { PageLink } from '../PageLink/PageLink'
import { Reveal } from '../Reveal/Reveal'
import {
  auditCopy,
  conclusionLabels,
  findingSpecs,
  metricSpecs,
  scoreBands,
  stageResponse,
  type Band,
} from '../../content/audit'
import { LCP_SLOW, pickConclusion } from '../../lib/auditConclusion'
import type { SiteAuditState } from '../../hooks/useSiteAudit'
import './AuditReport.css'

interface AuditReportProps {
  state: SiteAuditState
  id: string
}

function bandFor(score: number | null, key: keyof typeof scoreBands): Band {
  if (score === null) return 'mixed'
  const { goodAt, mixedAt } = scoreBands[key]
  if (score >= goodAt) return 'good'
  if (score >= mixedAt) return 'mixed'
  return 'attention'
}

/** Lighthouse frame timings are milliseconds from navigation start. */
function seconds(ms: number | null): string | null {
  if (typeof ms !== 'number') return null
  return `${(ms / 1000).toFixed(1)}s`
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * The result of stage 01, rendered where the visitor arrives after reading
 * stages 02 and 03.
 *
 * The previous version displayed seven booleans from a run that took up to
 * a minute, and discarded the screenshot, the filmstrip and every real
 * timing. Those are the artifacts worth showing: they are the visitor's own
 * page, at real timestamps, and they make the case without a score and
 * without an adjective.
 */
export function AuditReport({ state, id }: AuditReportProps) {
  const { status, result, error, lastRun, run } = state

  if (status === 'idle') return null

  return (
    <section className="report" id={id}>
      <div className="container">
        {status === 'running' && (
          <div className="report__waiting" aria-live="polite">
            <span className="audit__spinner" aria-hidden="true" />
            <p className="report__waiting-text">
              Still checking {hostOf(lastRun)}. This is where your result
              appears — it will fill in on its own.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="report__error" aria-live="polite">
            <p className="report__error-text">{auditCopy.errors[error]}</p>
            <div className="report__error-actions">
              {/* Retry the URL that failed, not whatever is in the field now. */}
              {lastRun && (
                <button
                  type="button"
                  className="report__retry"
                  onClick={() => run(lastRun)}
                >
                  {auditCopy.retry}
                </button>
              )}
              <PageLink href="/contact" className="report__error-link">
                Send us the address instead
                <span aria-hidden="true">&#8599;</span>
              </PageLink>
            </div>
          </div>
        )}

        {status === 'done' && result && (() => {
          /* One decisive statement leads; the screenshot, filmstrip,
             metrics and remaining findings all support it. Previously they
             carried equal weight, which left the visitor to work out what
             mattered for themselves. */
          const conclusion = pickConclusion(result)

          /* The finding that produced the conclusion is not repeated in
             the list below it. The three timing conclusions all come from
             the same underlying finding. */
          const usedId = ['fcp', 'lcp', 'cls'].includes(conclusion.id)
            ? 'lcp'
            : conclusion.id

          const findings = findingSpecs
            .map((spec) => {
              /* Judged on the LCP measurement, not the composite
                 performance score. A site can score 83 overall — "good" —
                 while its main content takes 2.7s, which had the report
                 leading with "stays visually empty for 2.6 seconds" and
                 then listing "your main content appears quickly" as
                 something already working, on the same screen. */
              const lcpMs = result.metrics.lcp?.value
              const passed =
                spec.id === 'lcp'
                  ? typeof lcpMs === 'number'
                    ? lcpMs < LCP_SLOW
                    : bandFor(result.scores.performance, 'performance') === 'good'
                  : result.checks[spec.id]
              if (passed === null || passed === undefined) return null
              return { spec, passed }
            })
            .filter(
              (f): f is { spec: (typeof findingSpecs)[number]; passed: boolean } =>
                !!f,
            )

          const attention = findings.filter(
            (f) => !f.passed && f.spec.id !== usedId,
          )
          const working = findings.filter((f) => f.passed)

          return (
            <div className="report__body" aria-live="polite">
              <Reveal>
                <p className="eyebrow report__eyebrow">
                  {auditCopy.reportEyebrow}
                </p>
              </Reveal>

              {/* The lead. Never a score, always a measurement. */}
              <Reveal delay={0.05}>
                <h2
                  className={`report__conclusion${
                    conclusion.clear ? ' report__conclusion--clear' : ''
                  }`}
                >
                  {conclusion.headline}
                </h2>
              </Reveal>

              {/* What we observed. */}
              <div className="report__viewer">
                {result.screenshot && (
                  <Reveal delay={0.1} className="report__shot">
                    <div className="report__device">
                      <img
                        className="report__shot-img"
                        src={result.screenshot}
                        alt={`The finished ${hostOf(result.url)} homepage as it rendered on a simulated phone`}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <p className="report__shot-label">
                      {auditCopy.screenshotLabel}
                    </p>
                  </Reveal>
                )}

                <Reveal delay={0.14} className="report__aside">
                  {result.frames.length > 0 && (
                    <div className="filmstrip">
                      <p className="report__aside-label">
                        {auditCopy.filmstripLabel}
                      </p>
                      <ol className="filmstrip__frames">
                        {result.frames.map((frame, index) => (
                          <li className="filmstrip__frame" key={index}>
                            <img src={frame.data} alt="" loading="lazy" />
                            <span className="filmstrip__time">
                              {seconds(frame.timing) ?? '—'}
                            </span>
                          </li>
                        ))}
                      </ol>
                      <p className="filmstrip__note">
                        {auditCopy.filmstripNote}
                      </p>
                    </div>
                  )}

                  {/* The read: why it costs something, and what we would
                      actually do. Both tied to the conclusion above. */}
                  <div className="report__read">
                    <div className="report__read-block">
                      <h3 className="report__read-label">
                        {conclusionLabels.matters}
                      </h3>
                      <p className="report__read-body">{conclusion.matters}</p>
                    </div>
                    <div className="report__read-block">
                      <h3 className="report__read-label">
                        {conclusionLabels.change}
                      </h3>
                      <p className="report__read-body">{conclusion.change}</p>
                      {!conclusion.clear && !conclusion.inconclusive && (
                        <p className="report__read-stage">
                          {stageResponse[conclusion.stage]}
                        </p>
                      )}
                    </div>
                  </div>
                </Reveal>
              </div>

              {working.length > 0 && (
                <Reveal className="report__working">
                  <p className="report__aside-label">
                    {auditCopy.workingLabel}
                  </p>
                  <ul>
                    {working.map(({ spec }) => (
                      <li key={spec.id}>{spec.good}</li>
                    ))}
                  </ul>
                </Reveal>
              )}

              <Reveal className="report__next">
                <p className="report__next-title">{auditCopy.nextTitle}</p>
                <div className="report__next-actions">
                  <PageLink href="/contact" className="report__next-primary">
                    {auditCopy.nextPrimary}
                    <span aria-hidden="true">&#8599;</span>
                  </PageLink>
                  <PageLink href="/pricing" className="report__next-secondary">
                    {auditCopy.nextSecondary}
                  </PageLink>
                </div>
              </Reveal>

              {/* Everything measured, for anyone who wants it. Closed by
                  default so the detail supports the conclusion instead of
                  competing with it — but present, because a check that
                  hides its evidence is not a check. */}
              <details className="report__evidence">
                <summary className="report__evidence-summary">
                  {conclusionLabels.evidenceOpen}
                </summary>
                <div className="report__evidence-body">
                  <dl className="metrics__list">
                    {metricSpecs.map((spec) => {
                      const metric = result.metrics[spec.id]
                      if (!metric?.display) return null
                      return (
                        <div className="metric" key={spec.id}>
                          <dt className="metric__label">{spec.label}</dt>
                          <dd className="metric__value">{metric.display}</dd>
                          <dd className="metric__note">{spec.note}</dd>
                        </div>
                      )
                    })}
                  </dl>

                  {attention.length > 0 && (
                    <ol className="report__findings">
                      {attention.map(({ spec }) => (
                        <li className="finding" key={spec.id}>
                          <span className="finding__stage">
                            Stage {spec.stage}
                          </span>
                          <h3 className="finding__label">{spec.label}</h3>
                          <p className="finding__body">{spec.attention}</p>
                          <p className="finding__response">
                            {stageResponse[spec.stage]}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </details>

              <p className="report__disclaimer">{auditCopy.disclaimer}</p>
            </div>
          )
        })()}
      </div>
    </section>
  )
}
