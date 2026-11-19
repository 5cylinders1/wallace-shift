import { useEffect, useRef, useState, type FormEvent } from 'react'
import { packagePurchases, PACKAGE_TERMS_VERSION, type PurchasePackageId } from '../../content/packagePurchase'
import { trackSiteEvent } from '../../lib/analytics'
import SlideInDialog from './SlideInDialog'
import './package-checkout.css'

const ENDPOINT = '/api/package-checkout'
const errors: Record<string, string> = {
  invalid: 'Please check your details and try again.',
  invalid_fields: 'Please check your name, business name and email address.',
  authority_required: 'Please confirm that you can buy this for the business.',
  offer_changed: 'The terms for this package have changed. Refresh the page to see the current version.',
  not_configured: 'Online purchase is unavailable right now. Use Discuss your project instead.',
  email_not_configured: 'Online purchase is unavailable right now. Use Discuss your project instead.',
  stripe_not_configured: 'Online purchase is unavailable right now. Use Discuss your project instead.',
  email_unavailable: 'We could not send your code. Please try again in a minute.',
  rate_limited: 'Please wait a minute before trying again. Your details are still here.',
  invalid_code: 'Enter the six digit code from your email.',
  code_invalid: 'That code is not right. Check the email and try again.',
  code_expired: 'That code has expired. Send a new code.',
  submission_conflict: 'An agreement already exists for this purchase. Open the client portal to review it.',
  agreement_archived: 'This purchase was closed. Please contact Wallace Shift.',
}
type Response = { ok: boolean; error?: string; url?: string }

async function post(body: Record<string, unknown>): Promise<Response> {
  const response = await fetch(ENDPOINT, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  try { return await response.json() as Response } catch { return { ok: false, error: 'temporarily_unavailable' } }
}

type Props = { open: boolean; packageId: PurchasePackageId; onClose: () => void }

/** Buy a homepage package online: details, emailed code, then the client portal to sign and pay. */
export default function PackageCheckout({ open, packageId, onClose }: Props) {
  const item = packagePurchases[packageId]
  const heading = useRef<HTMLHeadingElement>(null)
  const feedback = useRef<HTMLParagraphElement>(null)
  const codeInput = useRef<HTMLInputElement>(null)
  const submissionId = useRef<string | null>(null)
  const [stage, setStage] = useState<'details' | 'code'>('details')
  const [name, setName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [authority, setAuthority] = useState(false)
  const [company, setCompany] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [resent, setResent] = useState(false)

  useEffect(() => { if (error) feedback.current?.focus() }, [error])
  useEffect(() => { if (stage === 'code') codeInput.current?.focus() }, [stage])

  async function sendCode() {
    submissionId.current ??= crypto.randomUUID()
    const result = await post({ action: 'send-code', submissionId: submissionId.current, packageId, termsVersion: PACKAGE_TERMS_VERSION, name: name.trim(), businessName: businessName.trim(), email: email.trim(), authorityConfirmed: authority, company })
    if (!result.ok) { setError(errors[result.error ?? ''] ?? 'Something went wrong. Your details are still here. Please try again.'); return false }
    trackSiteEvent({ name: 'package_checkout_code_sent', value: packageId })
    return true
  }
  async function submitDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !event.currentTarget.reportValidity()) return
    setBusy(true); setError('')
    try { if (await sendCode()) { setStage('code'); setResent(false) } }
    catch { setError('We could not reach Wallace Shift. Check your connection and try again.') }
    finally { setBusy(false) }
  }
  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !event.currentTarget.reportValidity()) return
    setBusy(true); setError('')
    try {
      const result = await post({ action: 'verify-code', code: code.trim() })
      if (result.ok && result.url) {
        trackSiteEvent({ name: 'package_checkout_verified', value: packageId })
        window.location.assign(result.url)
        return
      }
      setError(errors[result.error ?? ''] ?? 'We could not check that code. Please try again.')
    } catch { setError('We could not reach Wallace Shift. Check your connection and try again.') }
    finally { setBusy(false) }
  }
  async function resend() {
    setBusy(true); setError(''); setResent(false)
    try { if (await sendCode()) { setResent(true); setCode('') } }
    catch { setError('We could not reach Wallace Shift. Check your connection and try again.') }
    finally { setBusy(false) }
  }

  const steps = ['Your details', 'Verify your email', 'Read, sign and pay in your client portal']
  return <SlideInDialog open={open} onClose={onClose} labelledBy="package-checkout-heading" describedBy="package-checkout-price" closeLabel="Close purchase form" initialFocus={heading}>
    <div className="call-request-content package-checkout">
      <div className="call-request-intro">
        <h2 id="package-checkout-heading" ref={heading} tabIndex={-1}>{item.name} <em>{item.accent}.</em></h2>
        <p id="package-checkout-price" className="package-checkout-price"><strong>{item.todayLabel}</strong>, {item.thenLabel}.</p>
        <ol className="package-checkout-steps" aria-label="How buying works">
          {steps.map((label, index) => <li key={label} aria-current={(stage === 'details' ? 0 : 1) === index ? 'step' : undefined}><span aria-hidden="true">{index + 1}</span>{label}</li>)}
        </ol>
        <section className="package-checkout-terms" aria-labelledby="package-checkout-terms-heading">
          <h3 id="package-checkout-terms-heading">What you are agreeing to</h3>
          <ul>{item.terms.map(term => <li key={term}>{term}</li>)}</ul>
          <p>You read and sign the full agreement in your client portal before any payment. Card payments go through Stripe. An eligible credit card may carry a surcharge of up to 3%, shown before you pay; debit cards have none.</p>
        </section>
      </div>

      {stage === 'details' ? <form className="call-request-form" onSubmit={submitDetails} aria-label="Your details" aria-busy={busy}>
        <fieldset disabled={busy}>
          <legend className="call-request-sr-only">Your details</legend>
          <div className="call-request-field"><label htmlFor="package-checkout-name">Your full legal name</label><input id="package-checkout-name" autoComplete="name" required maxLength={160} value={name} onChange={event => setName(event.target.value)} /></div>
          <div className="call-request-field"><label htmlFor="package-checkout-business">Legal business name</label><input id="package-checkout-business" autoComplete="organization" required maxLength={200} value={businessName} onChange={event => setBusinessName(event.target.value)} /></div>
          <div className="call-request-field"><label htmlFor="package-checkout-email">Email address</label><input id="package-checkout-email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254} aria-describedby="package-checkout-email-hint" value={email} onChange={event => setEmail(event.target.value)} /><small id="package-checkout-email-hint">We send a six digit code here. This email becomes your client portal sign in.</small></div>
          <label className="package-checkout-check"><input type="checkbox" required checked={authority} onChange={event => setAuthority(event.target.checked)} /><span>I am authorized to buy this for the business.</span></label>
          <div className="call-request-honeypot" aria-hidden="true"><label htmlFor="package-checkout-company">Leave this field empty</label><input id="package-checkout-company" tabIndex={-1} autoComplete="off" value={company} onChange={event => setCompany(event.target.value)} /></div>
          <button className="call-request-submit" type="submit">{busy ? 'Sending your code…' : 'Email me a code'}<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" /></svg></button>
        </fieldset>
        {error && <p ref={feedback} tabIndex={-1} className="call-request-error" role="alert">{error}</p>}
        <p className="call-request-privacy">Nothing is charged here. We use your details to prepare your agreement. <a href="/privacy" target="_blank" rel="noreferrer">Privacy policy (opens in a new tab)</a></p>
      </form> : <form className="call-request-form" onSubmit={submitCode} aria-label="Verify your email" aria-busy={busy}>
        <fieldset disabled={busy}>
          <legend className="call-request-sr-only">Verify your email</legend>
          <div className="call-request-field"><label htmlFor="package-checkout-code">Six digit code sent to {email.trim()}</label><input ref={codeInput} id="package-checkout-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required aria-describedby="package-checkout-code-hint" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} /><small id="package-checkout-code-hint">{resent ? 'A new code is on its way. ' : ''}The code expires in 10 minutes.</small></div>
          <button className="call-request-submit" type="submit">{busy ? 'Checking…' : 'Continue to your agreement'}<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" /></svg></button>
          <div className="package-checkout-links">
            <button type="button" onClick={() => void resend()}>Send a new code</button>
            <button type="button" onClick={() => { setStage('details'); setCode(''); setError('') }}>Use a different email</button>
          </div>
        </fieldset>
        {error && <p ref={feedback} tabIndex={-1} className="call-request-error" role="alert">{error}</p>}
      </form>}
    </div>
  </SlideInDialog>
}
