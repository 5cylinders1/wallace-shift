import { useRef, useState } from 'react'
import { aiSubscriptionPlans, type AiSubscriptionInterval } from '../content/aiSubscriptionOffer'
import { addCalendarMonths, subscriptionBoundary, subscriptionPreview, subscriptionView } from './ai-subscription'
import { money, type Engagement } from './model'

type SubscriptionEntry = Engagement & { hasCard?: boolean; subscriptionPreview?: ReturnType<typeof subscriptionPreview>; subscriptionView?: ReturnType<typeof subscriptionView> }
type Props = { entry: SubscriptionEntry; admin?: boolean; busy: boolean; stripeReady?: boolean; setup?: string | null; perform: (body: Record<string, unknown>, success?: string) => Promise<unknown> }
const utcTime = (value?: string) => value ? `${value.slice(0, 10)} at ${value.slice(11, 16)} UTC` : ''

export function AiSubscriptionPanel({ entry: e, admin, busy, stripeReady, setup, perform }: Props) {
  const s = e.aiSubscription!
  const view = e.subscriptionView ?? subscriptionView(s)
  const preview = e.subscriptionPreview ?? subscriptionPreview(s)
  const [plan, setPlan] = useState<AiSubscriptionInterval>(s.pendingPlan?.plan ?? s.plan)
  const [confirmed, setConfirmed] = useState(false)
  const [creditConfirmed, setCreditConfirmed] = useState(false)
  const creditRequest = useRef(crypto.randomUUID())
  const labels = { pending_setup: 'Setup in progress', ready: 'Ready to start your free month', trial: 'Free month active', active: 'Paid service active', payment_required: 'Payment required to resume service', ended: 'Service ended' }
  const usedMinutes = Math.ceil(view.usage.phoneSeconds / 60)
  const limitMinutes = view.usage.phoneSecondsLimit / 60
  const usageNotice = view.usage.phoneSeconds >= view.usage.phoneSecondsLimit || view.usage.chatReplies >= view.usage.chatRepliesLimit
    ? view.phase === 'trial' ? 'A trial allowance has been reached. The affected AI channel is paused. No extra charges are created.' : 'An included allowance has been reached. The affected AI channel is paused. Extra phone minutes require a separate purchase.'
    : view.usage.phoneSeconds >= view.usage.phoneSecondsLimit * .8 || view.usage.chatReplies >= view.usage.chatRepliesLimit * .8
      ? 'You have used at least 80% of an included allowance.' : ''
  const authorized = Boolean(e.autopay?.enabled)
  const nextAllowanceReset = subscriptionBoundary(addCalendarMonths(view.usage.periodStart, 1, s.billingAnchor ?? view.usage.periodStart))
  const allowanceEndsWithService = Boolean(s.canceledAt && view.accessExpiresAt && view.accessExpiresAt <= nextAllowanceReset)
  const creditRefunds = e.invoices.flatMap(invoice => invoice.subscriptionCredit?.refunds ?? [])
  const refundedCredit = creditRefunds.filter(refund => refund.state === 'sent').reduce((sum, refund) => sum + refund.amount, 0)
  const pendingCreditRefund = creditRefunds.filter(refund => refund.state !== 'sent').reduce((sum, refund) => sum + refund.amount, 0)

  return <section className="cp-ai-subscription" aria-label="AI service subscription">
    <h2>{view.recoveryRequired ? 'Service restart needs review' : view.processingGrace ? 'Payment processing' : labels[view.phase]}</h2>
    <p><strong>{money(view.amount)}</strong> {aiSubscriptionPlans[s.plan].label.toLowerCase()} after your trial. Applicable service taxes included. No card surcharge.</p>
    <dl className="cp-ai-dates">
      <div><dt>Chatbot</dt><dd>{s.readiness?.chatbot ? 'Ready' : 'Setup pending'}</dd></div>
      <div><dt>Phone agent</dt><dd>{s.readiness?.phone ? 'Ready' : 'Setup pending'}</dd></div>
      {s.trialEndsAt && <div><dt>Free month ends</dt><dd>{utcTime(s.trialEndsAt)}</dd></div>}
      {view.accessExpiresAt && <div><dt>Service available until</dt><dd>{utcTime(view.accessExpiresAt)}{s.canceledAt ? ' · Renewal canceled' : ''}</dd></div>}
      {view.nextChargeAt && !view.recoveryRequired && <div><dt>Next base charge</dt><dd>{money(view.nextChargeAmount!)} on {utcTime(view.nextChargeAt)}{!authorized ? ' · Payment authorization required' : ''}</dd></div>}
    </dl>
    {!s.trialStart && <p>Setup registration does not start the free month. Both services must be ready before you confirm the dates and authorize the first payment below.</p>}
    {creditRefunds.length > 0 && <p className="cp-callout" role="status">Unused phone credit refunds: {money(refundedCredit)} confirmed{pendingCreditRefund > 0 ? `; ${money(pendingCreditRefund)} pending` : ''}. Bank posting times vary.{creditRefunds.some(refund => refund.state === 'review') ? ' A refund needs Wallace Shift to reconcile its status before another attempt.' : ''}</p>}
    {s.creditReviewRequired && <p className="cp-callout" role="status">Extra phone credit is on hold while Wallace Shift reviews a payment refund or dispute. Included usage remains available within your service limits.</p>}
    {view.processingGrace && <p className="cp-callout" role="status">Payment has not been confirmed. Service continues without an additional charge until {utcTime(view.accessExpiresAt)} while payment is checked. A failed payment ends this temporary access. Extra minute purchases resume after payment is confirmed.</p>}
    {view.recoveryRequired && <p className="cp-callout" role="status">Your previous unpaid service period has ended. Online payment and interval changes are paused. <a href="/contact">Contact Wallace Shift</a> to review any previous payment attempt and arrange a new service period. The portal will not create a new charge for the elapsed period.</p>}
    {view.phase === 'payment_required' && !view.recoveryRequired && <p>Resolve the current service payment below before scheduling another interval change.</p>}
    {s.canceledAt && <p role="status">Renewal is canceled. No new base charge or automatic usage bill will be created. {view.phase !== 'ended' && view.accessExpiresAt ? `Your remaining service continues until ${utcTime(view.accessExpiresAt)}.` : 'Service access has ended.'} Unused purchased phone credit is refunded when service ends.</p>}
    {admin ? <p className="cp-callout">Reply365 verifies readiness and enforces service access and usage. The client must sign, save a card, and confirm activation. Readiness cannot be marked complete from this page.</p> : e.signature && !e.archivedAt && !view.recoveryRequired && <>
      {setup ? <button className="cp-secondary" disabled={busy} onClick={() => void perform({ action: 'finish-setup', id: e.id, sessionId: setup }, 'Card saved. Review and authorize the schedule below.')}>Confirm saved card</button>
        : <button className="cp-secondary" disabled={busy || !stripeReady} onClick={() => void perform({ action: 'setup-card', id: e.id })}>{e.hasCard ? 'Update payment card' : 'Save payment card securely'}</button>}
      {!s.trialStart && !s.canceledAt && view.ready && e.hasCard && <form className="cp-payment" onSubmit={event => {
        event.preventDefault()
        void perform({ action: 'subscription-start', id: e.id, consent: confirmed, startDate: preview.startDate, trialEnd: preview.trialEnd, total: preview.total }, 'Your free calendar month has started. No payment was charged.').then(() => setConfirmed(false))
      }}>
        <h3>Start your free calendar month</h3>
        <p>Start when you confirm. Free month ends: <strong>{utcTime(preview.trialEndsAt)}</strong>. You receive at least one full calendar month; any time until the next daily billing run is also free.</p>
        <p>First charge: <strong>{money(preview.total)} on {utcTime(preview.firstChargeAt)}</strong>, then {aiSubscriptionPlans[s.plan].label.toLowerCase()}. Cancel before that time to avoid all charges. Trial usage is capped at 100 phone minutes and 500 AI replies.</p>
        <label className="cp-check"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} required /><span>I authorize the displayed automatic payment schedule after my free month. I understand cancellation and usage limits, and that saving a card alone did not start billing.</span></label>
        <button className="cp-primary" disabled={busy || !confirmed}>Start free month</button>
      </form>}
      {s.trialStart && !s.canceledAt && !authorized && e.hasCard && view.nextChargeDate && <form className="cp-payment" onSubmit={event => {
        event.preventDefault()
        const values = new FormData(event.currentTarget)
        void perform({ action: 'subscription-authorize', id: e.id, consent: values.get('consent') === 'on', total: view.nextChargeAmount, nextChargeDate: view.nextChargeDate }, 'The displayed payment schedule is authorized for your saved card.')
      }}><h3>Authorize your payment schedule</h3><label className="cp-check"><input type="checkbox" name="consent" required /><span>I authorize {money(view.nextChargeAmount!)} on {utcTime(view.nextChargeAt)}, then {aiSubscriptionPlans[s.pendingPlan?.plan ?? s.plan].label.toLowerCase()}, until I cancel renewal. This does not change my service dates or add an immediate charge before the due date.</span></label><button className="cp-primary" disabled={busy}>Authorize payment schedule</button></form>}
    </>}
    {s.trialStart && <section className="cp-payment" aria-label="Service usage"><h3>Usage this service month</h3><p>Period starts {view.usage.periodStart} (UTC). Included allowances reset monthly, even with six- or twelve-month payments. Included allowances do not roll over.</p>{view.phase === 'trial' ? <p>Trial allowance ends {utcTime(s.trialEndsAt)}.</p> : view.phase === 'active' && !view.processingGrace && <p>{allowanceEndsWithService ? `Allowances end with your service on ${utcTime(view.accessExpiresAt)}.` : `Next allowance reset: ${utcTime(nextAllowanceReset)}.`}</p>}<p><strong>{usedMinutes} / {limitMinutes}</strong> included phone minutes used · <strong>{view.usage.chatReplies} / {view.usage.chatRepliesLimit}</strong> chatbot AI replies used.</p><p>Extra prepaid phone minutes remaining: <strong>{((s.phoneCreditSeconds ?? 0) / 60).toFixed(1)}</strong>.</p>{usageNotice && <p className="cp-callout" role="status">{usageNotice}</p>}
      {!admin && view.phase === 'active' && !view.processingGrace && !view.recoveryRequired && !s.creditReviewRequired && e.hasCard && <form onSubmit={async event => {
        event.preventDefault()
        const result = await perform({ action: 'subscription-topup', id: e.id, requestId: creditRequest.current, total: 4000, consent: creditConfirmed }, 'Extra minute purchase checked. Your credit appears after payment is confirmed.')
        if (result) { creditRequest.current = crypto.randomUUID(); setCreditConfirmed(false) }
      }}><h4>Buy extra phone minutes</h4><p>100 minutes for <strong>$40.00</strong> ($0.40 per minute). This is a separate purchase now. No automatic top-ups or usage debt. Extra minutes carry across monthly allowance resets while your service is active. Unused purchased credit is refunded to the original payment method when service ends.</p><label className="cp-check"><input type="checkbox" checked={creditConfirmed} onChange={event => setCreditConfirmed(event.target.checked)} required /><span>I authorize this one-time $40.00 purchase using my saved card. I understand unused purchased credit is refunded when service ends.</span></label><button className="cp-secondary" disabled={busy || !creditConfirmed}>Buy 100 extra minutes for $40</button></form>}
    </section>}
    {!admin && s.trialStart && !s.canceledAt && view.nextChargeDate && !view.recoveryRequired && !view.processingGrace && view.phase !== 'payment_required' && <section className="cp-payment"><h3>Payment interval</h3>
      {s.pendingPlan && <p className="cp-callout" role="status">Scheduled: {aiSubscriptionPlans[s.pendingPlan.plan].label}, {money(aiSubscriptionPlans[s.pendingPlan.plan].amount)} on {s.pendingPlan.effectiveDate}. <button className="cp-text-button" disabled={busy} onClick={() => void perform({ action: 'subscription-withdraw-change', id: e.id }, 'Pending interval change removed. Review and authorize your restored payment schedule before renewal.')}>Withdraw pending change</button></p>}
      <form key={`${s.pendingPlan?.requestedAt ?? ''}:${view.nextChargeDate}`} onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void perform({ action: 'subscription-change-plan', id: e.id, plan, total: aiSubscriptionPlans[plan].amount, effectiveDate: view.nextChargeDate, consent: form.get('consent') === 'on' }, 'Payment interval change saved for your next renewal.') }}>
        <label className="cp-field"><span>New payment interval</span><select value={plan} onChange={event => setPlan(event.target.value as AiSubscriptionInterval)}>{Object.values(aiSubscriptionPlans).map(item => <option key={item.id} value={item.id}>{item.label} · {money(item.amount)} per charge</option>)}</select></label>
        <p>Effective {utcTime(view.nextChargeAt)}. Your current service period stays unchanged. There is no immediate base charge or proration.</p>
        <label className="cp-check"><input name="consent" type="checkbox" required /><span>I authorize {money(aiSubscriptionPlans[plan].amount)} on {utcTime(view.nextChargeAt)}, then {aiSubscriptionPlans[plan].label.toLowerCase()}, until I cancel renewal.</span></label>
        <button className="cp-secondary" disabled={busy || !e.hasCard}>Schedule interval change</button>
      </form>
    </section>}
  </section>
}
