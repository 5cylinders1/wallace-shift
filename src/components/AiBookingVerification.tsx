import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { AiQualificationAnswers } from '../content/aiOffer'
import type { AiOpportunityFormValues } from '../lib/aiOpportunityAdapter'

type BookingStatus = { ok: boolean; configured?: boolean; status?: 'unverified' | 'waiting' | 'confirmed'; error?: string }
const messages: Record<string, string> = {
  code_invalid: 'That code is incorrect. Check your email and try again.',
  invalid_code: 'That code is incorrect or expired. Check your email or request a new code.',
  code_expired: 'Your code expired. Request a new code.',
  rate_limited: 'Please wait before trying again.',
  invalid: 'Please check your email address and quiz answers.',
  email_unavailable: 'We could not send your code. Please try again shortly.',
  not_qualified: 'Please review your investment and timing answers before booking.',
  not_configured: 'Automatic booking confirmation is temporarily unavailable. Please try again shortly or request a phone call.',
  calendar_not_connected: 'Online booking is temporarily unavailable. Please try again shortly or request a phone call.',
  calendar_not_configured: 'Online booking is temporarily unavailable. Please try again shortly or request a phone call.',
  calendar_reconnect_required: 'We could not confirm your appointment yet. Please keep your Google confirmation and try again shortly.',
  calendar_unavailable: 'Google Calendar is temporarily unavailable. Please try again shortly.',
  attempt_conflict: 'Your answers have changed. Please return to the quiz and continue to booking again.',
}
async function bookingRequest(attemptId: string, body?: Record<string, unknown>): Promise<BookingStatus> {
  const response = await fetch(`/api/ai-booking?attemptId=${encodeURIComponent(attemptId)}`, {
    method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
    ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  })
  const data = await response.json() as BookingStatus
  if (!response.ok || data.ok !== true) throw new Error(messages[data.error ?? ''] ?? 'We could not check your booking. Please try again.')
  return data
}

export function AiBookingVerification({ attemptId, values, onConfirmed, onVerifiedEmail, onCalendarAccess, autoAdvance = true }: {
  attemptId: string; values: AiOpportunityFormValues; onConfirmed: () => void; onVerifiedEmail: (email: string) => void; onCalendarAccess: (allowed: boolean) => void; autoAdvance?: boolean
}) {
  const [email, setEmail] = useState(values.email)
  const [code, setCode] = useState('')
  const [company, setCompany] = useState('')
  const [stage, setStage] = useState<'loading' | 'unverified' | 'code' | 'waiting' | 'confirmed'>('loading')
  const [configured, setConfigured] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    onCalendarAccess(configured && (stage === 'waiting' || stage === 'confirmed'))
  }, [configured, stage, onCalendarAccess])

  const acceptStatus = useCallback((result: BookingStatus) => {
    setConfigured(result.configured === true)
    if (result.status === 'confirmed' && result.configured) { setStage('confirmed'); if (autoAdvance) onConfirmed(); return }
    setStage(previous => result.status === 'waiting' ? 'waiting' : previous === 'code' ? 'code' : 'unverified')
  }, [onConfirmed, autoAdvance])

  useEffect(() => {
    let active = true
    void bookingRequest(attemptId).then(result => { if (active) acceptStatus(result) })
      .catch((failure: unknown) => { if (active) { setStage('unverified'); setError(failure instanceof Error ? failure.message : 'Please try again.') } })
    return () => { active = false }
  }, [attemptId, acceptStatus])

  useEffect(() => {
    if (stage !== 'waiting' || !configured) return
    let active = true
    let pending = false
    async function check() {
      if (document.hidden || pending) return
      pending = true
      try { const result = await bookingRequest(attemptId); if (active) { setError(''); acceptStatus(result) } }
      catch (failure) { if (active) setError(failure instanceof Error ? failure.message : 'Please try again.') }
      finally { pending = false }
    }
    const timer = window.setInterval(() => void check(), 10000)
    document.addEventListener('visibilitychange', check)
    void check()
    return () => { active = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', check) }
  }, [stage, configured, attemptId, acceptStatus])

  async function retry() {
    setBusy(true); setError('')
    try { acceptStatus(await bookingRequest(attemptId)) }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Please try again.') }
    finally { setBusy(false) }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      if (stage === 'code') {
        await bookingRequest(attemptId, { action: 'verify-code', code: code.trim() })
        onVerifiedEmail(email.trim())
        setStage('waiting')
      } else {
        const answers: AiQualificationAnswers = {
          businessType: values.businessType, workflows: values.workflows, workflowDetails: values.workflowDetails,
          currentTools: values.currentTools, weeklyHours: values.weeklyHours, impacts: values.impacts,
          role: values.role, approverAvailability: values.approverAvailability, revenue: values.revenue,
          aiExperience: values.aiExperience, aiBarriers: values.aiBarriers, budget: values.budget, timing: values.timing,
        } as AiQualificationAnswers
        await bookingRequest(attemptId, { action: 'send-code', attemptId, email: email.trim(), answers, company })
        setStage('code'); setCode(''); setNotice(`A verification code was sent to ${email.trim()}.`)
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Please try again.') }
    finally { setBusy(false) }
  }

  return <section className="qf-booking-verification" aria-labelledby="qf-booking-email-title">
    <h2 id="qf-booking-email-title">First, verify your booking email.</h2>
    <p>Then choose a time in Google Calendar. We will save your quiz answers with your consultation and open the video once your appointment is confirmed.</p>
    {stage === 'loading' ? <p role="status">Checking booking access…</p> : !configured ? <div className="qf-booking-unavailable">
      <p>Online booking is temporarily unavailable. Please try again shortly or use the phone call option above.</p>
      <button className="qf-text-link" type="button" disabled={busy} onClick={() => void retry()}>Check again</button>
    </div> : stage === 'confirmed' ? <div className="qf-booking-waiting" role="status">
      <p><strong>Your appointment is confirmed.</strong> Google has your booking. Your walkthrough is ready to open.</p>
      <button className="ao-button" type="button" onClick={onConfirmed}>Open my walkthrough</button>
    </div> : stage === 'waiting' ? <div className="qf-booking-waiting" role="status">
      <p><strong>{email.trim() || 'Your email'} is verified.</strong> Book below using that email. We will open the video as soon as Google Calendar confirms your appointment.</p>
      <button className="qf-text-link" type="button" disabled={busy} onClick={() => void retry()}>Check my booking now</button>
    </div> : <form onSubmit={event => void submit(event)} className="ao-form qf-booking-email-form" aria-busy={busy}>
      <div className="ao-field"><label htmlFor="booking-identity">{stage === 'code' ? 'Verification code' : 'Email address'}</label>
        {stage === 'code' ? <input id="booking-identity" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
          : <input id="booking-identity" required type="email" autoComplete="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} />}
      </div>
      <div className="visually-hidden" aria-hidden="true"><label htmlFor="booking-company">Leave this field empty</label><input id="booking-company" tabIndex={-1} autoComplete="off" value={company} onChange={event => setCompany(event.target.value)} /></div>
      <button className="ao-button" disabled={busy} type="submit">{busy ? 'Please wait…' : stage === 'code' ? 'Verify email' : 'Send verification code'}</button>
      {stage === 'code' && <button className="qf-text-link" type="button" disabled={busy} onClick={() => { setStage('unverified'); setNotice(''); setError('') }}>Change email or request a new code</button>}
    </form>}
    {notice && <p role="status">{notice}</p>}
    {error && <p className="ao-form__notice" role="alert">{error}</p>}
  </section>
}
