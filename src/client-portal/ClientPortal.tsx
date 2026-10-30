import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { SIGNATURE_CONSENT, cadenceLabel, money, paymentConsent, type Engagement, type Invoice, type OfflineMethod } from './model'
import './client-portal.css'
import { useRouteMeta } from '../hooks/useDocumentMeta'

type ClientEngagement = Engagement & { hasCard?: boolean }
type Session = { authenticated: boolean; admin?: boolean; email?: string; engagements?: ClientEngagement[]; stripeReady?: boolean; publishableKey?: string; instructions?: Record<OfflineMethod, string> }
type Quote = { bps: number; fee: number; total: number; card: string }
type Result = { ok: boolean; error?: string; id?: string; url?: string; quote?: Quote; clientSecret?: string; status?: string; scheduled?: boolean; failed?: string[] } & Partial<Session>
const errorMessages: Record<string, string> = {
  not_configured: 'The portal is not connected yet. Please contact Wallace Shift.', portal_not_configured: 'The portal is not connected yet. Please contact Wallace Shift.',
  email_not_configured: 'Email sign in is not configured for this site yet. Please contact Wallace Shift.',
  email_unavailable: 'We could not send your sign in code. Please wait a minute and try again.',
  unavailable: 'Sign in storage is temporarily unavailable. Please try again shortly.',
  storage_unavailable: 'Your portal records are temporarily unavailable. Please try again shortly.',
  temporarily_unavailable: 'The portal is temporarily unavailable. Please try again shortly.',
  raw_body_required: 'The server could not read this request. Please contact Wallace Shift.',
  access_required: 'Your session has ended. Sign in again to continue.', code_invalid: 'That code is incorrect. Check your email and try again.', code_expired: 'Your code expired. Request a new code.',
  rate_limited: 'Please wait before requesting another code. Too many attempts may require waiting an hour.',
  stripe_not_configured: 'Card payments are not available yet. Please contact Wallace Shift.', agreement_changed: 'The agreement changed. Refresh and review the latest copy before signing.',
  quote_changed: 'The payment total changed. Review the amount again before authorizing.', payment_needs_reconciliation: 'This payment needs review by Wallace Shift before another attempt. Please contact us.',
  payment_in_progress: 'A payment is in progress. Refresh its status before changing payment methods.', completion_blocked: 'A signed agreement and settled or voided invoices are required before completion.',
  invoice_not_open: 'This invoice is no longer open. Refresh to see its current status.', conflict_retry: 'Another update was saved. Refresh and try again.',
  invalid_date: 'Use a valid first due date of today or later, and an end date on or after it.',
}
async function request(body?: Record<string, unknown>): Promise<Result> {
  const response = await fetch('/api/client-portal', { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
  const data = await response.json() as Result
  if (!response.ok || !data.ok) throw new Error(errorMessages[data.error ?? ''] ?? 'We could not save that change. Please try again or contact Wallace Shift.')
  return data
}
function download(e: Engagement, invoice?: Invoice): void {
  const text = invoice ? `WALLACE SHIFT LLC\n${invoice.status === 'paid' ? 'PAYMENT RECEIPT' : 'INVOICE'}\n\nInvoice: ${invoice.id}\nClient: ${e.client}\nProject: ${e.title}\nDue: ${invoice.due}\nServices: ${money(invoice.amount)}\nCredit card surcharge: ${money(invoice.fee)}\nTotal: ${money(invoice.amount + invoice.fee)}\nStatus: ${invoice.status}\n${invoice.paidAt ? `Paid: ${invoice.paidAt}\nMethod: ${invoice.method}\n` : ''}\nScope:\n${e.scope}`
    : `${e.agreement}\n\n${e.signature ? `SIGNATURE RECEIPT\nName: ${e.signature.name}\nVerified email: ${e.signature.email}\nSigned at: ${e.signature.at}\nAgreement SHA-256: ${e.signature.hash}\nConsent: ${e.signature.consent}` : 'UNSIGNED COPY'}`
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${invoice ? invoice.id : `${e.id}-agreement`}.txt`; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
let stripePromise: Promise<void> | undefined
async function authenticatePayment(key: string, clientSecret: string): Promise<void> {
  type StripeWindow = Window & { Stripe?: (key: string) => { handleNextAction: (options: { clientSecret: string }) => Promise<{ error?: { message?: string } }> } }
  const stripeWindow = window as StripeWindow
  if (!stripeWindow.Stripe) {
    stripePromise ??= new Promise<void>((resolve, reject) => {
      const script = document.createElement('script'); script.src = 'https://js.stripe.com/v3/'; script.async = true
      script.onload = () => resolve(); script.onerror = () => { stripePromise = undefined; reject(new Error('Stripe could not load. Check your connection and try again.')) }; document.head.append(script)
    })
    await stripePromise
  }
  if (!stripeWindow.Stripe || !key) throw new Error('Payment verification is unavailable. Please contact Wallace Shift.')
  const result = await stripeWindow.Stripe(key).handleNextAction({ clientSecret })
  if (result.error) throw new Error(result.error.message ?? 'Your bank could not verify this payment. Please try again.')
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="cp-field"><span>{label}</span>{children}</label> }
function Status({ children }: { children: ReactNode }) { return <span className="cp-status">{children}</span> }

export function ClientPortal() {
  useRouteMeta('/client-portal')
  const [session, setSession] = useState<Session | null>(null)
  const [selected, setSelected] = useState(new URLSearchParams(location.search).get('engagement') ?? '')
  const [tab, setTab] = useState<'invoices' | 'agreement' | 'activity'>('invoices')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [creating, setCreating] = useState(false)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [canceling, setCanceling] = useState(false)
  const entries = session?.engagements ?? []
  const e = entries.find(v => v.id === selected) ?? entries[0]
  async function refresh() { const data = await request(); setSession(data as Session) }
  useEffect(() => { let alive = true; request().then(data => { if (alive) setSession(data as Session) }).catch(reason => { if (alive) { setError(true); setMessage(reason.message); setSession({ authenticated: false }) } }); return () => { alive = false } }, [])
  async function perform(body: Record<string, unknown>, success = 'Saved.'): Promise<Result | undefined> {
    setBusy(true); setError(false); setMessage('')
    try {
      const result = await request(body)
      if (result.url) { window.location.assign(result.url); return result }
      if (result.clientSecret) { await authenticatePayment(session?.publishableKey ?? '', result.clientSecret); await request({ action: 'refresh', id: body.id }) }
      if (result.quote) setQuote(result.quote)
      if (body.action === 'create' && result.id) { setSelected(result.id); setCreating(false); setTab('agreement') }
      if (body.action === 'finish-setup') { history.replaceState(null, '', `/client-portal?engagement=${body.id}`); setQuote(null) }
      if (body.action === 'logout') { setQuote(null); setCodeSent(false) }
      await refresh()
      setMessage(result.failed?.length ? 'Some payments need review. Check invoice activity before trying again.' : result.status === 'requires_payment_method' ? 'Your card was declined. Reset this attempt and update your card.' : result.status === 'processing' ? 'Your bank is processing this payment. We will update its status after confirmation.' : success)
      if (result.status === 'requires_payment_method') setError(true)
      return result
    } catch (reason) { setError(true); setMessage(reason instanceof Error ? reason.message : 'Please try again.'); return undefined }
    finally { setBusy(false) }
  }
  function choose(id: string) { setSelected(id); setCreating(false); setQuote(null); setCanceling(false); setMessage(''); setTab('invoices') }
  const setup = new URLSearchParams(location.search).get('setup')
  return <div className="client-portal">
    <header className="cp-header"><a className="cp-brand" href="/"><img src="/brand/wallace-shift-logo-white.svg" width="32" height="22" alt="" /><span>WALLACE SHIFT</span></a><span className="cp-header-label">Client portal</span>{session?.authenticated && <button className="cp-text-button" disabled={busy} onClick={() => void perform({ action: 'logout' }, 'Signed out.')}>Sign out</button>}</header>
    <div className={`cp-notice ${error ? 'cp-notice-error' : ''}`} role={error ? 'alert' : 'status'} aria-live="polite">{message}</div>
    {!session ? <main className="cp-login"><h1>Opening your workspace…</h1></main> : !session.authenticated ? <main className="cp-login">
      <section><h1>Your work.<br />All in one place.</h1><p>Review your agreement, manage payments, and keep a record of every invoice.</p><div className="cp-login-note"><strong>A clear next step, every time.</strong><p>Sign your agreement first. Then choose how to pay a one-time invoice, or authorize automatic payments for recurring service.</p></div></section>
      <form className="cp-login-form" onSubmit={async event => { event.preventDefault(); const form = new FormData(event.currentTarget); const result = await perform({ action: codeSent ? 'verify-code' : 'send-code', email: form.get('email'), code: form.get('code') }, codeSent ? 'You are signed in.' : 'If this email has portal access, a code is on its way.'); if (result && !codeSent) setCodeSent(true) }}>
        <h2>{codeSent ? 'Check your email' : 'Welcome back'}</h2><p>{codeSent ? 'Enter the six digit code. It expires in 10 minutes.' : 'Use the email address associated with your project.'}</p>
        <Field label="Email address"><input name="email" type="email" required autoComplete="email" readOnly={codeSent} maxLength={254} /></Field>
        {codeSent && <Field label="Sign in code"><input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus /></Field>}
        <button className="cp-primary" disabled={busy}>{busy ? 'Please wait…' : codeSent ? 'Sign in' : 'Email me a sign in code'}</button>
        {codeSent && <button type="button" className="cp-text-button" disabled={busy} onClick={() => setCodeSent(false)}>Use another email or request a new code</button>}
        <small>No password to remember. Only your verified email can open your client records.</small>
      </form>
    </main> : <div className="cp-workspace">
      <aside className="cp-sidebar"><h2>{session.admin ? 'Client workspace' : 'Your projects'}</h2><p className="cp-account">{session.email}</p>
        <nav aria-label="Projects">{entries.map(item => <button key={item.id} className={!creating && e?.id === item.id ? 'is-current' : ''} onClick={() => choose(item.id)}><strong>{session.admin ? item.client : item.title}</strong><span>{session.admin ? item.title : cadenceLabel[item.cadence]}</span><small>{item.state === 'issued' ? item.signature ? 'Agreement signed' : 'Signature needed' : item.state}</small></button>)}</nav>
        {session.admin && <><button className="cp-primary" onClick={() => { setCreating(true); setMessage('') }}>New agreement</button><button className="cp-text-button" disabled={busy} onClick={() => void perform({ action: 'run-billing' }, 'Due automatic payments checked. Review invoice status for results.')}>Run due billing</button></>}
        <a className="cp-support" href="/contact">Contact Wallace Shift</a>
      </aside>
      <main className="cp-main" aria-busy={busy}>
        {creating && session.admin ? <CreateAgreement busy={busy} onSubmit={body => perform(body)} /> : !e ? <section className="cp-empty"><h1>{session.admin ? 'Ready for your first client.' : 'Your workspace is ready.'}</h1><p>{session.admin ? 'Create a scope and billing schedule, review the agreement, then issue it to your client.' : 'Your agreements and invoices will appear here when Wallace Shift issues them.'}</p>{session.admin && <button className="cp-primary" onClick={() => setCreating(true)}>Create an agreement</button>}</section> : <>
          <div className="cp-project-heading"><div><h1>{e.title}</h1><p>{e.client} <span aria-hidden="true">/</span> {cadenceLabel[e.cadence]}</p></div><Status>{e.state === 'issued' ? 'Active engagement' : e.state}</Status></div>
          <div className="cp-summary"><div><span>Service amount</span><strong>{money(e.amount)}</strong><small>{cadenceLabel[e.cadence]}</small></div><div><span>Agreement</span><strong>{e.signature ? 'Signed' : 'Awaiting signature'}</strong><small>{e.signature ? e.signature.name : 'Required before payment'}</small></div><div><span>{e.cadence === 'once' ? 'Due date' : 'Automatic payments'}</span><strong>{e.cadence === 'once' ? e.firstDue : e.autopay?.enabled ? 'Authorized' : 'Not authorized'}</strong><small>{e.cadence === 'once' ? 'Cash, check, Zelle, or Stripe' : `First due ${e.firstDue}`}</small></div></div>
          <nav className="cp-tabs" aria-label="Project details">{(['invoices', 'agreement', 'activity'] as const).map(item => <button key={item} aria-current={tab === item ? 'page' : undefined} onClick={() => setTab(item)}>{item === 'agreement' ? 'Agreement & signature' : item === 'activity' ? 'Activity' : 'Invoices & payments'}</button>)}</nav>
          {tab === 'agreement' && <section className="cp-agreement"><div className="cp-section-heading"><h2>Service agreement</h2><button className="cp-text-button" onClick={() => download(e)}>Download {e.signature ? 'signed copy' : 'agreement'}</button></div>{e.state === 'draft' && <p className="cp-callout">Draft for review. Check the scope, dates, and tax treatment before issuing. Issued terms are locked; create a replacement agreement for changes.</p>}
            <pre className="cp-document">{e.agreement}</pre>
            {e.signature ? <div className="cp-signature"><strong>Signed by {e.signature.name}</strong><p>{e.signature.email} · {new Date(e.signature.at).toLocaleString()}</p><small>Agreement fingerprint: {e.signature.hash}</small></div> : !session.admin && e.state === 'issued' ? <form className="cp-sign-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void perform({ action: 'sign', id: e.id, name: form.get('name'), consent: form.get('consent') === 'on', agreementHash: e.agreementHash }, 'Agreement signed. Your signed copy is available to download.') }}>
              <h3>Sign your agreement</h3><Field label="Full legal name"><input name="name" required maxLength={160} autoComplete="name" /></Field><label className="cp-check"><input name="consent" type="checkbox" required /><span>{SIGNATURE_CONSENT}</span></label><button className="cp-primary" disabled={busy}>Sign agreement</button>
            </form> : null}
            {session.admin && e.state === 'draft' && <button className="cp-primary" disabled={busy} onClick={() => void perform({ action: 'issue', id: e.id }, 'Agreement issued. Share the portal address with your client; they sign in using their email.')}>Issue agreement & first invoice</button>}
          </section>}
          {tab === 'invoices' && <section>
            <div className="cp-section-heading"><h2>Invoices</h2><button className="cp-text-button" disabled={busy} onClick={() => void perform({ action: 'refresh', id: e.id }, 'Payment status refreshed.')}>Refresh status</button></div>
            {!e.signature && <div className="cp-callout"><p>{session.admin ? 'Your client must sign before any payment can be recorded or charged.' : 'Review and sign your agreement to unlock payments.'}</p><button className="cp-text-button" onClick={() => setTab('agreement')}>Review agreement</button></div>}
            {!e.invoices.length && <p className="cp-empty-line">The first invoice will be created when you issue the agreement.</p>}
            {e.invoices.map(invoice => <InvoicePanel key={invoice.id} e={e} invoice={invoice} session={session} busy={busy} quote={quote} setup={setup} perform={perform} />)}
            {!session.admin && e.signature && e.cadence !== 'once' && e.state === 'issued' && e.nextDue && (!e.endDate || e.nextDue <= e.endDate) && e.invoices.every(i => i.status === 'paid' || i.status === 'void') && <section className="cp-payment"><h3>Upcoming automatic payments</h3><p>Next invoice: {e.nextDue}. {money(e.amount)} for services, plus any eligible fee you authorize.</p>{setup ? <button className="cp-primary" disabled={busy} onClick={() => void perform({ action: 'finish-setup', id: e.id, sessionId: setup }, 'Card updated. Review and authorize your future payments to continue automatic billing.')}>Continue with updated card</button> : <><button className="cp-secondary" disabled={busy || !session.stripeReady} onClick={() => void perform({ action: 'setup-card', id: e.id })}>Update payment card</button><button className="cp-text-button" disabled={busy || !e.hasCard} onClick={() => void perform({ action: 'quote', id: e.id }, 'Review the total for future automatic payments.')}>Review future payment authorization</button></>}{quote && !setup && <form key={`${quote.card}-${quote.total}`} onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void perform({ action: 'authorize', id: e.id, total: quote.total, consent: form.get('consent') === 'on' }, 'Future automatic payments authorized.') }}><p>{quote.card} · Services {money(e.amount)} + fee {money(quote.fee)} = {money(quote.total)} each billing period.</p><label className="cp-check"><input name="consent" type="checkbox" required /><span>{paymentConsent(e.amount, quote.fee, e.cadence, true)}</span></label><button className="cp-primary" disabled={busy}>Authorize future payments</button></form>}</section>}
            {session.admin && e.state !== 'draft' && <div className="cp-admin-actions"><p>Client sign in: <a href="/client-portal">{location.origin}/client-portal</a><br />Access is restricted to {e.email}.</p><button className="cp-secondary" disabled={busy || !e.signature || e.state !== 'issued'} onClick={() => void perform({ action: 'complete', id: e.id }, 'Engagement completed. Future billing has stopped.')}>Mark engagement complete</button></div>}
          </section>}
          {tab === 'activity' && <section><h2>Activity record</h2><ol className="cp-activity">{[...e.audit].reverse().map((item, index) => <li key={`${item.at}-${index}`}><div><strong>{item.action}</strong><span>{item.actor}</span></div><time dateTime={item.at}>{new Date(item.at).toLocaleString()}</time></li>)}</ol></section>}
          {e.state !== 'canceled' && e.state !== 'complete' && <div className="cp-cancel">{canceling ? <><p>Cancel future service and billing? Existing balances remain due and an in-flight payment may still complete.</p><button className="cp-secondary" disabled={busy} onClick={async () => { if (await perform({ action: 'cancel', id: e.id }, 'Future service and billing canceled.')) setCanceling(false) }}>Confirm cancellation</button><button className="cp-text-button" onClick={() => setCanceling(false)}>Keep service</button></> : <button className="cp-text-button" onClick={() => setCanceling(true)}>Cancel future service</button>}</div>}
        </>}
      </main>
    </div>}
    <footer className="cp-footer"><span>Wallace Shift LLC</span><a href="/privacy">Privacy</a></footer>
  </div>
}

function CreateAgreement({ busy, onSubmit }: { busy: boolean; onSubmit: (body: Record<string, unknown>) => Promise<unknown> }) {
  const [cadence, setCadence] = useState('once')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    void onSubmit({ ...values, action: 'create', amount: Math.round(Number(values.amount) * 100) })
  }
  return <section><h1>Start with a clear agreement.</h1><p className="cp-intro">Define the work and payment schedule. You’ll review the full contract before your client sees it.</p><form className="cp-create-form" onSubmit={submit}>
    <div className="cp-form-grid"><Field label="Client or legal business name"><input name="client" required maxLength={200} /></Field><Field label="Client email"><input name="email" type="email" required autoComplete="email" /></Field></div>
    <Field label="Project or service name"><input name="title" required maxLength={200} placeholder="Website build, CRM setup, or ongoing support" /></Field>
    <Field label="Scope of work"><textarea name="scope" required rows={5} maxLength={10000} placeholder="List the deliverables, included services, and any included taxes." /></Field>
    <Field label="Exclusions and third party costs"><textarea name="exclusions" required rows={3} maxLength={5000} placeholder="Specify what is not included and who pays hosting, software, and other costs." /></Field>
    <Field label="Delivery, milestones, and acceptance criteria"><textarea name="delivery" required rows={3} maxLength={5000} placeholder="Define what completion means, expected timing, and client responsibilities." /></Field>
    <div className="cp-form-grid"><Field label="Full invoice amount (USD)"><input name="amount" type="number" min="0.50" max="1000000" step="0.01" required placeholder="0.00" /></Field><Field label="Billing schedule"><select name="cadence" value={cadence} onChange={event => setCadence(event.target.value)}>{Object.entries(cadenceLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="First invoice due"><input name="firstDue" type="date" min={new Date().toISOString().slice(0, 10)} required /></Field>{cadence !== 'once' && <Field label="Last billing date (optional)"><input name="endDate" type="date" /></Field>}</div>
    <p className="cp-callout">{cadence === 'once' ? 'One-time invoices allow Stripe, cash, check, or Zelle.' : 'Recurring plans require separate authorization for automatic Stripe payments. Each billing period gets its own invoice.'} The service agreement uses Kansas law. The credit card fee, if eligible, is added separately at payment.</p>
    <button className="cp-primary" disabled={busy}>{busy ? 'Saving…' : 'Create draft & review agreement'}</button>
  </form></section>
}

function InvoicePanel({ e, invoice, session, busy, quote, setup, perform }: { e: ClientEngagement; invoice: Invoice; session: Session; busy: boolean; quote: Quote | null; setup: string | null; perform: (body: Record<string, unknown>, success?: string) => Promise<Result | undefined> }) {
  const [method, setMethod] = useState<OfflineMethod>('zelle')
  const [offline, setOffline] = useState(false)
  const [consent, setConsent] = useState(false)
  const [voiding, setVoiding] = useState(false)
  const payable = Boolean(e.signature && ['issued', 'canceled'].includes(e.state))
  const automatic = e.cadence !== 'once' && e.state === 'issued'
  const overdue = invoice.status === 'open' && invoice.due < new Date().toISOString().slice(0, 10)
  const instructions = session.instructions?.[method]
  return <article className="cp-invoice"><div className="cp-invoice-top"><div><h3>{money(invoice.amount + invoice.fee)}</h3><p>Due {invoice.due} <span aria-hidden="true">·</span> {invoice.id.slice(0, 8).toUpperCase()}</p></div><Status>{invoice.reportedAt && invoice.status === 'open' ? 'Awaiting receipt confirmation' : overdue ? 'Overdue' : invoice.status === 'processing' ? 'Payment needs confirmation' : invoice.status}</Status></div>
    <div className="cp-invoice-breakdown"><span>{e.title}</span><strong>{money(invoice.amount)}</strong>{invoice.fee > 0 && <><span>Credit card surcharge</span><strong>{money(invoice.fee)}</strong></>}</div>
    <div className="cp-invoice-links"><button className="cp-text-button" onClick={() => download(e, invoice)}>Download {invoice.status === 'paid' ? 'receipt' : 'invoice'}</button>{invoice.paidAt && <span>Paid {new Date(invoice.paidAt).toLocaleDateString()} by {invoice.method}</span>}</div>
    {Boolean(invoice.refunded) && <p className="cp-callout">Refunded: {money(invoice.refunded!)}. The original payment remains in your transaction history.</p>}{invoice.disputed && <p className="cp-callout">This payment has a dispute. Contact Wallace Shift to review its status.</p>}
    {invoice.status === 'open' && !session.admin && payable && <div className="cp-payment">
      <p>{e.state === 'canceled' ? 'You can settle this outstanding invoice. Future service and automatic billing remain canceled.' : e.cadence === 'once' ? 'Choose how to pay this invoice.' : `Automatic ${cadenceLabel[e.cadence].toLowerCase()} payments are required for this plan. First due ${e.firstDue}${e.endDate ? `; last billing date ${e.endDate}` : '; continues until canceled'}.`}</p>
      <p className="cp-fee-note">Eligible credit card payments may include a 3% fee, subject to the applicable limit. Debit and prepaid cards have no surcharge. Review the exact total before authorizing.</p>
      {!session.stripeReady ? <p className="cp-callout">Stripe payments are not connected yet. Please contact Wallace Shift.</p> : setup ? <button className="cp-primary" disabled={busy} onClick={() => void perform({ action: 'finish-setup', id: e.id, sessionId: setup }, 'Card saved. Review your payment total next.')}>Continue with saved card</button> : e.hasCard ? <>
        {quote ? <form onSubmit={event => { event.preventDefault(); void perform({ action: 'pay', id: e.id, invoiceId: invoice.id, consent, total: quote.total }, e.cadence === 'once' ? 'Payment submitted. Check invoice status for confirmation.' : 'Automatic payments authorized. Each payment will appear in your invoice history.') }}>
          <div className="cp-quote"><span>{quote.card}</span><div><span>Services</span><strong>{money(e.amount)}</strong></div><div><span>Credit card fee ({quote.bps / 100}%)</span><strong>{money(quote.fee)}</strong></div><div className="cp-total"><span>{e.cadence === 'once' ? 'Total' : 'Total each billing period'}</span><strong>{money(quote.total)}</strong></div></div>
          <label className="cp-check"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} required /><span>{paymentConsent(e.amount, quote.fee, e.cadence, automatic)}</span></label>
          <button className="cp-primary" disabled={busy || !consent}>{!automatic ? `Pay ${money(quote.total)}` : `Authorize ${money(quote.total)} ${cadenceLabel[e.cadence].toLowerCase()}`}</button>
        </form> : <button className="cp-primary" disabled={busy} onClick={() => void perform({ action: 'quote', id: e.id }, 'Review the exact total and payment authorization below.')}>Review payment total</button>}
        <button className="cp-text-button" disabled={busy} onClick={() => void perform({ action: 'setup-card', id: e.id })}>Use a different card</button>
      </> : <button className="cp-primary" disabled={busy} onClick={() => void perform({ action: 'setup-card', id: e.id })}>Continue to Stripe</button>}
      {e.cadence === 'once' && <><button className="cp-text-button" onClick={() => setOffline(!offline)}>{offline ? 'Hide offline payment options' : 'Pay by cash, check, or Zelle with no fee'}</button>{offline && <form className="cp-offline" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void perform({ action: 'report-payment', id: e.id, invoiceId: invoice.id, method, reference: form.get('reference') }, 'Payment reported. Your invoice stays open until Wallace Shift confirms receipt.') }}><Field label="Payment method"><select value={method} onChange={event => setMethod(event.target.value as OfflineMethod)}><option value="zelle">Zelle</option><option value="check">Check</option><option value="cash">Cash</option></select></Field><p>{instructions || 'Contact Wallace Shift for verified payment instructions before sending payment.'}</p><Field label="Payment reference or delivery details"><input name="reference" required maxLength={300} placeholder="Date sent and transaction or check reference" /></Field><button className="cp-secondary" disabled={busy || !instructions}>Report payment sent</button><small>This does not mark the invoice as paid.</small></form>}</>}
    </div>}
    {invoice.status === 'processing' && !session.admin && <div className="cp-payment"><p>Check payment status before trying again. If your bank needs authentication, resume this payment.</p><button className="cp-primary" disabled={busy} onClick={() => void perform({ action: 'quote', id: e.id }, 'Review and resume the existing payment.')}>Review existing payment</button>{quote && <button className="cp-secondary" disabled={busy} onClick={() => void perform({ action: 'pay', id: e.id, invoiceId: invoice.id, consent: true, total: quote.total }, 'Payment status updated.')}>Resume authorized payment</button>}<button className="cp-text-button" disabled={busy} onClick={() => void perform({ action: 'reset-payment', id: e.id, invoiceId: invoice.id }, 'Failed attempt canceled. You can update your card and authorize another payment.')}>Reset a failed payment</button></div>}
    {session.admin && invoice.status === 'open' && <div className="cp-admin-actions">{invoice.reportedAt && <p>Client reported {invoice.method}: {invoice.reference}</p>}{e.cadence === 'once' && e.signature && <details><summary>Record payment received</summary><form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void perform({ action: 'record-payment', id: e.id, invoiceId: invoice.id, method: form.get('method'), reference: form.get('reference'), confirmed: form.get('confirmed') === 'on', amount: invoice.amount }, 'Payment receipt recorded.') }}><Field label="Received by"><select name="method" defaultValue={invoice.method ?? 'zelle'}><option value="zelle">Zelle</option><option value="cash">Cash</option><option value="check">Check</option></select></Field><Field label="Receipt or deposit reference"><input name="reference" required maxLength={300} /></Field><label className="cp-check"><input type="checkbox" name="confirmed" required /><span>I verified receipt of {money(invoice.amount)}. Any check has cleared.</span></label><button className="cp-primary" disabled={busy}>Confirm receipt & mark paid</button></form></details>}
      {voiding ? <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void perform({ action: 'void', id: e.id, invoiceId: invoice.id, reference: form.get('reference') }, 'Invoice voided.') }}><Field label="Reason for voiding"><input name="reference" required maxLength={300} /></Field><button className="cp-secondary" disabled={busy}>Confirm void</button></form> : <button className="cp-text-button" disabled={busy} onClick={() => setVoiding(true)}>Void invoice</button>}
    </div>}
  </article>
}
