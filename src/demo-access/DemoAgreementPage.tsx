import { useEffect, useRef, useState, type FormEvent } from 'react'
import { agreementText, demoAgreement } from '../content/demoAgreement'
import { business } from '../content/siteConfig'
import './demo-access.css'
import './demo-agreement.css'

type AccessState = {
  demo: string
  verified: boolean
  email?: string
  agreementVersion: string
  agreementHash: string
}

type ApiResult = Partial<AccessState> & { ok?: boolean; error?: string; reason?: string; redirectTo?: string; retryAfter?: number }
type Action = 'send-code' | 'verify-code' | 'accept'

const demoNames: Record<string, string> = {
  roofers: 'Northvane Roofing',
  'roofers-2': 'Alder & Stone',
  'roofers-3': 'Contour Roofing',
  'roofers-4': 'Halcyon Roofworks',
  'roofers-5': 'Velar Roof Atelier',
  'roofers-6': 'Stratum Roofing Co.',
  'roofers-dashboard': 'Roofing Dashboard',
}

const messages: Record<string, string> = {
  invite_required: 'Open the approved invitation shared with you to verify your email and accept this agreement. You can read the complete terms here at any time.',
  expired: 'Your invitation has expired. Please request a new invitation to continue.',
  invite_expired: 'Your invitation has expired. Please request a new invitation to continue.',
  invalid_invite: 'This invitation is no longer valid. Please request a new invitation to continue.',
  not_configured: 'Private demo access is not available yet. Please email Bella for help arranging your demo.',
  rate_limited: 'Too many attempts were received. Please wait a few minutes before trying again, or email Bella for help.',
  wrong_email: 'Use the email address approved for this invitation. Contact Bella if your email has changed.',
  email_mismatch: 'Use the email address approved for this invitation. Contact Bella if your email has changed.',
  invalid_code: 'That code is incorrect or has expired. Check the six digits in your email, or request a new code.',
  code_invalid: 'That code is incorrect. Check the six digits in your email, or request a new code.',
  code_expired: 'Your verification code has expired. Request a new code to continue.',
  verification_required: 'Please verify your email again before accepting the agreement.',
  agreement_changed: 'The agreement has been updated. Reload this page to read the current terms before accepting.',
  agreement_mismatch: 'The agreement has been updated. Reload this page to read the current terms before accepting.',
  invalid: 'Please check the information you entered and try again.',
  acceptance_required: 'Enter your full legal name and business name, then select both confirmations to accept the agreement.',
  identity_mismatch: 'This invitation already has an acceptance record with different details. Please contact Bella for help with your invitation.',
  forbidden: 'We couldn’t validate this request. Reload the page and try again, or email Bella for help.',
  too_large: 'Some information is too long. Please shorten your entries and try again.',
  unavailable: 'We couldn’t complete that step. Your demo remains locked. Please try again or email Bella for help.',
  upstream: 'We couldn’t complete that step. Your demo remains locked. Please try again or email Bella for help.',
  error: 'We couldn’t complete that step. Your demo remains locked. Please try again or email Bella for help.',
}

async function requestAgreement(body?: Record<string, unknown>, signal?: AbortSignal): Promise<ApiResult> {
  const response = await fetch('/api/demo-agreement', {
    method: body ? 'POST' : 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
  })
  const result: ApiResult = await response.json()
  return response.ok && result.ok ? result : { ok: false, error: result.error ?? result.reason ?? 'error' }
}

function accessState(result: ApiResult): AccessState | null {
  return result.ok && typeof result.demo === 'string' && typeof result.verified === 'boolean'
    && typeof result.agreementVersion === 'string' && typeof result.agreementHash === 'string'
    ? { demo: result.demo, verified: result.verified, email: result.email, agreementVersion: result.agreementVersion, agreementHash: result.agreementHash }
    : null
}

async function displayedAgreementHash() {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(agreementText))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export function DemoAgreementPage() {
  const [access, setAccess] = useState<AccessState | null>(null)
  const [loading, setLoading] = useState(true)
  const [renderedHash, setRenderedHash] = useState('')
  const [busy, setBusy] = useState<Action | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(0)
  const [name, setName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [authority, setAuthority] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const salesEmail = business.salesEmail
  const mailto = `mailto:${salesEmail}?subject=${encodeURIComponent('Private demo access')}`
  const canAccept = access?.verified && renderedHash.length > 0 && name.trim().length > 0 && businessName.trim().length > 0 && accepted && authority && !busy

  useEffect(() => {
    const controller = new AbortController()
    async function loadAccess() {
      try {
        const [result, hash] = await Promise.all([requestAgreement(undefined, controller.signal), displayedAgreementHash()])
        if (controller.signal.aborted) return
        const next = accessState(result)
        if (next && (next.agreementVersion !== demoAgreement.version || next.agreementHash !== hash)) {
          setError('agreement_changed')
        } else if (next) {
          setRenderedHash(hash)
          setAccess(next)
        } else {
          setError(result.error ?? 'error')
        }
      } catch {
        if (!controller.signal.aborted) setError('error')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void loadAccess()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (resendSeconds === 0) return
    const timer = window.setTimeout(() => setResendSeconds(seconds => Math.max(0, seconds - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [resendSeconds])

  function showError(reason: string) {
    setError(reason)
    setNotice('')
    if (reason === 'verification_required') {
      setAccess(current => current ? { ...current, verified: false, email: undefined } : current)
      setCodeSent(false)
      setCode('')
      setAccepted(false)
      setAuthority(false)
    }
    if (['invite_required', 'invite_expired', 'expired', 'invalid_invite', 'agreement_changed', 'agreement_mismatch'].includes(reason)) setAccess(null)
    requestAnimationFrame(() => statusRef.current?.focus())
  }

  async function submit(action: Action, event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (busy || !access) return
    if (action === 'accept' && !canAccept) return
    setBusy(action)
    setError('')
    setNotice('')
    try {
      const body = action === 'send-code' ? { action, email: email.trim() }
        : action === 'verify-code' ? { action, code: code.trim() }
          : { action, name: name.trim(), businessName: businessName.trim(), accepted, authority, agreementVersion: demoAgreement.version, agreementHash: renderedHash }
      const result = await requestAgreement(body)
      if (!result.ok) {
        showError(result.error ?? 'error')
      } else if (action === 'send-code') {
        setCodeSent(true)
        setCode('')
        setResendSeconds(Math.min(300, Math.max(0, result.retryAfter ?? 60)))
        setNotice('A six-digit code was sent to your approved email address. It expires in 10 minutes.')
        requestAnimationFrame(() => codeRef.current?.focus())
      } else if (action === 'verify-code') {
        const verified = accessState(await requestAgreement())
        if (!verified?.verified || !verified.email) {
          showError('verification_required')
        } else if (verified.agreementVersion !== demoAgreement.version || verified.agreementHash !== renderedHash) {
          showError('agreement_changed')
        } else {
          setAccess(verified)
          setNotice('Email verified. Review the agreement and complete both confirmations to open your demo.')
          requestAnimationFrame(() => nameRef.current?.focus())
        }
      } else if (result.redirectTo && result.redirectTo.startsWith('/') && !result.redirectTo.startsWith('//')) {
        setNotice('Agreement accepted. Opening your demo…')
        window.location.assign(result.redirectTo)
        return
      } else {
        showError('error')
      }
    } catch {
      showError('error')
    }
    setBusy(null)
  }

  return (
    <div className="demo-access demo-agreement">
      <a className="demo-access__skip" href="#agreement-terms">Skip to agreement</a>
      <header className="demo-access__header">
        <a className="demo-access__brand" href="https://www.wallaceshift.com/" aria-label="Wallace Shift home">
          <img src="/brand/wallace-shift-logo-white.svg" alt="" width="66" height="40" />
          <span>WALLACE SHIFT<span>Design. Technology. Momentum.</span></span>
        </a>
        <a className="demo-access__back" href="/request-demo/">Request a demo <span aria-hidden="true">↗</span></a>
      </header>

      <main className="demo-agreement__main">
        <div className="demo-agreement__intro">
          <p className="demo-access__eyebrow"><span />Private demo access</p>
          <h1>Before you <em>explore.</em></h1>
          <p>A few clear terms for evaluating our work. Read the agreement, verify your approved email address, and accept to open your private demo.</p>
          <a href="#agreement-access">Go to access steps <span aria-hidden="true">↓</span></a>
        </div>

        <div className="demo-agreement__layout">
          <article id="agreement-terms" className="demo-agreement__terms" aria-labelledby="agreement-title">
            <div className="demo-agreement__document-meta"><span>{demoAgreement.owner}</span><span>Version {demoAgreement.version}</span></div>
            <h2 id="agreement-title">{demoAgreement.title}</h2>
            <button className="demo-agreement__print" type="button" onClick={() => window.print()}>Print / save a copy <span aria-hidden="true">↗</span></button>
            {demoAgreement.sections.map(section => (
              <section key={section.heading} aria-labelledby={`agreement-section-${section.heading[0]}`}>
                <h3 id={`agreement-section-${section.heading[0]}`}>{section.heading}</h3>
                {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
              </section>
            ))}
            <div className="demo-agreement__print-confirmations">
              <h3>Electronic acceptance confirmations</h3>
              <p>{demoAgreement.acceptanceText}</p>
              <p>{demoAgreement.authorityText}</p>
            </div>
          </article>

          <aside className="demo-access__card demo-agreement__access" id="agreement-access" aria-labelledby="access-heading">
            <div className="demo-access__card-heading">
              <span className="demo-access__card-index">YOUR PRIVATE INVITATION</span>
              <h2 id="access-heading">Open your demo</h2>
              <p>{access ? demoNames[access.demo] ?? 'Wallace Shift demo' : 'Approval comes first. Acceptance completes your access.'}</p>
            </div>

            {loading && <p className="demo-agreement__loading" role="status">Checking your invitation…</p>}

            {access && !access.verified && (
              <div className="demo-agreement__verification">
                <h3><span>01</span> Verify your email</h3>
                <p>Enter the email address approved for this invitation. We’ll send you a one-time code.</p>
                <form className="demo-access__form" onSubmit={event => void submit('send-code', event)} aria-busy={busy === 'send-code'}>
                  <fieldset disabled={!!busy}>
                    <legend className="demo-access__visually-hidden">Send email verification code</legend>
                    <div className="demo-access__field">
                      <label htmlFor="agreement-email">Approved email address</label>
                      <input id="agreement-email" name="email" type="email" required autoComplete="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} placeholder="you@business.com" />
                    </div>
                    <button className="demo-access__submit" type="submit" disabled={resendSeconds > 0}>{busy === 'send-code' ? 'Sending code…' : resendSeconds > 0 ? `Resend available in ${resendSeconds}s` : codeSent ? 'Send a new code' : 'Send verification code'} <span aria-hidden="true">→</span></button>
                  </fieldset>
                </form>
                {codeSent && (
                  <form className="demo-access__form demo-agreement__code" onSubmit={event => void submit('verify-code', event)} aria-busy={busy === 'verify-code'}>
                    <fieldset disabled={!!busy}>
                      <legend className="demo-access__visually-hidden">Verify your email</legend>
                      <div className="demo-access__field">
                        <label htmlFor="agreement-code">Six-digit code</label>
                        <input id="agreement-code" ref={codeRef} name="code" type="text" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" />
                      </div>
                      <button className="demo-access__submit" type="submit">{busy === 'verify-code' ? 'Verifying…' : 'Verify email'} <span aria-hidden="true">→</span></button>
                    </fieldset>
                  </form>
                )}
              </div>
            )}

            {access?.verified && (
              <>
                <div className="demo-agreement__verified"><span aria-hidden="true">✓</span><div><p>Email verified</p><strong>{access.email}</strong></div></div>
                <form className="demo-access__form demo-agreement__accept" onSubmit={event => void submit('accept', event)} aria-busy={busy === 'accept'}>
                  <h3><span>02</span> Review & accept</h3>
                  <p className="demo-access__required-note">All fields and both confirmations are required.</p>
                  <fieldset disabled={!!busy}>
                    <legend className="demo-access__visually-hidden">Sign the demo agreement</legend>
                    <div className="demo-access__field">
                      <label htmlFor="agreement-name">Full legal name</label>
                      <input id="agreement-name" ref={nameRef} name="name" type="text" autoComplete="name" required maxLength={120} value={name} onChange={event => setName(event.target.value)} />
                    </div>
                    <div className="demo-access__field">
                      <label htmlFor="agreement-business">Business name</label>
                      <input id="agreement-business" name="businessName" type="text" autoComplete="organization" required maxLength={160} value={businessName} onChange={event => setBusinessName(event.target.value)} />
                    </div>
                    <a className="demo-agreement__review-link" href="#agreement-terms">Read the complete agreement <span aria-hidden="true">↖</span></a>
                    <label className="demo-agreement__check"><input type="checkbox" name="accepted" checked={accepted} onChange={event => setAccepted(event.target.checked)} required /><span>{demoAgreement.acceptanceText}</span></label>
                    <label className="demo-agreement__check"><input type="checkbox" name="authority" checked={authority} onChange={event => setAuthority(event.target.checked)} required /><span>{demoAgreement.authorityText}</span></label>
                    <button className="demo-access__submit" type="submit" disabled={!canAccept}>{busy === 'accept' ? 'Recording acceptance…' : 'Accept agreement & open demo'} <span aria-hidden="true">→</span></button>
                  </fieldset>
                  <p className="demo-access__form-note">We keep your name, business, verified email, and a dated record of the agreement you accept. <a href="https://www.wallaceshift.com/privacy/">Privacy policy</a></p>
                </form>
              </>
            )}

            <div className={`demo-access__status demo-agreement__status${notice ? ' demo-agreement__status--notice' : ''}`} role="status" aria-live="polite" aria-atomic="true" tabIndex={-1} ref={statusRef}>
              {error && <p>{messages[error] ?? messages.error}</p>}
              {notice && <p>{notice}</p>}
              {!loading && !access && <a href={error === 'agreement_changed' || error === 'agreement_mismatch' ? '/demo-agreement/' : '/request-demo/'}>{error === 'agreement_changed' || error === 'agreement_mismatch' ? 'Reload the agreement' : 'Request a demo invitation'} <span aria-hidden="true">→</span></a>}
            </div>
            <div className="demo-access__email"><p>Need a hand?</p><a href={mailto}>Email Bella <span aria-hidden="true">↗</span></a><span>{salesEmail}</span></div>
          </aside>
        </div>
      </main>

      <footer className="demo-access__footer"><p>© {new Date().getFullYear()} {demoAgreement.owner}</p><p>Distinctive by design. Built to move you forward.</p></footer>
    </div>
  )
}
