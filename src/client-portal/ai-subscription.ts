import { aiSubscriptionOffer, aiSubscriptionPlans } from '../content/aiSubscriptionOffer.js'

export type AiSubscriptionPlan = 'monthly' | 'six_months' | 'yearly'
export type AiSubscription = {
  version: 1
  plan: AiSubscriptionPlan
  createdAt: string
  readiness?: { chatbot: boolean; phone: boolean; at: string; reference: string }
  trialStart?: string
  trialEnd?: string
  trialStartedAt?: string
  trialEndsAt?: string
  paymentStatus?: string
  renewalAuthorized?: boolean
  billingAnchor?: string
  paidUntil?: string
  nextDue?: string
  canceledAt?: string
  phoneCreditSeconds?: number
  creditReviewRequired?: { at: string; invoiceId: string; reason: 'dispute' | 'untracked_refund' }
  phoneReservations?: { id: string; periodStart: string; grantedSeconds: number; includedSeconds: number; creditSeconds: number; expiresAt: string; usedSeconds?: number; finalizedAt?: string }[]
  pendingPlan?: { plan: AiSubscriptionPlan; effectiveDate: string; requestedAt: string; consent: string }
  changes: { at: string; actor: string; action: string; consent?: string }[]
  usage: { periodStart: string; phoneSeconds: number; chatReplies: number; events?: string[] }[]
}
export type SubscriptionPeriod = { start: string; end: string; plan: AiSubscriptionPlan }
export const utcDate = () => new Date().toISOString().slice(0, 10)
export const subscriptionBoundary = (date: string) => `${date}T14:00:00.000Z`
/** An explicit different date is useful for calendar simulation at its billing boundary. */
export const subscriptionInstant = (today: string) => today === utcDate() ? Date.now() : Date.parse(subscriptionBoundary(today))
export const subscriptionPlanAmount = (plan: AiSubscriptionPlan) => aiSubscriptionPlans[plan].amount
export const isSubscriptionPlan = (value: unknown): value is AiSubscriptionPlan => typeof value === 'string' && ['monthly', 'six_months', 'yearly'].includes(value)
export function validSubscriptionDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}
/** Calendar dates use UTC; preserve the anchor day after a short month. */
export function addCalendarMonths(date: string, months: number, anchor = date): string {
  const current = new Date(`${date}T12:00:00Z`)
  const next = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + months, 1, 12))
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate()
  next.setUTCDate(Math.min(Number(anchor.slice(8, 10)), lastDay))
  return next.toISOString().slice(0, 10)
}
export function subscriptionPreview(s: AiSubscription, today = utcDate()) {
  const startedAt = new Date(subscriptionInstant(today)).toISOString()
  const calendarEnd = addCalendarMonths(today, 1)
  const sameTimeNextMonth = Date.parse(`${calendarEnd}${startedAt.slice(10)}`)
  let trialEnd = calendarEnd
  if (sameTimeNextMonth > Date.parse(subscriptionBoundary(trialEnd))) trialEnd = new Date(Date.parse(`${trialEnd}T12:00:00Z`) + 86400000).toISOString().slice(0, 10)
  return { startDate: today, trialEnd, trialStartedAt: startedAt, trialEndsAt: subscriptionBoundary(trialEnd), firstChargeAt: subscriptionBoundary(trialEnd), total: subscriptionPlanAmount(s.plan) }
}
export function subscriptionPeriod(s: AiSubscription, start: string, plan = s.plan): SubscriptionPeriod {
  return { start, end: addCalendarMonths(start, aiSubscriptionPlans[plan].months, s.billingAnchor ?? start), plan }
}
export function subscriptionView(s: AiSubscription, today = utcDate()) {
  const ready = Boolean(s.readiness?.chatbot && s.readiness.phone)
  const instant = subscriptionInstant(today)
  const timed = Boolean(s.trialStartedAt)
  const trialExpiresAt = s.trialEndsAt ?? (s.trialEnd ? `${s.trialEnd}T00:00:00.000Z` : undefined)
  const paidExpiresAt = s.paidUntil ? timed ? subscriptionBoundary(s.paidUntil) : `${s.paidUntil}T00:00:00.000Z` : undefined
  const inTrial = Boolean(s.trialStart && trialExpiresAt && instant >= Date.parse(s.trialStartedAt ?? `${s.trialStart}T00:00:00Z`) && instant < Date.parse(trialExpiresAt))
  const paid = Boolean(paidExpiresAt && instant < Date.parse(paidExpiresAt))
  const graceBoundary = s.nextDue ? Date.parse(timed ? subscriptionBoundary(s.nextDue) : `${s.nextDue}T00:00:00Z`) : 0
  const processingGrace = Boolean(timed && s.trialEnd && !s.canceledAt && s.renewalAuthorized && graceBoundary && instant >= graceBoundary && instant < graceBoundary + 3600000 && !['requires_payment_method', 'requires_action', 'canceled', 'failed'].includes(s.paymentStatus ?? ''))
  const accessUntil = inTrial ? s.trialEnd : paid ? s.paidUntil : undefined
  const accessExpiresAt = inTrial ? trialExpiresAt : paid ? paidExpiresAt : processingGrace ? new Date(graceBoundary + 3600000).toISOString() : undefined
  const phase: 'pending_setup' | 'ready' | 'trial' | 'active' | 'payment_required' | 'ended' = inTrial ? 'trial' : paid || processingGrace ? 'active' : s.canceledAt ? 'ended' : s.trialEnd ? 'payment_required' : ready ? 'ready' : 'pending_setup'
  const anchor = inTrial ? s.trialStart : s.billingAnchor
  let periodStart = anchor ?? today
  if (anchor && today >= anchor && !inTrial) {
    const months = (Number(today.slice(0, 4)) - Number(anchor.slice(0, 4))) * 12 + Number(today.slice(5, 7)) - Number(anchor.slice(5, 7))
    periodStart = addCalendarMonths(anchor, months, anchor)
    if (periodStart > today || (timed && periodStart === today && instant < Date.parse(subscriptionBoundary(periodStart)))) periodStart = addCalendarMonths(anchor, months - 1, anchor)
  }
  const usage = s.usage.find(item => item.periodStart === periodStart)
  const nextPlan = s.pendingPlan && s.pendingPlan.effectiveDate === s.nextDue ? s.pendingPlan.plan : s.plan
  const unpaidPeriodEnd = s.nextDue ? subscriptionPeriod(s, s.nextDue, nextPlan).end : undefined
  const recoveryRequired = Boolean(!s.canceledAt && unpaidPeriodEnd && instant >= Date.parse(timed ? subscriptionBoundary(unpaidPeriodEnd) : `${unpaidPeriodEnd}T00:00:00.000Z`))
  return {
    phase, ready, plan: s.plan, amount: subscriptionPlanAmount(s.plan), recoveryRequired,
    renewalEnabled: !s.canceledAt,
    accessUntil: accessUntil ?? (processingGrace ? s.nextDue : undefined), accessExpiresAt, processingGrace,
    nextChargeDate: !s.canceledAt ? s.nextDue : undefined,
    nextChargeAt: !s.canceledAt && s.nextDue ? timed ? subscriptionBoundary(s.nextDue) : `${s.nextDue}T00:00:00.000Z` : undefined,
    nextChargeAmount: !s.canceledAt && s.nextDue ? subscriptionPlanAmount(s.pendingPlan?.effectiveDate === s.nextDue ? s.pendingPlan.plan : s.plan) : undefined,
    pendingPlan: s.pendingPlan,
    usage: { periodStart, phoneSeconds: usage?.phoneSeconds ?? 0, chatReplies: usage?.chatReplies ?? 0, phoneSecondsLimit: (inTrial ? aiSubscriptionOffer.trialPhoneMinutes : aiSubscriptionOffer.monthlyPhoneMinutes) * 60, chatRepliesLimit: inTrial ? aiSubscriptionOffer.trialChatReplies : aiSubscriptionOffer.monthlyChatReplies },
  }
}
export function subscriptionConsent(s: AiSubscription): string {
  const plan = s.pendingPlan && s.pendingPlan.effectiveDate === s.nextDue ? s.pendingPlan.plan : s.plan
  const amount = (subscriptionPlanAmount(plan) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  const nextCharge = s.nextDue ? s.trialStartedAt ? subscriptionBoundary(s.nextDue) : s.nextDue : s.trialEnd
  return `I authorize ${amount} beginning ${nextCharge}, then every ${aiSubscriptionPlans[plan].months} calendar month(s). Service dates and the daily 14:00 billing run use UTC. My free month ends ${s.trialEndsAt ?? s.trialEnd}; no charge is due before then. The price includes applicable service taxes and no card surcharge. Cancellation during the trial prevents all charges. Later cancellation stops renewal and retains service through the paid service period. An interval change applies only at the next renewal after my separate confirmation. Included usage is capped; extra phone minutes require a separate prepaid purchase. No automatic overage charges or top-ups are authorized.`
}
