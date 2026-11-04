import { randomUUID } from 'node:crypto'
import type { Engagement, Invoice } from '../../src/client-portal/model.js'
import { subscriptionBoundary } from '../../src/client-portal/ai-subscription.js'
import { allEngagements, audit, mutateLedger } from './portal-store.js'
import { stripe } from './portal-stripe.js'

type CreditRefund = NonNullable<NonNullable<Invoice['subscriptionCredit']>['refunds']>[number]
type StripeRefund = { id: string; payment_intent: string; amount: number; currency: string; status: string; metadata: { credit_refund?: string } }
type RefundTask = { engagementId: string; invoiceId: string; paymentIntent: string; refund: CreditRefund }

/** Payment failure is a pause, not a final cancellation of purchased credit. */
export function phoneCreditServiceEnded(e: Engagement, now = Date.now()): boolean {
  const s = e.aiSubscription
  if (!s) return false
  if (e.archivedAt || e.state === 'complete') return true
  if (!s.canceledAt && e.state !== 'canceled') return false
  const end = s.paidUntil
    ? s.trialStartedAt ? subscriptionBoundary(s.paidUntil) : `${s.paidUntil}T00:00:00.000Z`
    : s.trialEndsAt ?? (s.trialEnd ? `${s.trialEnd}T00:00:00.000Z` : undefined)
  return !end || now >= Date.parse(end)
}

/** Reserve once in the same CAS that removes spendable seconds. In-flight call
 * reservations are already excluded; late finalization creates a later refund. */
export function reservePhoneCreditRefunds(e: Engagement): number {
  const s = e.aiSubscription
  if (!s || s.creditReviewRequired || !phoneCreditServiceEnded(e)) return 0
  let remaining = s.phoneCreditSeconds ?? 0
  if (!Number.isSafeInteger(remaining) || remaining <= 0) return 0
  let reserved = 0
  const purchases = e.invoices.filter(i => i.subscriptionCredit?.appliedAt && i.status === 'paid' && i.paymentIntent)
    .sort((a, b) => (a.paidAt ?? a.due).localeCompare(b.paidAt ?? b.due) || a.id.localeCompare(b.id))
  // Unknown manual refunds/disputes must be reconciled before any automatic payout.
  for (const invoice of purchases) {
    const tracked = invoice.subscriptionCredit!.refunds?.reduce((sum, item) => sum + item.amount, 0) ?? 0
    if (invoice.disputed || (invoice.refunded ?? 0) > tracked) {
      s.creditReviewRequired = { at: new Date().toISOString(), invoiceId: invoice.id, reason: invoice.disputed ? 'dispute' : 'untracked_refund' }
      audit(e, 'Credit refunds', 'Unused phone credit requires payment review')
      return 0
    }
  }
  for (const invoice of purchases) {
    if (!remaining) break
    const credit = invoice.subscriptionCredit!
    const refunds = credit.refunds ??= []
    const priorSeconds = refunds.reduce((sum, item) => sum + item.seconds, 0)
    const priorAmount = refunds.reduce((sum, item) => sum + item.amount, 0)
    const seconds = Math.min(remaining, Math.max(0, credit.phoneSeconds - priorSeconds))
    if (!seconds) continue
    // Cumulative rounding preserves cents when a late call settlement causes a
    // second refund. Never refund more than this purchase's original amount.
    const amount = Math.max(0, Math.min(invoice.amount - priorAmount,
      Math.round((priorSeconds + seconds) * invoice.amount / credit.phoneSeconds) - priorAmount))
    refunds.push({ id: randomUUID(), seconds, amount, state: amount ? 'pending' : 'sent', startedAt: new Date().toISOString() })
    remaining -= seconds
    reserved += seconds
  }
  if (reserved) {
    s.phoneCreditSeconds = remaining
    audit(e, 'Credit refunds', `${reserved} unused prepaid phone seconds reserved for refund`)
  }
  return reserved
}

async function saveRefund(task: RefundTask, update: (refund: CreditRefund, e: Engagement) => void) {
  await mutateLedger(entries => {
    const e = entries.find(item => item.id === task.engagementId)
    const invoice = e?.invoices.find(item => item.id === task.invoiceId)
    const refund = invoice?.subscriptionCredit?.refunds?.find(item => item.id === task.refund.id)
    if (e && refund && refund.state !== 'sent') update(refund, e)
  })
}

async function processRefund(task: RefundTask): Promise<'sent' | 'pending' | 'review'> {
  const latest = (await allEngagements()).find(e => e.id === task.engagementId)
  const current = latest?.invoices.find(i => i.id === task.invoiceId)?.subscriptionCredit?.refunds?.find(r => r.id === task.refund.id)
  if (!latest || !current || current.state !== 'pending') return current?.state ?? 'review'
  // Durable oldest-check-first ordering lets later customers progress while a
  // prior Stripe refund remains pending for more than one billing run.
  await saveRefund(task, refund => { refund.checkedAt = new Date().toISOString() })
  // A known refund ID can always be polled safely. An uncertain creation must
  // not be repeated after Stripe could have pruned its idempotency key.
  if (!current.refundId && (latest.aiSubscription?.creditReviewRequired || Date.now() - Date.parse(current.startedAt) >= 23 * 3600000)) {
    await saveRefund(task, refund => { refund.state = 'review'; refund.error = 'refund_needs_reconciliation' })
    return 'review'
  }
  let result: StripeRefund
  try {
    result = current.refundId
      ? await stripe<StripeRefund>(`refunds/${current.refundId}`)
      : await stripe<StripeRefund>('refunds', {
        payment_intent: task.paymentIntent, amount: current.amount,
        'metadata[credit_refund]': current.id, 'metadata[engagement]': task.engagementId, 'metadata[invoice]': task.invoiceId,
      }, `portal-credit-refund-${current.id}`)
  } catch {
    // Retain the reservation and exact idempotency key after an unknown result.
    await saveRefund(task, refund => { refund.error = 'refund_status_unavailable' })
    return 'pending'
  }
  if (!/^re_[a-zA-Z0-9]+$/.test(result.id ?? '') || result.payment_intent !== task.paymentIntent || result.amount !== current.amount || result.currency !== 'usd' || result.metadata?.credit_refund !== current.id) {
    await saveRefund(task, refund => { refund.state = 'review'; refund.error = 'refund_result_mismatch' })
    return 'review'
  }
  const state = result.status === 'succeeded' ? 'sent' : result.status === 'pending' ? 'pending' : 'review'
  await saveRefund(task, (refund, e) => {
    if (refund.refundId && refund.refundId !== result.id) { refund.state = 'review'; refund.error = 'refund_result_mismatch'; return }
    refund.refundId = result.id
    refund.state = state
    refund.error = state === 'review' ? `refund_${result.status}` : undefined
    if (state === 'sent') audit(e, 'Stripe', `Unused phone credit refund confirmed for ${task.invoiceId}: ${current.amount} cents`)
  })
  return state
}

/** Only the protected billing job and authenticated refresh call this. Bound
 * request count as well as elapsed time: each Stripe request can take 20s. */
export async function processPhoneCreditRefunds(options: { engagementId?: string; maxAttempts?: number; budgetMs?: number } = {}) {
  const started = Date.now(), maxAttempts = Math.max(0, Math.min(10, options.maxAttempts ?? 1)), budget = options.budgetMs ?? 22000
  const result = { reservedSeconds: 0, attempted: 0, sent: 0, pending: 0, review: 0 }
  if (!maxAttempts || budget <= 0) return result
  result.reservedSeconds = await mutateLedger(entries => entries.filter(e => !options.engagementId || e.id === options.engagementId).reduce((sum, e) => sum + reservePhoneCreditRefunds(e), 0))
  const tasks: RefundTask[] = (await allEngagements()).filter(e => !options.engagementId || e.id === options.engagementId).flatMap(e =>
    e.invoices.flatMap(invoice => invoice.paymentIntent ? (invoice.subscriptionCredit?.refunds ?? []).filter(refund => refund.state === 'pending').map(refund => ({ engagementId: e.id, invoiceId: invoice.id, paymentIntent: invoice.paymentIntent!, refund })) : []))
    .sort((a, b) => (a.refund.checkedAt ?? '').localeCompare(b.refund.checkedAt ?? '') || a.refund.startedAt.localeCompare(b.refund.startedAt) || a.refund.id.localeCompare(b.refund.id))
  for (const task of tasks) {
    if (result.attempted >= maxAttempts || Date.now() - started >= budget) break
    result.attempted++
    result[await processRefund(task)]++
  }
  return result
}
