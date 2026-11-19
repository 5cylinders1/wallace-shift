import { useEffect, useRef, useState, type FormEvent } from 'react'
import { submitContactRequest } from '../../lib/contactAdapter'
import { CalendlyScheduler } from '../../components/CalendlyScheduler'
import { aiConsultation } from '../../content/aiConsultation'
import ContactChoices from './ContactChoices'
import { trackSiteEvent } from '../../lib/analytics'
import './call-request.css'
import SlideInDialog from './SlideInDialog'

export type InquiryMode = 'phone' | 'meeting'
/** The add-on tiles whose "Discuss" buttons open this form. */
export type AddOnSurface = 'home_addon_agents' | 'home_addon_follow_up' | 'home_addon_workspace'
/** Where on the homepage the form was opened. The heading answers the button that opened it. */
export type ContactSurface = 'home_hero' | 'home_packages' | 'home_comparison' | 'home_questions' | AddOnSurface
// A specific opener also names its subject in the request Matthew receives: `topic` on the
// Service line, and `about` (or the topic) in "Please call me about …".
const openers: Record<ContactSurface, { lead: string; emphasis: string; topic?: string; about?: string }> = {
  home_hero: { lead: 'Discuss', emphasis: 'your project.' },
  home_packages: { lead: 'Ask Matthew', emphasis: 'a question.' },
  home_comparison: { lead: 'Talk through', emphasis: 'the fit.', topic: 'Both packages', about: 'scoping both packages together' },
  home_questions: { lead: 'Ask Matthew', emphasis: 'a question.' },
  home_addon_agents: { lead: 'Discuss', emphasis: 'the agents.', topic: 'Chatbot + phone agent' },
  home_addon_follow_up: { lead: 'Discuss', emphasis: 'follow up.', topic: 'Managed follow up' },
  home_addon_workspace: { lead: 'Discuss', emphasis: 'your workspace.', topic: 'Business workspace + AI' },
}
type Props = { open: boolean; surface: ContactSurface; mode: InquiryMode; onModeChange: (mode: InquiryMode) => void; onClose: () => void }
type Status = 'idle' | 'sending' | 'sent' | 'invalid' | 'not_configured' | 'network_error'

/** This is an inquiry, not a calendar reservation. Keep the draft in memory
 * across dismissals, and never put contact details into analytics or storage. */
export default function CallRequestDialog({ open, surface, mode, onModeChange, onClose }: Props) {
  const heading = useRef<HTMLHeadingElement>(null)
  const feedback = useRef<HTMLParagraphElement>(null)
  const success = useRef<HTMLHeadingElement>(null)
  const pending = useRef(false)
  const submission = useRef<{ signature: string; requestId: string } | null>(null)
  const controller = useRef<AbortController | null>(null)
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
    const { topic, about } = openers[surface]
    const payload = {
      name: name.trim(), phone: phone.trim(), email: email.trim(), company, contactMethod: 'phone' as const,
      service: topic ? `Call request: ${topic}` : 'Call request',
      message: `Please call me about ${about ?? topic ?? 'Wallace Shift services'}.${note.trim() ? `\n\n${note.trim()}` : ''}`,
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
      if (result.ok) trackSiteEvent({ name: 'enquiry_submitted', value: surface })
      else if (result.reason !== 'invalid') trackSiteEvent({ name: 'enquiry_failed', value: surface })
    } finally {
      clearTimeout(timeout)
      controller.current = null
      pending.current = false
    }
  }

  // A closed dialog renders identically during prerendering and hydration.
  // Keep the component mounted so drafts and pending requests survive dismissal.
  if (!open) return null

  return <SlideInDialog open={open} onClose={onClose} labelledBy="call-request-heading" describedBy="call-request-next-step" closeLabel="Close request form" initialFocus={heading}>
        <div className={`call-request-content${mode === 'meeting' ? ' is-booking' : ''}`}>
          <div className="call-request-intro">
            <h2 id="call-request-heading" ref={heading} tabIndex={-1}>{openers[surface].lead} <em>{openers[surface].emphasis}</em></h2>
            <p id="call-request-next-step">{mode === 'phone' ? 'Leave your number and Matthew will call you to talk about what you need.' : `Choose an available time for a ${aiConsultation.durationMinutes} minute video call. Calendly sends your invitation and Google Meet link.`}</p>
            <ContactChoices context="dialog" compact selected={mode} onChoose={method => trackSiteEvent({ name: 'contact_choice', value: method, surface })} onRequestCall={() => onModeChange('phone')} onBookMeeting={() => onModeChange('meeting')} />
            <p className="call-request-reassurance">You do not need to choose a package.<br /> No payment or commitment.</p>
          </div>
          {mode === 'meeting' ? <div className="call-request-calendar">
            {meetingBooked ? <div className="call-request-success" role="status"><h3 ref={success} tabIndex={-1}>Your Google Meet is booked.</h3><p>Check your email for the calendar invitation and Google Meet link. Use that invitation to reschedule or cancel.</p><button type="button" className="call-request-submit" data-dismiss>Back to the website</button></div> : <>
              {open && <CalendlyScheduler eventUrl={aiConsultation.fallbackBookingUrl} onScheduled={() => { setMeetingBooked(true); trackSiteEvent({ name: 'meeting_booked', value: surface }) }} />}
              <button type="button" className="call-request-calendar-back" onClick={() => onModeChange('phone')}>Request a phone call instead</button>
            </>}
          </div> : status === 'sent' ? <div className="call-request-success" role="status">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="20" cy="20" r="17" /><path d="m12 20 5 5 11-11" /></svg>
            <h3 ref={success} tabIndex={-1}>Your call request has been sent.</h3>
            <p>Matthew will call you at <strong>{phone.trim()}</strong>. This is a callback request, not a booked appointment.</p>
            <button type="button" className="call-request-submit" data-dismiss>Back to the website</button>
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
  </SlideInDialog>
}
