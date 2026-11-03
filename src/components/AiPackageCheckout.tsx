import { useEffect, useRef, useState, type FormEvent } from 'react'
import { aiOffer, aiPackages, type AiPackageId, type AiQualificationAnswers } from '../content/aiOffer'
import type { AiOpportunityFormValues } from '../lib/aiOpportunityAdapter'

const checkoutErrors: Record<string, string> = {
  invalid: 'Please check your purchase details and confirm that you are authorized to purchase.',
  not_configured: 'Online payment is temporarily unavailable. Please try again later.',
  checkout_unavailable: 'Online payment is temporarily unavailable. Please try again later.',
  stripe_not_configured: 'Online payment is temporarily unavailable. Please try again later.',
  email_not_configured: 'Email verification is temporarily unavailable. Please try again later.',
  invalid_fields: 'Please check your name, business, and email address.',
  invalid_email: 'Please enter a valid email address.',
  invalid_code: 'That code is incorrect or expired. Check the code or request a new one.',
  code_invalid: 'That code is incorrect or expired. Check the code or request a new one.',
  code_expired: 'This code has expired. Request a new code to continue.',
  verification_failed: 'That code is incorrect or expired. Check the code or request a new one.',
  rate_limited: 'Please wait before trying again. Your details are still here.',
  email_unavailable: 'We could not send your code. Please try again shortly.',
  offer_changed: 'This package has changed. Refresh the page to review the current offer.',
  authority_required: 'Please confirm that you are authorized to purchase for this business.',
  submission_conflict: 'An agreement already exists for the previous details. Please open the client portal to review it before starting another purchase.',
}

export type AiCheckoutDraft = {
  details: { name: string; businessName: string; email: string; authorityConfirmed: boolean; company: string }
  stage: 'details' | 'code'
  code: string
  attempt: { id: string; fingerprint: string }
}

async function checkoutRequest(body?: Record<string, unknown>) {
  const response = await fetch('/api/ai-checkout', {
    method: body ? 'POST' : 'GET', credentials: 'same-origin',
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(25000),
  })
  const result = await response.json() as { ok?: boolean; ready?: boolean; url?: string; error?: string; reason?: string }
  if (!response.ok || !result.ok) throw new Error(result.error ?? result.reason ?? 'unavailable')
  return result
}

/** The server creates the priced agreement only after email ownership is verified. */
export function AiPackageCheckout({ packageId, values, onBack, draft, onDraftChange }: {
  packageId: AiPackageId; values: AiOpportunityFormValues; onBack: () => void
  draft?: AiCheckoutDraft; onDraftChange: (draft: AiCheckoutDraft) => void
}) {
  const offer = aiPackages[packageId]
  const headingRef = useRef<HTMLHeadingElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)
  const attempt = useRef(draft?.attempt ?? { id: crypto.randomUUID(), fingerprint: '' })
  const [readiness, setReadiness] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [details, setDetails] = useState(draft?.details ?? { name: values.name, businessName: values.businessName, email: values.email, authorityConfirmed: false, company: '' })
  const [stage, setStage] = useState<'details' | 'code'>(draft?.stage ?? 'details')
  const [code, setCode] = useState(draft?.code ?? '')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
    let active = true
    void checkoutRequest().then(result => { if (active) setReadiness(result.ready ? 'ready' : 'unavailable') })
      .catch(() => { if (active) setReadiness('unavailable') })
    return () => { active = false }
  }, [])
  useEffect(() => { if (stage === 'code') codeRef.current?.focus() }, [stage])
  useEffect(() => { onDraftChange({ details, stage, code, attempt: attempt.current }) }, [details, stage, code, onDraftChange])

  async function checkAgain() {
    setReadiness('loading')
    try { setReadiness((await checkoutRequest()).ready ? 'ready' : 'unavailable') }
    catch { setReadiness('unavailable') }
  }

  async function sendCode() {
    setBusy(true); setFailure(''); setNotice('')
    const answers: AiQualificationAnswers = {
      businessType: values.businessType, workflows: values.workflows, workflowDetails: values.workflowDetails,
      currentTools: values.currentTools, weeklyHours: values.weeklyHours, impacts: values.impacts, role: values.role,
      approverAvailability: values.approverAvailability, revenue: values.revenue, aiExperience: values.aiExperience,
      aiBarriers: values.aiBarriers, budget: values.budget, timing: values.timing,
    } as AiQualificationAnswers
    const purchase = { ...details, packageId, offerVersion: aiOffer.version, answers }
    const fingerprint = JSON.stringify(purchase)
    if (attempt.current.fingerprint && attempt.current.fingerprint !== fingerprint) attempt.current.id = crypto.randomUUID()
    attempt.current.fingerprint = fingerprint
    try {
      await checkoutRequest({ action: 'send-code', ...purchase, submissionId: attempt.current.id })
      setStage('code'); setCode(''); setNotice(`A verification code was sent to ${details.email.trim()}.`)
    } catch (error) { setFailure(checkoutErrors[error instanceof Error ? error.message : ''] ?? 'We could not send your code. Your details are still here. Please try again.') }
    finally { setBusy(false) }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || readiness !== 'ready') return
    if (stage === 'details') { await sendCode(); return }
    setBusy(true); setFailure('')
    try {
      const result = await checkoutRequest({ action: 'verify-code', code: code.trim() })
      // Only the local client portal is a valid destination for this purchase.
      const target = new URL(result.url ?? '', window.location.origin)
      if (target.origin !== window.location.origin || target.pathname !== '/client-portal' || !target.searchParams.get('engagement')) throw new Error('unavailable')
      window.location.assign(`${target.pathname}${target.search}`)
    } catch (error) {
      setFailure(checkoutErrors[error instanceof Error ? error.message : ''] ?? 'We could not open your agreement. Please try again with the same code. You have not been charged.')
      setBusy(false)
    }
  }

  return <section className="qf-checkout" aria-labelledby="qf-checkout-title">
    <header className="qf-result-intro">
      <button className="qf-text-link qf-path-back" type="button" onClick={onBack} disabled={busy}>Back to packages</button>
      <h1 id="qf-checkout-title" ref={headingRef} tabIndex={-1}>Complete your purchase.</h1>
      <p>Your details, then your agreement and secure payment.</p>
    </header>
    <div className="qf-checkout-layout">
      <section className="qf-checkout-order" aria-labelledby="qf-order-title">
        <div className="qf-checkout-order-heading"><h2 id="qf-order-title">{offer.name}</h2><div className="qf-checkout-total"><strong>${offer.price.toLocaleString('en-US')}</strong><span>One time</span></div></div>
        <p><strong>Free business website included.</strong></p>
        <details><summary>Scope, delivery, and separate costs</summary>
          <ul>{offer.scope.map(item => <li key={item}>{item}</li>)}</ul>
          <p>The included website has one page, one inquiry form, and one revision round using your branding and content.</p>
          <p>{offer.boundary} Ongoing support and software subscriptions are separate. Any eligible credit card surcharge is shown before you authorize payment.</p><p>{offer.delivery}</p>
        </details>
      </section>
      <form className="ao-form qf-checkout-form" onSubmit={event => void submit(event)} aria-busy={busy}>
        <h2>{stage === 'details' ? 'Your purchase details' : 'Verify your email'}</h2>
        {readiness === 'loading' && <p className="ao-form__hint" role="status">Checking secure checkout…</p>}
        {readiness === 'unavailable' && <div className="ao-form__notice" role="alert"><p>Online payment is temporarily unavailable. You have not been charged.</p><button className="qf-text-link" type="button" onClick={() => void checkAgain()}>Try checkout again</button></div>}
        <fieldset disabled={busy || readiness !== 'ready'}>
          <legend className="visually-hidden">{stage === 'details' ? 'Buyer details' : 'Email verification'}</legend>
          {stage === 'details' ? <>
            <div className="ao-field"><label htmlFor="purchase-name">Your full legal name</label><input id="purchase-name" name="name" required maxLength={120} autoComplete="name" value={details.name} onChange={event => setDetails({ ...details, name: event.target.value })} /></div>
            <div className="ao-field"><label htmlFor="purchase-business">Legal business name</label><input id="purchase-business" name="businessName" required maxLength={160} autoComplete="organization" value={details.businessName} onChange={event => setDetails({ ...details, businessName: event.target.value })} /></div>
            <div className="ao-field"><label htmlFor="purchase-email">Email address</label><input id="purchase-email" name="email" required type="email" inputMode="email" maxLength={254} autoComplete="email" value={details.email} onChange={event => setDetails({ ...details, email: event.target.value })} /><p className="ao-form__hint">We will send your verification code here.</p></div>
            <label className="ao-check"><input type="checkbox" required checked={details.authorityConfirmed} onChange={event => setDetails({ ...details, authorityConfirmed: event.target.checked })} /><span>I am authorized to purchase this package for the business.</span></label>
            <div className="visually-hidden" aria-hidden="true"><label htmlFor="purchase-company">Leave this field empty</label><input id="purchase-company" name="company" tabIndex={-1} autoComplete="off" value={details.company} onChange={event => setDetails({ ...details, company: event.target.value })} maxLength={200} /></div>
            <p className="ao-form__hint">Your quiz answers will accompany your project. See our <a href="/privacy" target="_blank" rel="noopener noreferrer">privacy policy</a>.</p>
          </> : <>
            <p className="ao-form__hint">Enter the six digit code sent to <strong>{details.email}</strong>.</p>
            <div className="ao-field"><label htmlFor="purchase-code">Verification code</label><input ref={codeRef} id="purchase-code" name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></div>
          </>}
          <button className="ao-button" type="submit">{busy ? stage === 'details' ? 'Sending your code…' : 'Opening your agreement…' : stage === 'details' ? 'Send verification code' : 'Continue to agreement'}</button>
          {stage === 'code' && <div className="qf-checkout-code-actions"><button className="qf-text-link" type="button" onClick={() => void sendCode()}>Send a new code</button><button className="qf-text-link" type="button" onClick={() => { setStage('details'); setFailure(''); setNotice('') }}>Change details</button></div>}
        </fieldset>
        {notice && <p className="ao-form__hint" role="status">{notice}</p>}
        {failure && <div className="ao-form__notice" role="alert"><p>{failure}</p>{failure === checkoutErrors.submission_conflict && <a href="/client-portal">Open client portal</a>}</div>}
        <p className="ao-form__hint">You will review the full agreement and payment total before signing and paying.</p>
      </form>
    </div>
  </section>
}
