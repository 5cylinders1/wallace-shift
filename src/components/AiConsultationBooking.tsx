import { useEffect, useRef, useState } from 'react'
import { aiConsultation } from '../content/aiConsultation'
import { aiOffer } from '../content/aiOffer'
import type { AiOpportunityFormValues } from '../lib/aiOpportunityAdapter'
import { AiBookingVerification } from './AiBookingVerification'

export function AiConsultationBooking({ attemptId, values, onConfirmed, onVerifiedEmail, onBack, onRequestPhone, bookingConfirmed }: {
  attemptId: string
  values: AiOpportunityFormValues
  onConfirmed: () => void
  onVerifiedEmail: (email: string) => void
  bookingConfirmed: boolean
  onBack: () => void
  onRequestPhone: () => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [frameState, setFrameState] = useState<'loading' | 'loaded' | 'slow'>('loading')
  const [calendarAccess, setCalendarAccess] = useState(false)

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])
  useEffect(() => {
    if (!calendarAccess || frameState !== 'loading') return
    const timeout = window.setTimeout(() => setFrameState('slow'), 15000)
    return () => window.clearTimeout(timeout)
  }, [frameState, calendarAccess])

  return <section className="qf-booking" aria-labelledby="qf-booking-title">
    <header className="qf-booking-heading">
      <h1 id="qf-booking-title" ref={headingRef} tabIndex={-1}>Book your free consultation.</h1>
      <p>Let’s plan how AI can save your business time. Choose a time for your free {aiConsultation.durationMinutes} minute Google Meet consultation below.</p>
    </header>

    <div className="qf-booking-context">
      <p><strong>Let’s plan your AI project and free business website.</strong><br />Your website is included when you move forward with a project of ${aiOffer.minimumProjectFee.toLocaleString('en-US')} or more.</p>
      <button className="ao-button ao-button--secondary" type="button" onClick={onRequestPhone}>Prefer a phone call without email?</button>
    </div>

    <AiBookingVerification attemptId={attemptId} values={values} onConfirmed={onConfirmed} onVerifiedEmail={onVerifiedEmail} onCalendarAccess={setCalendarAccess} autoAdvance={!bookingConfirmed} />

    {calendarAccess && <div className="qf-booking-calendar">
      <div className="qf-booking-toolbar">
        <p role="status">{frameState === 'loading' ? 'Loading Google Calendar…' : frameState === 'slow' ? 'Calendar taking too long? Open it directly in Google.' : 'Availability and time zones are shown by Google.'}</p>
        <a href={aiConsultation.bookingUrl} target="_blank" rel="noopener noreferrer">Open in Google Calendar <span className="visually-hidden">(opens in a new tab)</span></a>
      </div>
      <iframe
        className="qf-booking-frame"
        src={aiConsultation.embedUrl}
        title="Book a free Wallace Shift consultation with Google Calendar"
        referrerPolicy="no-referrer"
        onLoad={() => setFrameState('loaded')}
        onError={() => setFrameState('slow')}
      />
    </div>}

    {calendarAccess && <p className="qf-booking-confirmation">Your appointment is confirmed by Google after you finish booking. Verifying your email does not reserve a time.</p>}
    <div className="qf-booking-actions">
      <button className="ao-button ao-button--secondary" type="button" onClick={onBack}>Edit my quiz answers</button>
    </div>
  </section>
}
