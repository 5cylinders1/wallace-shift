import { randomUUID } from 'node:crypto'
import { DemoError, normalizeDemoEmail } from './demo-access.js'
import { hash, type Identity } from './portal-auth.js'
import { audit } from './portal-store.js'
import { starterAgreement } from '../../src/client-portal/agreement.js'
import { SIGNATURE_CONSENT, createInvoice, nextDueDate, visibleToClient, type Cadence, type Engagement, type OfflineMethod } from '../../src/client-portal/model.js'
import { changeAiSubscription, generateSubscriptionInvoice } from './ai-subscription.js'
import { subscriptionView } from '../../src/client-portal/ai-subscription.js'

export function field(value: unknown, max = 200): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || [...value].some(c => c.charCodeAt(0) < 32 && !['\n', '\r', '\t'].includes(c))) throw new DemoError('invalid_fields', 400)
  return value.trim()
}
function dateField(value: unknown): string {
  const date = field(value, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new DemoError('invalid_date', 400)
  return date
}
export function draft(body: Record<string, unknown>, actor: string): Engagement {
  const amount = Number(body.amount)
  const cadence = body.cadence as Cadence
  if (!Number.isSafeInteger(amount) || amount < 50 || amount > 100_000_000 || !['once', 'monthly', 'quarterly', 'six_months', 'yearly'].includes(cadence)) throw new DemoError('invalid_amount', 400)
  const e: Engagement = {
    id: randomUUID(), revision: 1, createdAt: new Date().toISOString(), client: field(body.client), email: normalizeDemoEmail(body.email), title: field(body.title),
    scope: field(body.scope, 10000), exclusions: field(body.exclusions, 5000), delivery: field(body.delivery, 5000), amount, cadence,
    firstDue: dateField(body.firstDue), endDate: body.endDate ? dateField(body.endDate) : '', state: 'draft', agreement: '', agreementHash: '', invoices: [], audit: [],
  }
  if (body.initialPayment !== undefined) {
    const initial = body.initialPayment as Record<string, unknown> | null
    if (cadence === 'once' || !initial || typeof initial !== 'object' || Array.isArray(initial) || !Number.isSafeInteger(initial.amount) || Number(initial.amount) < 50 || Number(initial.amount) > 100_000_000) throw new DemoError('invalid_amount', 400)
    e.initialPayment = { amount: Number(initial.amount), due: dateField(initial.due) }
    if (e.initialPayment.due < new Date().toISOString().slice(0, 10) || e.initialPayment.due > e.firstDue) throw new DemoError('invalid_initial_date', 400)
  }
  if (e.firstDue < new Date().toISOString().slice(0, 10) || (e.endDate && e.endDate < e.firstDue)) throw new DemoError('invalid_date', 400)
  e.agreement = starterAgreement(e, 'Kansas')
  e.agreementHash = hash(e.agreement)
  audit(e, actor, 'Draft created')
  return e
}
export function canAccess(e: Engagement, who: Identity): boolean {
  return (!who.engagementId || who.engagementId === e.id) && (who.admin || (e.email === who.email && visibleToClient(e)))
}
export function accessible(entries: Engagement[], id: unknown, who: Identity): Engagement {
  const e = entries.find(v => v.id === id && canAccess(v, who))
  if (!e) throw new DemoError('not_found', 404)
  return e
}
export function changeLedger(entries: Engagement[], body: Record<string, unknown>, who: Identity): void {
  const e = accessible(entries, body.id, who)
  const action = body.action
  if (['archive', 'restore', 'issue', 'complete', 'record-payment', 'void'].includes(String(action)) && !who.admin) throw new DemoError('forbidden', 403)
  if (e.aiSubscription && !e.archivedAt && (action === 'archive' || action === 'complete')) {
    const expiresAt = subscriptionView(e.aiSubscription).accessExpiresAt
    if (expiresAt && Date.parse(expiresAt) > Date.now()) throw new DemoError('subscription_service_active', 409)
  }
  if (action === 'archive') {
    if (e.archivedAt) return
    if (e.invoices.some(i => i.status === 'processing' || (i.status === 'open' && i.attempt))) throw new DemoError('payment_in_progress', 409)
    e.archivedAt = new Date().toISOString()
    if (e.autopay) e.autopay.enabled = false
    if (e.aiSubscription) e.aiSubscription.renewalAuthorized = false
    audit(e, who.email, 'Agreement archived and automatic billing stopped')
    return
  }
  if (action === 'restore') {
    if (!e.archivedAt) return
    delete e.archivedAt
    if (e.aiSubscription) {
      e.aiSubscription.renewalAuthorized = false
      if (e.autopay) e.autopay.enabled = false
    }
    audit(e, who.email, 'Agreement restored from archive')
    return
  }
  if (e.archivedAt) throw new DemoError('agreement_archived', 409)
  if (action === 'issue' && who.admin) {
    if (e.state !== 'draft') throw new DemoError('already_issued', 409)
    e.state = 'issued'; e.issuedAt = new Date().toISOString()
    if (e.aiSubscription) { audit(e, who.email, 'Subscription agreement issued; setup and trial authorization pending'); return }
    if (e.initialPayment) e.invoices.push(createInvoice(e, e.initialPayment.due, 'initial'))
    e.invoices.push(createInvoice(e, e.firstDue, e.cadence === 'once' ? undefined : 'recurring'))
    e.nextDue = nextDueDate(e.firstDue, e.cadence, e.firstDue)
    audit(e, who.email, e.initialPayment ? 'Agreement issued with initial and recurring invoices' : 'Agreement issued and first invoice created')
    return
  }
  if (action === 'sign' && !who.admin) {
    if (e.state !== 'issued' || e.signature) throw new DemoError('already_signed', 409)
    if (body.consent !== true || body.agreementHash !== e.agreementHash) throw new DemoError('agreement_changed', 409)
    e.signature = { name: field(body.name, 160), email: who.email, at: new Date().toISOString(), hash: e.agreementHash, consent: SIGNATURE_CONSENT }
    audit(e, who.email, 'Agreement signed')
    return
  }
  if (action === 'cancel' && e.state !== 'complete' && e.state !== 'canceled') {
    if (e.aiSubscription) { changeAiSubscription(entries, body, who); return }
    // Revokes future authorization; processing charges must still reconcile.
    e.state = 'canceled'; e.nextDue = undefined
    if (e.autopay) e.autopay.enabled = false
    for (const invoice of e.invoices) if (invoice.status === 'open' && !invoice.attempt && invoice.due > new Date().toISOString().slice(0, 10)) invoice.status = 'void'
    audit(e, who.email, 'Canceled future service and automatic payments')
    return
  }
  if (action === 'complete' && who.admin) {
    if (!e.signature || e.state !== 'issued' || e.invoices.some(i => i.status !== 'paid' && i.status !== 'void')) throw new DemoError('completion_blocked', 409)
    e.state = 'complete'; e.nextDue = undefined
    if (e.autopay) e.autopay.enabled = false
    if (e.aiSubscription) e.aiSubscription.renewalAuthorized = false
    audit(e, who.email, 'Engagement completed')
    return
  }
  const invoice = e.invoices.find(i => i.id === body.invoiceId)
  if (!invoice || invoice.status !== 'open' || invoice.attempt) throw new DemoError('invoice_not_open', 409)
  if (action === 'void' && who.admin) {
    invoice.status = 'void'; audit(e, who.email, `Voided ${invoice.id}: ${field(body.reference, 300)}`); return
  }
  if (!e.signature) throw new DemoError('signature_required', 409)
  if (e.cadence !== 'once') throw new DemoError('automatic_payments_required', 409)
  const method = body.method as OfflineMethod
  if (!['cash', 'check', 'zelle'].includes(method)) throw new DemoError('invalid_method', 400)
  if (action === 'report-payment' && !who.admin && e.state === 'issued') {
    invoice.method = method; invoice.reportedAt = new Date().toISOString(); invoice.reference = field(body.reference, 300)
    audit(e, who.email, `Reported ${method} payment for ${invoice.id}; awaiting verification`); return
  }
  if (action === 'record-payment' && who.admin) {
    if (body.confirmed !== true || body.amount !== invoice.amount) throw new DemoError('receipt_confirmation_required', 400)
    invoice.method = method; invoice.status = 'paid'; invoice.fee = 0; invoice.paidAt = new Date().toISOString(); invoice.receivedBy = who.email; invoice.reference = field(body.reference, 300)
    audit(e, who.email, `Confirmed ${method} receipt for ${invoice.id}`); return
  }
  throw new DemoError('forbidden', 403)
}
export function generateDueInvoices(entries: Engagement[], today: string): number {
  let count = 0
  for (const e of entries) {
    if (e.aiSubscription) { count += generateSubscriptionInvoice(e, today); continue }
    if (e.archivedAt || e.state !== 'issued' || !e.signature || !e.autopay?.enabled || (e.initialPayment && e.autopay.agreementHash !== e.agreementHash) || e.cadence === 'once' || !e.nextDue || e.nextDue > today || (e.endDate && (e.nextDue > e.endDate || today > e.endDate))) continue
    // Do not compound failed collections. Resolve the outstanding invoice first.
    if (e.invoices.some(i => i.status === 'open' || i.status === 'processing')) continue
    if (!e.invoices.some(i => i.kind !== 'initial' && i.due === e.nextDue)) { e.invoices.push(createInvoice(e, e.nextDue, 'recurring')); count++ }
    e.nextDue = nextDueDate(e.nextDue, e.cadence, e.firstDue)
    audit(e, 'Billing schedule', 'Recurring invoice generated')
  }
  return count
}
