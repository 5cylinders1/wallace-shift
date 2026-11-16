import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { business } from '../content/siteConfig'
import { trackSiteEvent } from '../lib/analytics'
import {
  submitContactRequest,
  type ContactDecisionRole,
  type ContactOffer,
  type ContactReadiness,
  type ContactTiming,
} from '../lib/contactAdapter'
import './ContractorOfferInquiry.css'

type Props = {
  offer: ContactOffer
  priceLabel: string
  offerName: string
}

type Status = 'idle' | 'sending' | 'sent' | 'invalid' | 'not_configured' | 'error'

const errors: Record<'invalid' | 'not_configured' | 'error', string> = {
  invalid: 'Please add your name, a valid email address and a short note, then try again.',
  not_configured: 'The inquiry form is unavailable right now. Your answers are still here. Please email Matthew directly, or try again later.',
  error: 'Your inquiry could not be confirmed. Your answers are still here. Please try again or email Matthew directly.',
}

/** A new offer gets a new form instance, even during navigation within the SPA. */
export function ContractorOfferInquiry(props: Props) {
  return <OfferInquiryForm key={props.offer} {...props} />
}

function OfferInquiryForm({ offer, priceLabel, offerName }: Props) {
  const uid = useId()
  const id = (field: string) => `co-inquiry-${uid}-${field}`
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [message, setMessage] = useState('')
  const [readiness, setReadiness] = useState<ContactReadiness>('questions')
  const [website, setWebsite] = useState('')
  const [noWebsite, setNoWebsite] = useState(false)
  const [timing, setTiming] = useState<ContactTiming | ''>('')
  const [decisionRole, setDecisionRole] = useState<ContactDecisionRole | ''>('')
  const [company, setCompany] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const active = useRef(true)
  const pending = useRef(false)
  const started = useRef(false)
  const successHeading = useRef<HTMLHeadingElement>(null)
  const errorMessage = useRef<HTMLParagraphElement>(null)
  const error = status === 'invalid' || status === 'not_configured' || status === 'error'
    ? errors[status]
    : null

  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])

  useEffect(() => {
    if (status === 'sent') successHeading.current?.focus()
    else if (error) errorMessage.current?.focus()
  }, [status, error])

  function trackStart() {
    if (started.current) return
    started.current = true
    trackSiteEvent({ name: 'contractor_offer_form_started', value: offer })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    if (!event.currentTarget.reportValidity()) return
    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus('invalid')
      return
    }
    pending.current = true
    setStatus('sending')
    const result = await submitContactRequest({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      businessName: businessName.trim(),
      offer,
      readiness,
      website: noWebsite ? '' : website.trim(),
      noWebsite,
      ...(timing ? { timing } : {}),
      ...(decisionRole ? { decisionRole } : {}),
      company,
    })
    if (!active.current) return
    pending.current = false
    if (result.ok) {
      trackSiteEvent({ name: 'contractor_offer_submitted', value: offer, readiness })
      setStatus('sent')
      return
    }
    trackSiteEvent({ name: 'contractor_offer_failed', value: offer })
    setStatus(result.reason === 'network_error' ? 'error' : result.reason)
  }

  return (
    <section className="co-inquiry" aria-labelledby={id('heading')}>
      <div className="co-inquiry__intro">
        <h2 id={id('heading')}>What would you like to know?</h2>
        <p>Ask about the details, discuss your business or tell us you are ready to begin. You do not need to have everything figured out.</p>
        <div className="co-inquiry__offer">
          <span>{offerName}</span>
          <strong>{priceLabel}</strong>
        </div>
        <p className="co-inquiry__note">This starts a conversation with Matthew. It does not place an order or commit you to a purchase.</p>
        {business.email && (
          <p className="co-inquiry__email">Prefer email? <a href={`mailto:${business.email}?subject=${encodeURIComponent(`Question about ${offerName}`)}`}>Email Matthew directly</a>.</p>
        )}
      </div>

      {status === 'sent' ? (
        <div className="co-inquiry__success" role="status">
          <svg viewBox="0 0 32 32" width="40" height="40" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.5" />
            <path d="m10 16 4 4 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 ref={successHeading} tabIndex={-1}>Your inquiry has been sent.</h3>
          <p>Matthew has your note about {offerName.toLowerCase()} at {priceLabel}. He will reply to the email address you provided to answer your questions and discuss the next step.</p>
          <p>No payment or commitment has been made.</p>
          <a href="#demo">Take another look at the demo</a>
        </div>
      ) : (
        <form className="co-inquiry__form" method="post" action="/api/contact" onSubmit={handleSubmit} onFocus={trackStart} aria-busy={status === 'sending'}>
          <noscript><p>Please enable JavaScript to use this form, or use the email link to contact Matthew directly.</p></noscript>
          <fieldset className="co-inquiry__fields" disabled={status === 'sending'}>
            <legend className="co-inquiry__sr-only">Your inquiry about {offerName}</legend>
            <p className="co-inquiry__required">Name, email and a short note are required.</p>
            <div className="co-inquiry__row">
              <div className="co-inquiry__field">
                <label htmlFor={id('name')}>Your name</label>
                <input id={id('name')} name="name" autoComplete="name" required maxLength={120} value={name} onChange={event => setName(event.target.value)} />
              </div>
              <div className="co-inquiry__field">
                <label htmlFor={id('email')}>Email address</label>
                <input id={id('email')} name="email" type="email" autoComplete="email" required maxLength={200} value={email} onChange={event => setEmail(event.target.value)} />
              </div>
            </div>
            <div className="co-inquiry__field">
              <label htmlFor={id('business')}>Business name <span>(optional)</span></label>
              <input id={id('business')} name="businessName" autoComplete="organization" maxLength={120} value={businessName} onChange={event => setBusinessName(event.target.value)} />
            </div>
            <fieldset className="co-inquiry__readiness">
              <legend>Where are you in the process?</legend>
              {([
                ['questions', 'I have a few questions'],
                ['ready', 'I am ready to discuss a project'],
                ['planning', 'I am planning for later'],
              ] as const).map(([value, label]) => (
                <label className="co-inquiry__choice" key={value}>
                  <input type="radio" name="readiness" value={value} checked={readiness === value} onChange={() => setReadiness(value)} />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
            <div className="co-inquiry__field">
              <label htmlFor={id('message')}>What would you like help with?</label>
              <textarea id={id('message')} name="message" required maxLength={5000} rows={4} placeholder="Tell us what you need, or ask anything about the offer." value={message} onChange={event => setMessage(event.target.value)} />
            </div>
            <details className="co-inquiry__details">
              <summary>Add a little more context <span>(optional)</span></summary>
              <div className="co-inquiry__detail-fields">
                <div className="co-inquiry__field">
                  <label htmlFor={id('website')}>Current website</label>
                  <input id={id('website')} name="website" type="text" inputMode="url" autoComplete="url" maxLength={300} placeholder="example.com" disabled={noWebsite} value={website} onChange={event => setWebsite(event.target.value)} />
                  <label className="co-inquiry__choice co-inquiry__choice--inline">
                    <input type="checkbox" name="noWebsite" checked={noWebsite} onChange={event => setNoWebsite(event.target.checked)} />
                    <span>I do not have a website yet</span>
                  </label>
                </div>
                <div className="co-inquiry__row">
                  <div className="co-inquiry__field">
                    <label htmlFor={id('timing')}>When are you thinking?</label>
                    <select id={id('timing')} name="timing" value={timing} onChange={event => setTiming(event.target.value as ContactTiming | '')}>
                      <option value="">Choose if you know</option>
                      <option value="soon">Soon</option>
                      <option value="later">Later</option>
                      <option value="exploring">Still exploring</option>
                    </select>
                  </div>
                  <div className="co-inquiry__field">
                    <label htmlFor={id('role')}>Who will decide?</label>
                    <select id={id('role')} name="decisionRole" value={decisionRole} onChange={event => setDecisionRole(event.target.value as ContactDecisionRole | '')}>
                      <option value="">Choose if helpful</option>
                      <option value="owner">I can make the decision</option>
                      <option value="shared">I will decide with someone else</option>
                      <option value="researching">I am researching for the business</option>
                    </select>
                  </div>
                </div>
              </div>
            </details>
            <div className="co-inquiry__honeypot" aria-hidden="true">
              <label htmlFor={id('company')}>Leave this field empty</label>
              <input id={id('company')} name="company" tabIndex={-1} autoComplete="off" value={company} onChange={event => setCompany(event.target.value)} />
            </div>
            <div className="co-inquiry__actions">
              <button type="submit" className="co-inquiry__submit">{status === 'sending' ? 'Sending your inquiry…' : 'Send my inquiry'}</button>
              <p>We use your details to respond to this inquiry. <a href="/privacy">Privacy policy</a></p>
            </div>
          </fieldset>
          {error && <p className="co-inquiry__error" role="alert" ref={errorMessage} tabIndex={-1}>{error}</p>}
        </form>
      )}
    </section>
  )
}
