import { useEffect, useRef, useState } from 'react'
import { aiConsultation } from '../content/aiConsultation'
import { aiOffer } from '../content/aiOffer'
import type { SummaryStatus } from './useQuizSummaryDelivery'

export function AiConsultationBooking({ summaryStatus, onRetrySummary, onWalkthrough, onBack, onRequestPhone }: {
  summaryStatus: SummaryStatus
  onRetrySummary: () => void
  onWalkthrough: () => void
  onBack: () => void
  onRequestPhone: () => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [frameState, setFrameState] = useState<'loading' | 'loaded' | 'slow'>('loading')

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])
  useEffect(() => {
    if (frameState !== 'loading') return
    const timeout = window.setTimeout(() => setFrameState('slow'), 15000)
    return () => window.clearTimeout(timeout)
  }, [frameState])

  return <section className="qf-booking" aria-labelledby="qf-booking-title">
    <header className="qf-booking-heading">
      <h1 id="qf-booking-title" ref={headingRef} tabIndex={-1}>Book your free consultation.</h1>
      <div className="qf-booking-intro">
        <p>Let’s plan your AI project and free business website. Your website is included when you move forward with a project of ${aiOffer.minimumProjectFee.toLocaleString('en-US')} or more.</p>
        <div className="qf-booking-options">
          <a className="ao-button ao-button--secondary" href={aiConsultation.bookingUrl} target="_blank" rel="noopener noreferrer">Open in Google Calendar<span className="visually-hidden"> (opens in a new tab)</span></a>
          <button className="ao-button ao-button--secondary" type="button" onClick={onRequestPhone}>Prefer a phone call without email?</button>
        </div>
      </div>
    </header>

    <div className="qf-booking-calendar">
      {frameState !== 'loaded' && <p className={frameState === 'loading' ? 'visually-hidden' : 'qf-booking-load-status'} role="status">{frameState === 'loading' ? 'Loading Google Calendar…' : 'Calendar taking too long? Use Open in Google Calendar above.'}</p>}
      <iframe
        className="qf-booking-frame"
        src={aiConsultation.embedUrl}
        title="Book a free Wallace Shift consultation with Google Calendar"
        referrerPolicy="no-referrer"
        onLoad={() => setFrameState('loaded')}
        onError={() => setFrameState('slow')}
      />
    </div>

    <p className="qf-booking-confirmation">After you book, Google will email your appointment confirmation and Meet link.</p>
    {summaryStatus === 'failed' && <div className="qf-booking-confirmation" role="status">
      <p>We couldn’t confirm that your quiz answers were sent to Matthew. You can still book above.</p>
      <button type="button" className="qf-text-link" onClick={onRetrySummary}>Retry sending my answers</button>
    </div>}
    {summaryStatus === 'sending' && <p className="visually-hidden" role="status">Sending your quiz answers.</p>}
    <div className="qf-booking-actions">
      {aiConsultation.walkthrough.src && <button className="ao-button" type="button" onClick={onWalkthrough}>Watch the walkthrough</button>}
      <button className="ao-button ao-button--secondary" type="button" onClick={onBack}>Edit my quiz answers</button>
    </div>
  </section>
}
