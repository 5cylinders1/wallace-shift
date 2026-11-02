import { useEffect, useRef, useState } from 'react'
import { aiConsultation } from '../content/aiConsultation'

export function AiConsultationBooking({ answersSaved, onSendAnswers, onBack, onRequestPhone }: {
  answersSaved: boolean
  onSendAnswers: () => void
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
      <h1 id="qf-booking-title" ref={headingRef} tabIndex={-1}>Choose a time to talk.</h1>
      <p>Your free {aiConsultation.durationMinutes} minute consultation takes place on Google Meet. Choose a time below and complete Google’s booking form to receive your confirmation and meeting link.</p>
    </header>

    <div className="qf-booking-context">
      {answersSaved ? <p role="status"><strong>Your quiz answers are saved.</strong> Use the same email address when you book so we can match your answers to your consultation.</p> : <>
        <p><strong>Help us prepare.</strong> Send your quiz answers using the same email you use to book. This is optional and separate from your Google booking.</p>
        <button className="ao-button ao-button--secondary" type="button" onClick={onSendAnswers}>Send my quiz answers</button>
      </>}
    </div>

    <div className="qf-booking-calendar">
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
    </div>

    <p className="qf-booking-confirmation">Your appointment is confirmed by Google after you finish booking. Opening this calendar or sending your quiz answers does not reserve a time.</p>
    <div className="qf-booking-actions">
      <button className="ao-button ao-button--secondary" type="button" onClick={onBack}>Back to my options</button>
      <button className="qf-text-link" type="button" onClick={onRequestPhone}>Prefer a phone call without email?</button>
    </div>
  </section>
}
