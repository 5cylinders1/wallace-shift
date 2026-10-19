import { useEffect, useRef, useState, type FormEvent } from 'react'
import './demo-access.css'
import './demo-admin.css'

const demos = [
  { id: 'roofers', href: '/northvane', name: 'Northvane Roofing', detail: 'Website concept 01' },
  { id: 'roofers-2', href: '/alder-stone', name: 'Alder & Stone', detail: 'Website concept 02' },
  { id: 'roofers-3', href: '/contour', name: 'Contour Roofing', detail: 'Website concept 03' },
  { id: 'roofers-4', href: '/halcyon', name: 'Halcyon Roofworks', detail: 'Website concept 04' },
  { id: 'roofers-5', href: '/velar', name: 'Velar Roof Atelier', detail: 'Website concept 05' },
  { id: 'roofers-6', href: '/stratum', name: 'Stratum Roofing Co.', detail: 'Website concept 06' },
  { id: 'roofers-dashboard', href: '/roofing-dashboard', name: 'Roofing Dashboard', detail: 'Interactive operations concept' },
] as const

type Phase = 'checking' | 'sign-in' | 'code' | 'authenticated' | 'unavailable'
type Action = 'send-code' | 'verify-code' | 'logout'
type ApiResult = { ok?: boolean; authenticated?: boolean; pending?: boolean; retryAfter?: number; error?: string }

function Arrow() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" /></svg>
}

function errorMessage(error?: string): string {
  switch (error) {
    case 'not_configured': return 'Admin sign-in needs to be configured before it can be used. Please check the server’s admin email and access settings.'
    case 'code_invalid': return 'That code didn’t match. Check the latest email and try again.'
    case 'code_expired': return 'That code has expired. Send a new code to sign in.'
    case 'verification_required': return 'Please send a new code from this browser, then enter it here.'
    case 'rate_limited': return 'Too many attempts. Please wait before trying again.'
    case 'forbidden': return 'This request couldn’t be verified. Reload this page and try again.'
    case 'invalid': return 'Please enter the six-digit code from your email.'
    default: return 'Admin access is temporarily unavailable. Please try again.'
  }
}

export function AdminDemoAccess() {
  const [phase, setPhase] = useState<Phase>('checking')
  const [busy, setBusy] = useState<Action | null>(null)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const busyRef = useRef(false)
  const codeInput = useRef<HTMLInputElement>(null)
  const cardHeading = useRef<HTMLHeadingElement>(null)
  const requestedDemo = new URLSearchParams(window.location.search).get('demo')
  const selectedDemo = demos.find(demo => demo.id === requestedDemo || demo.href.slice(1) === requestedDemo)

  useEffect(() => {
    const controller = new AbortController()
    void fetch('/api/demo-admin', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const result = await response.json() as ApiResult
        if (!response.ok || result.ok !== true) throw new Error(result.error || 'unavailable')
        if (!controller.signal.aborted) {
          setPhase(result.authenticated === true ? 'authenticated' : result.pending === true ? 'code' : 'sign-in')
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setPhase('unavailable')
        setIsError(true)
        setMessage(errorMessage(error instanceof Error ? error.message : 'unavailable'))
      })
    return () => controller.abort()
  }, [])

  const cooldownActive = cooldown > 0
  useEffect(() => {
    if (!cooldownActive) return
    const interval = window.setInterval(() => setCooldown(seconds => Math.max(0, seconds - 1)), 1000)
    return () => window.clearInterval(interval)
  }, [cooldownActive])

  useEffect(() => {
    if (phase === 'code') codeInput.current?.focus()
    else if (phase !== 'checking') cardHeading.current?.focus()
  }, [phase])

  async function performAction(action: Action) {
    if (busyRef.current || (action === 'send-code' && cooldown > 0)) return
    busyRef.current = true
    setBusy(action)
    setMessage('')
    setIsError(false)
    try {
      const response = await fetch('/api/demo-admin', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'verify-code' ? { action, code } : { action }),
      })
      const result = await response.json() as ApiResult
      if (typeof result.retryAfter === 'number' && Number.isFinite(result.retryAfter)) {
        setCooldown(Math.max(1, Math.min(3600, Math.ceil(result.retryAfter))))
      }
      if (!response.ok || result.ok !== true) {
        setIsError(true)
        setMessage(errorMessage(result.error))
        if (result.error === 'verification_required') setPhase('sign-in')
        if (result.error === 'rate_limited' && result.pending === true) setPhase('code')
        if (result.error === 'code_invalid') codeInput.current?.select()
        return
      }
      if (action === 'send-code') {
        setPhase('code')
        setCode('')
        setCooldown(typeof result.retryAfter === 'number' && Number.isFinite(result.retryAfter) ? Math.max(1, Math.min(3600, Math.ceil(result.retryAfter))) : 60)
        setMessage('A sign-in code was sent to your configured admin inbox. Use the latest email.')
        requestAnimationFrame(() => codeInput.current?.focus())
      } else if (action === 'verify-code') {
        if (result.authenticated !== true) throw new Error('unavailable')
        setPhase('authenticated')
        setCode('')
        setMessage('You’re signed in. All six demos are ready to open.')
      } else {
        setPhase('sign-in')
        setCode('')
        setMessage('You’ve signed out of admin demo access on this browser.')
      }
    } catch {
      setIsError(true)
      setMessage(action === 'logout' ? 'We couldn’t confirm sign-out. Please try again before leaving this browser.' : errorMessage())
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }

  function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!/^\d{6}$/.test(code)) {
      setIsError(true)
      setMessage('Please enter the six-digit code from your email.')
      codeInput.current?.focus()
      return
    }
    void performAction('verify-code')
  }

  return (
    <div className="demo-access demo-admin">
      <a className="demo-access__skip" href="#admin-access">Skip to admin access</a>
      <header className="demo-access__header">
        <a className="demo-access__brand" href="https://www.wallaceshift.com/" aria-label="Wallace Shift home">
          <img src="/brand/wallace-shift-logo-white.svg" alt="" width="66" height="40" />
          <span>WALLACE SHIFT<span>Design. Technology. Momentum.</span></span>
        </a>
        <a className="demo-access__back" href="/demos/roofers-offer/">View the collection <Arrow /></a>
      </header>

      <main className="demo-access__main">
        <section className="demo-access__intro" aria-labelledby="admin-heading">
          <p className="demo-access__eyebrow"><span />Owner access</p>
          <h1 id="admin-heading">Your demos.<br /><em>On demand.</em></h1>
          <p className="demo-access__description">Sign in with a code sent to your admin inbox, then open any demo in the collection.</p>
          <div className="demo-access__concept">
            <div className="demo-access__concept-mark" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><rect x="12" y="21" width="24" height="19" rx="3" stroke="currentColor" strokeWidth="1.2" /><path d="M17 21v-7a7 7 0 0 1 14 0v7M24 28v5" stroke="currentColor" strokeWidth="1.2" /></svg></div>
            <div><p className="demo-access__small-label">The Wallace Shift collection</p><h2>One sign-in. Every demo.</h2><p className="demo-access__concept-detail">Five websites & one roofing dashboard</p></div>
          </div>
          <p className="demo-access__access-note">Admin access lasts up to 30 days on this browser. Sign out when you’re finished on a shared device.</p>
        </section>

        <section className="demo-access__card demo-admin__card" id="admin-access" aria-labelledby="admin-card-heading" aria-busy={phase === 'checking' || busy !== null}>
          <div className="demo-access__card-heading">
            <span className="demo-access__card-index">STUDIO ADMIN</span>
            <h2 id="admin-card-heading" ref={cardHeading} tabIndex={-1}>{phase === 'authenticated' ? 'Your demo collection' : phase === 'code' ? 'Check your inbox' : 'Admin sign in'}</h2>
            <p>{phase === 'authenticated' ? 'Your access is active. Choose a demo to explore.' : phase === 'code' ? 'Enter the six-digit code from your latest admin sign-in email.' : 'A one-time email code gives you access to all six demos.'}</p>
          </div>

          {phase === 'checking' && <p className="demo-admin__checking" role="status">Checking your access…</p>}
          {phase === 'unavailable' && <button className="demo-access__submit demo-admin__primary" type="button" onClick={() => window.location.reload()}>Try again <Arrow /></button>}
          {phase === 'sign-in' && <button className="demo-access__submit demo-admin__primary" type="button" disabled={busy !== null || cooldownActive} onClick={() => void performAction('send-code')}><span>{busy === 'send-code' ? 'Sending your code…' : cooldownActive ? `Send a code in ${cooldown}s` : 'Email me a sign-in code'}</span><Arrow /></button>}

          {phase === 'code' && (
            <form className="demo-access__form" onSubmit={verifyCode}>
              <fieldset disabled={busy !== null}>
                <legend className="demo-access__visually-hidden">Verify your admin sign-in code</legend>
                <div className="demo-access__field">
                  <label htmlFor="admin-code">Sign-in code</label>
                  <input ref={codeInput} id="admin-code" name="code" className="demo-admin__code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" aria-describedby="admin-code-note admin-status" />
                </div>
                <button className="demo-access__submit" type="submit" disabled={busy !== null}><span>{busy === 'verify-code' ? 'Verifying your code…' : 'Unlock the collection'}</span><Arrow /></button>
              </fieldset>
              <p className="demo-access__form-note" id="admin-code-note">Keep this page open while you check your inbox.</p>
              <button className="demo-admin__text-button" type="button" disabled={busy !== null || cooldownActive} onClick={() => void performAction('send-code')}>{busy === 'send-code' ? 'Sending a new code…' : cooldownActive ? `Resend code in ${cooldown}s` : 'Send a new code'}</button>
            </form>
          )}

          {phase === 'authenticated' && (
            <>
              {selectedDemo && <a className="demo-access__submit demo-admin__primary" href={selectedDemo.href}><span>Open {selectedDemo.name}</span><Arrow /></a>}
              <nav className="demo-admin__collection" aria-label="Admin demo collection">
                {demos.map((demo, index) => <a key={demo.id} href={demo.href} className="demo-admin__demo"><span className="demo-admin__number">0{index + 1}</span><span><strong>{demo.name}</strong><small>{demo.detail}</small></span><Arrow /></a>)}
              </nav>
              <div className="demo-admin__session"><p>Signed in on this browser.</p><button className="demo-admin__text-button" type="button" disabled={busy !== null} onClick={() => void performAction('logout')}>{busy === 'logout' ? 'Signing out…' : 'Sign out'}</button></div>
            </>
          )}

          <div id="admin-status" className={`demo-access__status demo-admin__status${isError ? ' demo-admin__status--error' : ''}`} role="status" aria-live="polite" aria-atomic="true">{message && <p>{message}</p>}</div>
        </section>
      </main>
      <footer className="demo-access__footer"><p>© {new Date().getFullYear()} Wallace Shift</p><a href="/request-demo/">Request visitor access</a></footer>
    </div>
  )
}
