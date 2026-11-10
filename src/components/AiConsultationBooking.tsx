import { useEffect, useRef } from 'react'
import { aiConsultation } from '../content/aiConsultation'
import { calendlyEventUrl } from '../lib/calendlyEventUrl'
import { CalendlyScheduler } from './CalendlyScheduler'
import type { SummaryStatus } from './useQuizSummaryDelivery'

export function AiConsultationBooking({ summaryStatus, onRetrySummary, onScheduled, onBack, onRequestPhone }: {
  summaryStatus: SummaryStatus
  onRetrySummary: () => void
  onScheduled: () => void
  onBack: () => void
  onRequestPhone: () => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  return <section className="qf-booking" aria-labelledby="qf-booking-title">
    <header>
      <h1 id="qf-booking-title" ref={headingRef} tabIndex={-1}>Book your free consultation.</h1>
      <div className="qf-booking-intro">
        <div className="qf-booking-copy">
          <p>Let’s plan an AI chatbot for your website and an AI phone agent for incoming calls. Both services include one free month after setup and your activation confirmation.</p>
        </div>
        <div className="qf-booking-options">
          {!calendlyEventUrl && <a className="ao-button ao-button--secondary" href={aiConsultation.fallbackBookingUrl} target="_blank" rel="noopener noreferrer">Open calendar in a new tab<span className="visually-hidden"> (opens in a new tab)</span></a>}
          <button className="ao-button ao-button--secondary" type="button" onClick={onRequestPhone}>Prefer a phone call without email?</button>
        </div>
      </div>
    </header>

    <div className="qf-booking-calendar">
      {calendlyEventUrl
        ? <><p className="qf-booking-instruction">Choose a time for your free {aiConsultation.durationMinutes} minute Google Meet. Book in the calendar below to watch your short video here afterward.</p>
          <CalendlyScheduler eventUrl={calendlyEventUrl} onScheduled={onScheduled} /></>
        : <p className="qf-booking-instruction">Open the calendar above to choose a time for your free {aiConsultation.durationMinutes} minute Google Meet. Your booking confirmation will include the meeting link. Bookings made in a new tab do not open the video on this page.</p>}
      {summaryStatus === 'failed' && <div className="qf-booking-confirmation" role="status">
        <p>We couldn’t confirm that your quiz answers were sent to Matthew. You can still book your consultation.</p>
        <button type="button" className="qf-text-link" onClick={onRetrySummary}>Retry sending my answers</button>
      </div>}
      {summaryStatus === 'sending' && <p className="visually-hidden" role="status">Sending your quiz answers.</p>}
    </div>
    <div className="qf-booking-actions">
      <button className="ao-button ao-button--secondary" type="button" onClick={onBack}>Edit my quiz answers</button>
    </div>
  </section>
}
