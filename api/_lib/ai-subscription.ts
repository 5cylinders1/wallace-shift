import { timingSafeEqual } from 'node:crypto'
import { DemoError } from './demo-access.js'
import type { Identity } from './portal-auth.js'
import { audit } from './portal-store.js'
import type { Engagement, Invoice } from '../../src/client-portal/model.js'
import { isSubscriptionPlan, subscriptionBoundary, subscriptionConsent, subscriptionInstant, subscriptionPeriod, subscriptionPlanAmount, subscriptionPreview, subscriptionView, utcDate } from '../../src/client-portal/ai-subscription.js'
import { aiSubscriptionOffer, aiSubscriptionPlans } from '../../src/content/aiSubscriptionOffer.js'

export function subscriptionGatewayConfigured(): boolean { return (process.env.AI_SERVICE_GATEWAY_SECRET?.trim().length ?? 0) >= 32 }
export function requireServiceGateway(authorization: string | undefined): void {
  const expected = Buffer.from(`Bearer ${process.env.AI_SERVICE_GATEWAY_SECRET?.trim() ?? ''}`)
  const actual = Buffer.from(authorization ?? '')
  if (!subscriptionGatewayConfigured() || expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new DemoError('forbidden', 403)
}
function record(entries: Engagement[], id: unknown, allowArchived = false): Engagement {
  const e = entries.find(item => item.id === id)
  if (!e || !e.aiSubscription) throw new DemoError('not_found', 404)
  if (e.archivedAt && !allowArchived) throw new DemoError('agreement_archived', 409)
  return e
}
function note(e: Engagement, actor: string, action: string, consent?: string) {
  e.aiSubscription!.changes.push({ at: new Date().toISOString(), actor, action, ...(consent ? { consent } : {}) })
  audit(e, actor, action)
}
export function subscriptionEntitlement(e: Engagement, today = utcDate()) {
  const s = e.aiSubscription!
  const view = subscriptionView(s, today)
  const allowed = !e.archivedAt && ['issued', 'canceled'].includes(e.state) && subscriptionGatewayConfigured() && view.ready && Boolean(e.signature && s.trialStart && view.accessUntil)
  const includedPhoneSecondsRemaining = allowed ? Math.max(0, view.usage.phoneSecondsLimit - view.usage.phoneSeconds) : 0
  const prepaidPhoneSecondsRemaining = allowed && view.phase === 'active' && !s.creditReviewRequired ? s.phoneCreditSeconds ?? 0 : 0
  return {
    allowed, phase: view.phase, accessUntil: allowed ? view.accessUntil : undefined,
    expiresAt: allowed ? view.accessExpiresAt : undefined,
    phoneSecondsRemaining: includedPhoneSecondsRemaining + prepaidPhoneSecondsRemaining,
    includedPhoneSecondsRemaining, prepaidPhoneSecondsRemaining,
    chatRepliesRemaining: allowed ? Math.max(0, view.usage.chatRepliesLimit - view.usage.chatReplies) : 0,
    periodStart: view.usage.periodStart,
  }
}
/** Called only after the handler verifies the separate service gateway credential. */
export function serviceGatewayAction(entries: Engagement[], body: Record<string, unknown>, today = utcDate()) {
  // An archived service grants no new work, but provider settlement must still
  // return unused reservations so the final credit refund remains accurate.
  const e = record(entries, body.id, body.action === 'finalize-phone' || body.action === 'refund-chat')
  const s = e.aiSubscription!
  if (body.action === 'readiness') {
    if (typeof body.chatbot !== 'boolean' || typeof body.phone !== 'boolean' || typeof body.reference !== 'string' || !body.reference.trim() || body.reference.length > 200) throw new DemoError('invalid_fields', 400)
    s.readiness = { chatbot: body.chatbot, phone: body.phone, reference: body.reference.trim(), at: new Date().toISOString() }
    note(e, 'Service gateway', 'Service readiness verified by connected gateway')
    return subscriptionEntitlement(e, today)
  }
  if (['reserve-phone', 'finalize-phone', 'refund-chat'].includes(String(body.action))) {
    if (typeof body.eventId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(body.eventId)) throw new DemoError('invalid_fields', 400)
    const entitlement = subscriptionEntitlement(e, today)
    if (body.action === 'refund-chat') {
      for (const period of s.usage) {
        const index = period.events?.indexOf(`chat:${body.eventId}:1`) ?? -1
        if (index >= 0) { period.events![index] += ':refunded'; period.chatReplies = Math.max(0, period.chatReplies - 1); return subscriptionEntitlement(e, today) }
      }
      if (s.usage.some(period => period.events?.includes(`chat:${body.eventId}:1:refunded`))) return { ...entitlement, duplicate: true }
      let period = s.usage.find(item => item.periodStart === entitlement.periodStart)
      if (!period) { period = { periodStart: entitlement.periodStart, phoneSeconds: 0, chatReplies: 0, events: [] }; s.usage.push(period) }
      period.events ??= []; period.events.push(`chat:${body.eventId}:1:refunded`)
      return entitlement
    }
    const reservation = s.phoneReservations?.find(item => item.id === body.eventId)
    if (body.action === 'finalize-phone') {
      if (!reservation || !Number.isSafeInteger(body.usedSeconds) || Number(body.usedSeconds) < 0 || Number(body.usedSeconds) > reservation.grantedSeconds) throw new DemoError('invalid_usage', 400)
      if (reservation.finalizedAt) {
        if (reservation.usedSeconds !== body.usedSeconds) throw new DemoError('usage_event_conflict', 409)
        return { ...entitlement, duplicate: true }
      }
      const used = Number(body.usedSeconds)
      const includedUsed = Math.min(used, reservation.includedSeconds)
      const creditUsed = used - includedUsed
      const period = s.usage.find(item => item.periodStart === reservation.periodStart)!
      period.phoneSeconds = Math.max(0, period.phoneSeconds - (reservation.includedSeconds - includedUsed))
      s.phoneCreditSeconds = (s.phoneCreditSeconds ?? 0) + reservation.creditSeconds - creditUsed
      reservation.usedSeconds = used; reservation.finalizedAt = new Date().toISOString()
      return subscriptionEntitlement(e, today)
    }
    if (!Number.isSafeInteger(body.requestedSeconds) || Number(body.requestedSeconds) <= 0) throw new DemoError('invalid_usage', 400)
    if (s.usage.some(period => period.events?.some(event => event.startsWith(`phone:${body.eventId}:`)))) throw new DemoError('usage_event_conflict', 409)
    if (reservation) return { ...entitlement, allowed: entitlement.allowed && !reservation.finalizedAt && Date.now() < Date.parse(reservation.expiresAt), grantedSeconds: reservation.grantedSeconds, expiresAt: reservation.expiresAt, duplicate: true }
    if (!entitlement.allowed) return { ...entitlement, grantedSeconds: 0, reason: 'service_unavailable' }
    const secondsUntilExpiry = Math.max(0, Math.floor((Date.parse(entitlement.expiresAt!) - Date.now()) / 1000))
    const grantedSeconds = Math.min(Number(body.requestedSeconds), aiSubscriptionOffer.maxPhoneCallMinutes * 60, entitlement.phoneSecondsRemaining, secondsUntilExpiry)
    if (grantedSeconds <= 0) return { ...entitlement, allowed: false, grantedSeconds: 0, reason: 'usage_limit' }
    let usage = s.usage.find(item => item.periodStart === entitlement.periodStart)
    if (!usage) { usage = { periodStart: entitlement.periodStart, phoneSeconds: 0, chatReplies: 0, events: [] }; s.usage.push(usage) }
    const includedSeconds = Math.min(grantedSeconds, entitlement.includedPhoneSecondsRemaining)
    const creditSeconds = grantedSeconds - includedSeconds
    usage.phoneSeconds += includedSeconds; s.phoneCreditSeconds = (s.phoneCreditSeconds ?? 0) - creditSeconds
    s.phoneReservations ??= []
    const expiresAt = new Date(Date.now() + grantedSeconds * 1000).toISOString()
    s.phoneReservations.push({ id: body.eventId, periodStart: entitlement.periodStart, grantedSeconds, includedSeconds, creditSeconds, expiresAt })
    return { ...subscriptionEntitlement(e, today), allowed: true, grantedSeconds, expiresAt }
  }
  if (body.action !== 'consume' || !['phone', 'chat'].includes(String(body.kind)) || typeof body.eventId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(body.eventId) || !Number.isSafeInteger(body.units) || Number(body.units) <= 0) throw new DemoError('invalid_fields', 400)
  const entitlement = subscriptionEntitlement(e, today)
  if (!entitlement.allowed) return { ...entitlement, allowed: false, reason: 'service_unavailable' }
  const view = subscriptionView(s, today)
  let usage = s.usage.find(item => item.periodStart === view.usage.periodStart)
  const event = `${body.kind}:${body.eventId}:${body.units}`
  if (body.kind === 'phone' && s.phoneReservations?.some(item => item.id === body.eventId)) throw new DemoError('usage_event_conflict', 409)
  const prior = s.usage.flatMap(period => period.events ?? []).find(item => item.startsWith(`${body.kind}:${body.eventId}:`))
  if (prior === event) return { ...entitlement, duplicate: true }
  if (prior) throw new DemoError('usage_event_conflict', 409)
  if (body.kind === 'phone' && Number(body.units) > aiSubscriptionOffer.maxPhoneCallMinutes * 60) return { ...entitlement, allowed: false, reason: 'call_limit' }
  const remaining = body.kind === 'phone' ? entitlement.phoneSecondsRemaining : entitlement.chatRepliesRemaining
  if (Number(body.units) > remaining) return { ...entitlement, allowed: false, reason: 'usage_limit' }
  if (!usage) { usage = { periodStart: view.usage.periodStart, phoneSeconds: 0, chatReplies: 0, events: [] }; s.usage.push(usage) }
  usage.events ??= []
  usage.events.push(event)
  if (body.kind === 'phone') {
    const included = Math.min(Number(body.units), entitlement.includedPhoneSecondsRemaining)
    usage.phoneSeconds += included
    s.phoneCreditSeconds = (s.phoneCreditSeconds ?? 0) - (Number(body.units) - included)
  }
  else usage.chatReplies += Number(body.units)
  return subscriptionEntitlement(e, today)
}
export function changeAiSubscription(entries: Engagement[], body: Record<string, unknown>, who: Identity, today = utcDate()): void {
  const e = record(entries, body.id)
  if ((who.admin && body.action !== 'cancel') || (!who.admin && who.email !== e.email) || (who.engagementId && who.engagementId !== e.id)) throw new DemoError('client_authorization_required', 403)
  const s = e.aiSubscription!
  if (body.action === 'cancel') {
    if (s.canceledAt) return
    s.canceledAt = new Date().toISOString()
    s.renewalAuthorized = false
    delete s.pendingPlan; delete s.nextDue; delete e.nextDue
    e.state = 'canceled'
    if (e.autopay) e.autopay.enabled = false
    for (const invoice of e.invoices) if (invoice.subscriptionPeriod && invoice.status === 'open' && !invoice.attempt) invoice.status = 'void'
    note(e, who.email, 'Subscription renewal canceled; remaining free or paid service retained')
    return
  }
  if (s.canceledAt || e.state !== 'issued') throw new DemoError('subscription_canceled', 409)
  if (body.action === 'subscription-withdraw-change') {
    if (!s.pendingPlan) return
    delete s.pendingPlan
    // A replacement card may have been authorized only for the pending lower
    // price. Withdrawing cannot revive the original, potentially higher charge.
    if (e.autopay) e.autopay.enabled = false
    s.renewalAuthorized = false
    note(e, who.email, 'Pending payment interval change withdrawn; current schedule requires fresh payment authorization'); return
  }
  if (!e.signature || e.signature.hash !== e.agreementHash) throw new DemoError('signature_required', 409)
  if (!e.paymentMethod || !e.stripeCustomer) throw new DemoError('card_required', 409)
  if (body.consent !== true) throw new DemoError('authorization_required', 409)
  if (body.action === 'subscription-start') {
    if (s.trialStart) {
      if (body.startDate === s.trialStart && body.trialEnd === s.trialEnd && body.total === subscriptionPlanAmount(s.plan)) return
      throw new DemoError('trial_already_started', 409)
    }
    if (!subscriptionGatewayConfigured() || !s.readiness?.chatbot || !s.readiness.phone) throw new DemoError('service_setup_pending', 409)
    const preview = subscriptionPreview(s, today)
    if (body.startDate !== preview.startDate || body.trialEnd !== preview.trialEnd || body.total !== preview.total) throw new DemoError('subscription_preview_changed', 409)
    s.trialStart = preview.startDate; s.trialEnd = preview.trialEnd; s.billingAnchor = preview.trialEnd; s.nextDue = preview.trialEnd
    s.trialStartedAt = preview.trialStartedAt; s.trialEndsAt = preview.trialEndsAt; s.renewalAuthorized = true
    e.nextDue = s.nextDue; e.firstDue = s.nextDue
    const consent = subscriptionConsent(s)
    e.autopay = { enabled: true, at: new Date().toISOString(), feeBps: 0, agreementHash: e.agreementHash, consent }
    note(e, who.email, 'Free calendar month started with dated payment authorization', consent)
    return
  }
  if (!s.trialStart || !s.nextDue) throw new DemoError('trial_not_started', 409)
  if (body.action === 'subscription-authorize') {
    const view = subscriptionView(s, today)
    if (body.nextChargeDate !== view.nextChargeDate || body.total !== view.nextChargeAmount) throw new DemoError('subscription_preview_changed', 409)
    const nextPlan = s.pendingPlan?.effectiveDate === s.nextDue ? s.pendingPlan.plan : s.plan
    const consent = `I authorize ${(view.nextChargeAmount! / 100).toFixed(2)} USD beginning ${view.nextChargeDate}, then every ${aiSubscriptionPlans[nextPlan].months} calendar month(s), using UTC service dates. No charge is due before this date. Cancellation stops renewal and retains service through the free or paid service period. No automatic usage charges or top-ups are authorized.`
    e.autopay = { enabled: true, at: new Date().toISOString(), feeBps: 0, agreementHash: e.agreementHash, consent }
    s.renewalAuthorized = true
    note(e, who.email, 'Subscription payment method reauthorized', consent)
    return
  }
  if (body.action === 'subscription-change-plan') {
    if (!isSubscriptionPlan(body.plan)) throw new DemoError('invalid_plan', 400)
    if (subscriptionInstant(today) >= Date.parse(s.trialStartedAt ? subscriptionBoundary(s.nextDue) : `${s.nextDue}T00:00:00Z`) || e.invoices.some(item => item.status === 'processing' || (item.subscriptionPeriod && item.status === 'open'))) throw new DemoError('payment_in_progress', 409)
    if (body.effectiveDate !== s.nextDue || body.total !== subscriptionPlanAmount(body.plan)) throw new DemoError('subscription_preview_changed', 409)
    if (body.plan === s.plan) {
      delete s.pendingPlan
      if (e.autopay) e.autopay.enabled = false
      s.renewalAuthorized = false
      note(e, who.email, 'Pending payment interval change withdrawn; current schedule requires fresh payment authorization'); return
    }
    const consent = `I authorize ${(subscriptionPlanAmount(body.plan) / 100).toFixed(2)} USD for ${body.plan} service beginning ${s.nextDue} and each following interval. My existing paid or free period remains unchanged; no immediate charge or proration applies.`
    s.pendingPlan = { plan: body.plan, effectiveDate: s.nextDue, requestedAt: new Date().toISOString(), consent }
    note(e, who.email, 'Payment interval change scheduled for next renewal', consent)
    return
  }
  throw new DemoError('invalid_action', 400)
}
export function generateSubscriptionInvoice(e: Engagement, today: string): number {
  const s = e.aiSubscription!
  if (e.archivedAt || e.state !== 'issued' || s.canceledAt || !s.trialEnd || today < s.trialEnd || !s.nextDue || s.nextDue > today || !e.signature || !e.autopay?.enabled || e.autopay.agreementHash !== e.agreementHash || !subscriptionGatewayConfigured() || !s.readiness?.chatbot || !s.readiness.phone) return 0
  if (s.trialStartedAt && subscriptionInstant(today) < Date.parse(subscriptionBoundary(s.nextDue))) return 0
  if (e.invoices.some(item => item.subscriptionPeriod && (item.status === 'open' || item.status === 'processing'))) return 0
  if (e.invoices.some(item => item.subscriptionPeriod?.start === s.nextDue)) return 0
  if (s.pendingPlan?.effectiveDate === s.nextDue) { s.plan = s.pendingPlan.plan; delete s.pendingPlan; e.amount = subscriptionPlanAmount(s.plan); e.cadence = s.plan }
  const period = subscriptionPeriod(s, s.nextDue)
  // Never collect for a wholly elapsed service period after a prolonged outage.
  if (Date.parse(s.trialStartedAt ? subscriptionBoundary(period.end) : `${period.end}T00:00:00Z`) <= subscriptionInstant(today)) return 0
  e.invoices.push({ id: `${e.id}-subscription-${period.start}`, due: period.start, amount: subscriptionPlanAmount(period.plan), fee: 0, status: 'open', kind: 'recurring', subscriptionPeriod: period })
  audit(e, 'Billing schedule', 'Subscription renewal invoice generated without extending service')
  return 1
}
export function assertSubscriptionCharge(e: Engagement, invoice: Invoice, today = utcDate(), automatic = false): void {
  if (!e.aiSubscription) return
  const s = e.aiSubscription
  if (invoice.subscriptionCredit) {
    const view = subscriptionView(s, today)
    if (automatic || s.creditReviewRequired || view.phase !== 'active' || view.processingGrace || !subscriptionEntitlement(e, today).allowed || invoice.amount !== aiSubscriptionOffer.extraPhonePackMinutes * aiSubscriptionOffer.extraPhoneMinuteCents || invoice.subscriptionCredit.phoneSeconds !== aiSubscriptionOffer.extraPhonePackMinutes * 60 || invoice.subscriptionCredit.appliedAt) throw new DemoError('payment_not_ready', 409)
    return
  }
  const period = invoice.subscriptionPeriod
  if (s.canceledAt || e.state !== 'issued' || !s.trialEnd || today < s.trialEnd || !period || period.start !== invoice.due || invoice.due > today || invoice.amount !== subscriptionPlanAmount(period.plan) || !subscriptionGatewayConfigured() || !s.readiness?.chatbot || !s.readiness.phone) throw new DemoError('payment_not_ready', 409)
  const now = subscriptionInstant(today)
  if (now < Date.parse(s.trialStartedAt ? subscriptionBoundary(period.start) : `${period.start}T00:00:00Z`) || now >= Date.parse(s.trialStartedAt ? subscriptionBoundary(period.end) : `${period.end}T00:00:00Z`)) throw new DemoError('payment_not_ready', 409)
  if (!e.autopay?.enabled || e.autopay.agreementHash !== e.agreementHash) throw new DemoError('authorization_required', 409)
}
export function applySubscriptionPayment(e: Engagement, invoice: Invoice): void {
  if (!e.aiSubscription || invoice.status !== 'paid') return
  const s = e.aiSubscription
  if (invoice.subscriptionCredit) {
    const refunds = invoice.subscriptionCredit.refunds ?? []
    const trackedRefundAmount = refunds.reduce((sum, item) => sum + item.amount, 0)
    if (invoice.disputed || (invoice.refunded ?? 0) > trackedRefundAmount) {
      if (!s.creditReviewRequired) {
        s.creditReviewRequired = { at: new Date().toISOString(), invoiceId: invoice.id, reason: invoice.disputed ? 'dispute' : 'untracked_refund' }
        audit(e, 'Stripe', 'Prepaid minute spending paused for refund or dispute review; included usage retained')
      }
      return
    }
    if (s.creditReviewRequired) return
    if (!invoice.subscriptionCredit.appliedAt) {
      s.phoneCreditSeconds = (s.phoneCreditSeconds ?? 0) + invoice.subscriptionCredit.phoneSeconds
      invoice.subscriptionCredit.appliedAt = new Date().toISOString()
    }
    return
  }
  if (!invoice.subscriptionPeriod) return
  const period = invoice.subscriptionPeriod
  if (!s.paidUntil || period.end > s.paidUntil) s.paidUntil = period.end
  if (!s.canceledAt && (!s.nextDue || s.nextDue < period.end)) { s.nextDue = period.end; e.nextDue = period.end }
}
