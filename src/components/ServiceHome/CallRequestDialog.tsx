import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { submitContactRequest } from '../../lib/contactAdapter'
import { CalendlyScheduler } from '../../components/CalendlyScheduler'
import { aiConsultation } from '../../content/aiConsultation'
import ContactChoices from './ContactChoices'
import './call-request.css'

export type InquiryMode = 'phone' | 'meeting'
type Props = { open: boolean; mode: InquiryMode; onModeChange: (mode: InquiryMode) => void; onClose: () => void }
type Status = 'idle' | 'sending' | 'sent' | 'invalid' | 'not_configured' | 'network_error'

/** This is an inquiry, not a calendar reservation. Keep the draft in memory
 * across dismissals, and never put contact details into analytics or storage. */
export default function CallRequestDialog({ open, mode, onModeChange, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const feedback = useRef<HTMLParagraphElement>(null)
  const success = useRef<HTMLHeadingElement>(null)
  const pending = useRef(false)
  const submission = useRef<{ signature: string; requestId: string } | null>(null)
  const controller = useRef<AbortController | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [company, setCompany] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [meetingBooked, setMeetingBooked] = useState(false)
  const error = status === 'invalid'
    ? 'Please enter your name and a phone number with 7 to 15 digits. If you add an email address, check that it is valid.'
    : status === 'not_configured'
      ? 'The request form is unavailable right now. Your details are still here. Please email Matthew directly or try again later.'
      : status === 'network_error'
        ? 'We could not confirm your request was sent. Your details are still here. Try again or email Matthew directly.'
        : null

  const dismiss = useCallback(() => {
    if (closeTimer.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose()
      return
    }
    if (dialog.current) dialog.current.dataset.closing = 'true'
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null
      onClose()
    }, 180)
  }, [onClose])

  useLayoutEffect(() => {
    const element = dialog.current
    if (!open || !element) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const { scrollX, scrollY } = window
    const body = document.body
    const root = document.documentElement
    const original = {
      position: body.style.position, top: body.style.top, left: body.style.left,
      width: body.style.width, paddingRight: body.style.paddingRight, overflow: root.style.overflow,
      scrollbarWidth: root.style.getPropertyValue('--modal-scrollbar-width'),
    }
    const scrollbar = window.innerWidth - root.clientWidth
    const padding = Number.parseFloat(getComputedStyle(body).paddingRight) || 0
    // Fixing the body also locks iOS scrolling. Compensate for the scrollbar
    // before removing it so the page behind the dialog does not reflow.
    Object.assign(body.style, {
      position: 'fixed', top: `${-scrollY}px`, left: `${-scrollX}px`,
      width: '100%', paddingRight: `${padding + scrollbar}px`,
    })
    // Viewport-fixed navigation ignores body padding, so preserve its own
    // containing width while the document scrollbar is removed as well.
    root.style.setProperty('--modal-scrollbar-width', `${scrollbar}px`)
    root.style.overflow = 'hidden'
    const viewport = window.visualViewport
    const fitVisibleViewport = () => {
      if (!viewport) return
      element.style.setProperty('--call-visible-height', `${viewport.height}px`)
      element.style.setProperty('--call-visible-top', `${viewport.offsetTop}px`)
    }
    fitVisibleViewport()
    viewport?.addEventListener('resize', fitVisibleViewport)
    viewport?.addEventListener('scroll', fitVisibleViewport)
    delete element.dataset.closing
    element.showModal()
    element.scrollTop = 0
    heading.current?.focus({ preventScroll: true })

    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
      closeTimer.current = null
      viewport?.removeEventListener('resize', fitVisibleViewport)
      viewport?.removeEventListener('scroll', fitVisibleViewport)
      element.style.removeProperty('--call-visible-height')
      element.style.removeProperty('--call-visible-top')
      element.close()
      const { overflow, scrollbarWidth, ...bodyStyles } = original
      Object.assign(body.style, bodyStyles)
      root.style.overflow = overflow
      if (scrollbarWidth) root.style.setProperty('--modal-scrollbar-width', scrollbarWidth)
      else root.style.removeProperty('--modal-scrollbar-width')
      window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' })
      opener?.focus({ preventScroll: true })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if ((mode === 'phone' && status === 'sent') || (mode === 'meeting' && meetingBooked)) success.current?.focus()
    else if (mode === 'phone' && error) feedback.current?.focus()
    else heading.current?.focus({ preventScroll: true })
  }, [open, status, error, mode, meetingBooked])

  useEffect(() => () => controller.current?.abort(), [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current || status === 'sent') return
    if (!event.currentTarget.reportValidity()) return
    const digits = phone.replace(/\D/g, '')
    if (!name.trim() || !/^[+\d\s().-]+$/.test(phone.trim()) || digits.length < 7 || digits.length > 15) {
      setStatus('invalid')
      return
    }
    const payload = {
      name: name.trim(), phone: phone.trim(), email: email.trim(), company, contactMethod: 'phone' as const,
      service: 'Call request',
      message: `Please call me about Wallace Shift services.${note.trim() ? `\n\n${note.trim()}` : ''}`,
    }
    const signature = JSON.stringify(payload)
    // An uncertain response can be retried without a second email. Keep the
    // key for identical answers; edits deliberately create a new inquiry.
    if (submission.current?.signature !== signature) {
      submission.current = { signature, requestId: crypto.randomUUID() }
    }
    pending.current = true
    setStatus('sending')
    const request = new AbortController()
    controller.current = request
    const timeout = setTimeout(() => request.abort(), 20_000)
    try {
      const result = await submitContactRequest({
        ...payload, requestId: submission.current.requestId,
      }, { signal: request.signal })
      setStatus(result.ok ? 'sent' : result.reason)
    } finally {
      clearTimeout(timeout)
      controller.current = null
      pending.current = false
    }
  }

  // A closed dialog renders identically during prerendering and hydration.
  // Keep the component mounted so drafts and pending requests survive dismissal.
  if (!open) return null

  return createPortal(
    <dialog ref={dialog} className="call-request-dialog" aria-labelledby="call-request-heading" aria-describedby="call-request-next-step" onCancel={event => { event.preventDefault(); dismiss() }} onKeyDown={event => {
      if (event.key !== 'Tab') return
      // Native modality makes the background inert. Explicitly wrap the two
      // ends as well so Tab does not move into browser chrome in Chromium.
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button, input, textarea, select, summary, iframe, [tabindex]'))
        .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0)
      const first = controls[0]
      const last = controls.at(-1)
      if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement as HTMLElement))) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }}>
      <div className="call-request-shell">
        <header className="call-request-header">
          <span className="call-request-brand">WALLACE SHIFT</span>
          <button type="button" className="call-request-close" onClick={dismiss} aria-label="Close request form">Close<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button>
        </header>
        <div className={`call-request-content${mode === 'meeting' ? ' is-booking' : ''}`}>
          <div className="call-request-intro">
            <h2 id="call-request-heading" ref={heading} tabIndex={-1}>{mode === 'phone' ? <>Request <em>a call.</em></> : <>Book a <em>Google Meet.</em></>}</h2>
            <p id="call-request-next-step">{mode === 'phone' ? 'Leave your number and Matthew will call you to talk about what you need.' : `Choose an available time for a ${aiConsultation.durationMinutes} minute video call. Calendly sends your invitation and Google Meet link.`}</p>
            <ContactChoices context="dialog" compact selected={mode} onRequestCall={() => onModeChange('phone')} onBookMeeting={() => onModeChange('meeting')} />
            <p className="call-request-reassurance">You do not need to choose a package.<br /> No payment or commitment.</p>
          </div>
          {mode === 'meeting' ? <div className="call-request-calendar">
            {meetingBooked ? <div className="call-request-success" role="status"><h3 ref={success} tabIndex={-1}>Your Google Meet is booked.</h3><p>Check your email for the calendar invitation and Google Meet link. Use that invitation to reschedule or cancel.</p><button type="button" className="call-request-submit" onClick={dismiss}>Back to the website</button></div> : <>
              {open && <CalendlyScheduler eventUrl={aiConsultation.fallbackBookingUrl} onScheduled={() => setMeetingBooked(true)} />}
              <button type="button" className="call-request-calendar-back" onClick={() => onModeChange('phone')}>Request a phone call instead</button>
            </>}
          </div> : status === 'sent' ? <div className="call-request-success" role="status">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="20" cy="20" r="17" /><path d="m12 20 5 5 11-11" /></svg>
            <h3 ref={success} tabIndex={-1}>Your call request has been sent.</h3>
            <p>Matthew will call you at <strong>{phone.trim()}</strong>. This is a callback request, not a booked appointment.</p>
            <button type="button" className="call-request-submit" onClick={dismiss}>Back to the website</button>
          </div> : <form className="call-request-form" onSubmit={submit} aria-label="Call request" aria-busy={status === 'sending'}>
            <fieldset disabled={status === 'sending'}>
              <legend className="call-request-sr-only">Your contact details</legend>
              <div className="call-request-row">
                <div className="call-request-field"><label htmlFor="call-request-name">Your name</label><input id="call-request-name" name="name" autoComplete="name" required maxLength={120} value={name} onChange={event => setName(event.target.value)} /></div>
                <div className="call-request-field"><label htmlFor="call-request-phone">Phone number</label><input id="call-request-phone" name="phone" type="tel" autoComplete="tel" required maxLength={40} aria-describedby="call-request-phone-hint" value={phone} onChange={event => setPhone(event.target.value)} /><small id="call-request-phone-hint">The number Matthew should call.</small></div>
              </div>
              <details className="call-request-details">
                <summary>Add a note or email <span>(optional)</span></summary>
                <div className="call-request-field"><label htmlFor="call-request-email">Email address <span>(optional)</span></label><input id="call-request-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={200} value={email} onChange={event => setEmail(event.target.value)} /></div>
                <div className="call-request-field"><label htmlFor="call-request-note">What would you like help with? <span>(optional)</span></label><textarea id="call-request-note" name="message" rows={3} maxLength={4500} placeholder="A new website, help with follow up, or something else…" value={note} onChange={event => setNote(event.target.value)} /></div>
              </details>
              <div className="call-request-honeypot" aria-hidden="true"><label htmlFor="call-request-company">Leave this field empty</label><input id="call-request-company" name="company" tabIndex={-1} autoComplete="off" value={company} onChange={event => setCompany(event.target.value)} /></div>
              <button className="call-request-submit" type="submit">{status === 'sending' ? 'Sending your request…' : 'Send call request'}<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" /></svg></button>
            </fieldset>
            {error && <p ref={feedback} tabIndex={-1} className="call-request-error" role="alert">{error}</p>}
            <p className="call-request-privacy">We use your details to respond to this request. <a href="/privacy" target="_blank" rel="noreferrer">Privacy policy (opens in a new tab)</a></p>
            <p className="call-request-email">Prefer email? <a href="mailto:matthew@wallaceshift.com?subject=Call%20request">Email Matthew directly</a>.</p>
          </form>}
        </div>
      </div>
    </dialog>, document.body,
  )
}
