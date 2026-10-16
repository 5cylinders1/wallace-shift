import { useRef, useState, type FormEvent } from 'react'
import { business } from '../content/siteConfig'
import { submitDemoRequest } from './request'
import './demo-access.css'

const demos = {
  roofers: { name: 'Northvane Roofing', detail: 'Roofing website · Concept 01' },
  'roofers-2': { name: 'Alder & Stone', detail: 'Roofing website · Concept 02' },
  'roofers-3': { name: 'Contour Roofing', detail: 'Roofing website · Concept 03' },
  'roofers-4': { name: 'Halcyon Roofworks', detail: 'Roofing website · Concept 04' },
  'roofers-5': { name: 'Velar Roof Atelier', detail: 'Roofing website · Concept 05' },
  'roofers-dashboard': { name: 'Roofing Dashboard', detail: 'Roofing operations · Interactive concept' },
} as const

type Status = 'idle' | 'submitting' | 'sent' | 'not_configured' | 'invalid' | 'rate_limited' | 'error'

const studioUrl = 'https://www.wallaceshift.com/'

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {diagonal
        ? <path d="M6 18 18 6M6 6h12v12" stroke="currentColor" strokeWidth="1.5" />
        : <path d="M4 12h16m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" />}
    </svg>
  )
}

export function DemoRequestPage() {
  const search = new URLSearchParams(window.location.search)
  const requestedDemo = search.get('demo') ?? ''
  const accessExpired = search.get('access') === 'expired' || search.get('access') === 'invalid'
  const demoKey = Object.hasOwn(demos, requestedDemo) ? requestedDemo as keyof typeof demos : ''
  const demo = demoKey ? demos[demoKey] : null
  const [status, setStatus] = useState<Status>('idle')
  const statusRef = useRef<HTMLDivElement>(null)
  const submitting = status === 'submitting'
  const salesEmail = business.salesEmail
  const mailto = salesEmail
    ? `mailto:${salesEmail}?subject=${encodeURIComponent(`Demo request${demo ? `: ${demo.name}` : ''}`)}`
    : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    const form = event.currentTarget
    const data = new FormData(form)
    const text = (name: string) => String(data.get(name) ?? '').trim()
    if (!text('name') || !text('businessName') || !text('email')) {
      setStatus('invalid')
      return
    }
    setStatus('submitting')
    const result = await submitDemoRequest({
      name: text('name'),
      businessName: text('businessName'),
      email: text('email'),
      website: text('website'),
      message: text('message'),
      company: text('company'),
      demo: demoKey,
    })
    setStatus(result.ok ? 'sent' : result.reason)
    // Focus a persistent status region after React has rendered its message.
    requestAnimationFrame(() => statusRef.current?.focus())
  }

  return (
    <div className="demo-access">
      <a className="demo-access__skip" href="#demo-request">Skip to request form</a>
      <header className="demo-access__header">
        <a className="demo-access__brand" href={studioUrl} aria-label="Wallace Shift home">
          <img src="/brand/wallace-shift-logo-white.svg" alt="" width="66" height="40" />
          <span>WALLACE SHIFT<span>Design. Technology. Momentum.</span></span>
        </a>
        <a className="demo-access__back" href={studioUrl}>Back to the studio <Arrow diagonal /></a>
      </header>

      <main className="demo-access__main">
        <section className="demo-access__intro" aria-labelledby="demo-heading">
          <p className="demo-access__eyebrow"><span />Private demo access</p>
          <h1 id="demo-heading">Take a<br />closer <em>look.</em></h1>
          <p className="demo-access__description">
            See what a thoughtful website or client experience could do for your business.
            Request a private demo to explore the possibilities.
          </p>

          <div className="demo-access__concept">
            <div className="demo-access__concept-mark" aria-hidden="true">
              <svg viewBox="0 0 48 48" fill="none"><path d="M7 33 24 10l17 23H7Zm8 5h18M20 27l4-6 4 6" stroke="currentColor" strokeWidth="1.2" /></svg>
            </div>
            <div>
              <p className="demo-access__small-label">{demo ? 'Your selected demo' : 'The Wallace Shift collection'}</p>
              <h2>{demo?.name ?? 'Find the right fit'}</h2>
              <p className="demo-access__concept-detail">{demo?.detail ?? 'Websites, web apps & client experiences'}</p>
            </div>
          </div>

          <p className="demo-access__access-note">Have an access link? Open the link shared with you. After approval, verify your email and accept our <a href="/demo-agreement/" style={{ color: '#83c3ff', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Demo Evaluation & Confidentiality Agreement</a> before exploring.</p>
        </section>

        <section className="demo-access__card" id="demo-request" aria-labelledby="request-heading">
          {accessExpired && (
            <p className="demo-access__invite-notice" role="status">This access link has expired or is no longer valid. Request a new link below.</p>
          )}
          <div className="demo-access__card-heading">
            <span className="demo-access__card-index" aria-hidden="true">LET’S TALK</span>
            <h2 id="request-heading">Request a demo</h2>
            <p>Tell us a little about your business. We’ll review your request and follow up by email.</p>
          </div>

          {status !== 'sent' && (
            <form className="demo-access__form" onSubmit={handleSubmit} aria-busy={submitting}>
              <p className="demo-access__required-note">Fields marked * are required.</p>
              <fieldset disabled={submitting}>
                <legend className="demo-access__visually-hidden">Your demo request</legend>
                <div className="demo-access__row">
                  <div className="demo-access__field">
                    <label htmlFor="demo-name">Your name <span aria-hidden="true">*</span></label>
                    <input id="demo-name" name="name" type="text" autoComplete="name" required maxLength={120} placeholder="Full name" />
                  </div>
                  <div className="demo-access__field">
                    <label htmlFor="demo-business">Business name <span aria-hidden="true">*</span></label>
                    <input id="demo-business" name="businessName" type="text" autoComplete="organization" required maxLength={160} placeholder="Your business" />
                  </div>
                </div>
                <div className="demo-access__field">
                  <label htmlFor="demo-email">Email <span aria-hidden="true">*</span></label>
                  <input id="demo-email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@business.com" />
                </div>
                <div className="demo-access__field">
                  <label htmlFor="demo-website">Current website <span>(optional)</span></label>
                  <input id="demo-website" name="website" type="text" inputMode="url" autoComplete="url" maxLength={500} placeholder="yourbusiness.com" />
                </div>
                <div className="demo-access__field">
                  <label htmlFor="demo-message">What are you looking for? <span>(optional)</span></label>
                  <textarea id="demo-message" name="message" rows={3} maxLength={5000} placeholder="A new website, a better client experience, or something else…" />
                </div>
                <div className="demo-access__honeypot" aria-hidden="true">
                  <label htmlFor="demo-company">Company</label>
                  <input id="demo-company" name="company" type="text" autoComplete="off" tabIndex={-1} maxLength={200} />
                </div>
                <button className="demo-access__submit" type="submit" disabled={submitting}>
                  <span>{submitting ? 'Sending your request…' : 'Request demo access'}</span><Arrow />
                </button>
              </fieldset>
              <p className="demo-access__form-note">We’ll use these details to respond to your demo request.</p>
            </form>
          )}

          <div
            className={`demo-access__status${status === 'sent' ? ' demo-access__status--sent' : ''}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            tabIndex={-1}
            ref={statusRef}
          >
            {status === 'submitting' && <span className="demo-access__visually-hidden">Sending your request.</span>}
            {status === 'sent' && (
              <>
                <span className="demo-access__success-mark" aria-hidden="true">✓</span>
                <h3>Request received.</h3>
                <p>Thank you for your interest{demo ? ` in ${demo.name}` : ''}. We’ll review your request and follow up by email. If approved, your invitation will guide you through email verification and our demo agreement.</p>
                <a href={studioUrl}>Explore Wallace Shift <Arrow /></a>
              </>
            )}
            {status === 'not_configured' && <p>This form isn’t connected to an inbox yet, so nothing was sent. Please email Bella below to request your demo.</p>}
            {status === 'invalid' && <p>Your request wasn’t sent. Please check your name, business name, and email, then try again.</p>}
            {status === 'rate_limited' && <p>Too many requests were received. Please wait a few minutes and try again, or email Bella below.</p>}
            {status === 'error' && <p>We couldn’t confirm your request was sent. Please try again or email Bella below.</p>}
          </div>

          {mailto && (
            <div className="demo-access__email">
              <p>Prefer a conversation?</p>
              <a href={mailto}>Email Bella <Arrow diagonal /></a>
              <span>{salesEmail}</span>
            </div>
          )}
        </section>
      </main>

      <footer className="demo-access__footer">
        <p>© {new Date().getFullYear()} Wallace Shift</p>
        <a href={`/demo-admin/${demoKey ? `?demo=${encodeURIComponent(demoKey)}` : ''}`}>Admin sign in</a>
        <p>Distinctive by design. Built to move you forward.</p>
      </footer>
    </div>
  )
}
