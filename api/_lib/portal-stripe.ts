import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { DemoError } from './demo-access.js'
import { allEngagements, audit, mutateLedger } from './portal-store.js'
import { automaticInvoice, feeFor, firstUnsettledInvoice, paymentConsent, scheduleConsent, type Engagement, type Invoice } from '../../src/client-portal/model.js'

type Params = Record<string, string | number | boolean>
type Card = { id: string; customer: string; type: string; card?: { funding: string; last4: string; brand: string; country?: string }; billing_details?: { address?: { country?: string; state?: string } } }
type Intent = { id: string; status: string; customer: string; amount: number; currency: string; client_secret?: string; metadata: { engagement: string; invoice: string; attempt: string }; latest_charge?: { receipt_url?: string; amount_refunded?: number; disputed?: boolean } }
export async function stripe<T>(path: string, params?: Params, key?: string, method = params ? 'POST' : 'GET'): Promise<T> {
  if (!process.env.STRIPE_SECRET_KEY) throw new DemoError('stripe_not_configured', 503)
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method, headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Stripe-Version': '2025-06-30.basil', ...(params ? { 'content-type': 'application/x-www-form-urlencoded' } : {}), ...(key ? { 'Idempotency-Key': key } : {}) },
    body: params ? new URLSearchParams(Object.entries(params).map(([k, v]): [string, string] => [k, String(v)])) : undefined,
    signal: AbortSignal.timeout(20000),
  })
  const data = await response.json() as T & { error?: { payment_intent?: Intent } }
  if (!response.ok) {
    if (data.error?.payment_intent) return data.error.payment_intent as T
    throw new DemoError('stripe_unavailable', 502)
  }
  return data
}
export function surchargeBps(card: Card): number {
  // Merchant must complete processor/network prerequisites and confirm applicable jurisdictions.
  if (process.env.PORTAL_SURCHARGE_APPROVED !== 'true' || card.type !== 'card' || card.card?.funding !== 'credit' || card.card.country !== 'US') return 0
  const address = card.billing_details?.address
  const states = (process.env.PORTAL_SURCHARGE_STATES ?? 'KS').split(',').map(s => s.trim().toUpperCase())
  if (address?.country !== 'US' || !address.state || !states.includes(address.state.toUpperCase())) return 0
  const cost = Number(process.env.PORTAL_CARD_COST_BPS ?? 0)
  const cap = Number(process.env.PORTAL_SURCHARGE_CAP_BPS ?? 300)
  return Number.isInteger(cost) && Number.isInteger(cap) ? Math.max(0, Math.min(300, cost, cap)) : 0
}
export async function setupCard(e: Engagement, origin: string): Promise<string> {
  if (!e.signature || !['issued', 'canceled'].includes(e.state)) throw new DemoError('signature_required', 409)
  if (e.invoices.some(i => i.status === 'processing' || (i.status === 'open' && i.attempt))) throw new DemoError('payment_in_progress', 409)
  if (!e.stripeCustomer) {
    const customer = await stripe<{ id: string }>('customers', { email: e.email, name: e.client, 'metadata[engagement]': e.id }, `portal-customer-${e.id}`)
    await mutateLedger(entries => { const current = entries.find(v => v.id === e.id)!; current.stripeCustomer = customer.id })
    e.stripeCustomer = customer.id
  }
  if (e.setup && e.setup.expiresAt > Date.now() / 1000) {
    const previous = await stripe<{ url: string | null; status: string }>(`checkout/sessions/${e.setup.id}`)
    if (previous.status === 'open' && previous.url) return previous.url
  }
  const session = await stripe<{ id: string; url: string; expires_at: number }>('checkout/sessions', {
    mode: 'setup', customer: e.stripeCustomer, 'payment_method_types[0]': 'card', billing_address_collection: 'required',
    'setup_intent_data[usage]': 'off_session', 'setup_intent_data[metadata][engagement]': e.id,
    'metadata[engagement]': e.id,
    'custom_text[submit][message]': 'Save your card securely. Return to Wallace Shift to review the exact total and authorize payment. Saving a card does not authorize a charge.',
    success_url: `${origin}/client-portal?engagement=${e.id}&setup={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}/client-portal?engagement=${e.id}`,
  }, `portal-setup-${e.id}-${randomUUID()}`)
  await mutateLedger(entries => { const current = entries.find(v => v.id === e.id)!; current.setup = { id: session.id, expiresAt: session.expires_at } })
  return session.url
}
export async function finishSetup(e: Engagement, sessionId: string): Promise<void> {
  if (!e.signature || e.setup?.id !== sessionId) throw new DemoError('invalid_setup', 400)
  const session = await stripe<{ status: string; customer: string; setup_intent: string }>(`checkout/sessions/${sessionId}`)
  if (session.status !== 'complete' || session.customer !== e.stripeCustomer) throw new DemoError('invalid_setup', 400)
  const setup = await stripe<{ status: string; customer: string; payment_method: string }>(`setup_intents/${session.setup_intent}`)
  if (setup.status !== 'succeeded' || setup.customer !== e.stripeCustomer) throw new DemoError('invalid_setup', 400)
  await mutateLedger(entries => {
    const current = entries.find(v => v.id === e.id)!
    if (current.setup?.id !== sessionId || current.invoices.some(i => (i.status === 'open' && i.attempt) || i.status === 'processing')) throw new DemoError('conflict_retry', 409)
    current.paymentMethod = setup.payment_method
    current.autopay = undefined // A changed card always requires fresh authorization.
    current.setup = undefined
    audit(current, e.email, 'Payment method saved; payment authorization required')
  })
}
export async function quote(e: Engagement, invoice?: Invoice) {
  if (!e.paymentMethod) throw new DemoError('card_required', 409)
  const card = await stripe<Card>(`payment_methods/${e.paymentMethod}`)
  if (card.customer !== e.stripeCustomer || card.type !== 'card') throw new DemoError('invalid_card', 409)
  const bps = surchargeBps(card)
  const amount = invoice?.amount ?? e.amount
  const fee = feeFor(amount, bps)
  return { bps, fee, total: amount + fee, invoiceId: invoice?.id, recurringTotal: e.amount + feeFor(e.amount, bps), initialTotal: e.initialPayment ? e.initialPayment.amount + feeFor(e.initialPayment.amount, bps) : undefined, card: `${card.card?.brand ?? 'Card'} ending ${card.card?.last4 ?? ''}` }
}
export async function reconcileIntent(intent: Intent): Promise<void> {
  await mutateLedger(entries => {
    const e = entries.find(v => v.id === intent.metadata.engagement)
    const invoice = e?.invoices.find(i => i.id === intent.metadata.invoice)
    if (!e || !invoice || !invoice.attempt || intent.metadata.attempt !== invoice.attempt.id || intent.customer !== e.stripeCustomer || intent.amount !== invoice.amount + invoice.attempt.fee || intent.currency !== 'usd') return
    if (invoice.paymentIntent && invoice.paymentIntent !== intent.id) return
    invoice.paymentIntent = intent.id
    invoice.fee = invoice.attempt.fee
    invoice.method = 'stripe'
    invoice.refunded = intent.latest_charge?.amount_refunded ?? invoice.refunded ?? 0
    invoice.disputed = intent.latest_charge?.disputed ?? invoice.disputed ?? false
    if (intent.status === 'succeeded' && invoice.status !== 'paid') {
      invoice.status = 'paid'; invoice.paidAt = new Date().toISOString()
      invoice.receiptUrl = intent.latest_charge?.receipt_url
      audit(e, 'Stripe', `Payment received for ${invoice.id}`)
    } else if (invoice.status !== 'paid') invoice.status = intent.status === 'canceled' ? 'open' : 'processing'
    if (intent.status === 'canceled') { invoice.attempt = undefined; invoice.paymentIntent = undefined }
  })
}
export async function charge(e: Engagement, invoice: Invoice, origin: string, automatic: boolean, expectedFee?: number): Promise<Intent> {
  if (!e.signature || !['issued', 'canceled'].includes(e.state) || !e.paymentMethod || (automatic && e.state !== 'issued')) throw new DemoError('payment_not_ready', 409)
  const currentQuote = await quote(e, invoice)
  if (expectedFee !== undefined && expectedFee !== currentQuote.fee) throw new DemoError('quote_changed', 409)
  const attempt = await mutateLedger(entries => {
    const current = entries.find(v => v.id === e.id)!
    const item = current.invoices.find(v => v.id === invoice.id)!
    if (!current.signature || !['issued', 'canceled'].includes(current.state) || (automatic && current.state !== 'issued') || !current.paymentMethod || current.paymentMethod !== e.paymentMethod || (item.status !== 'open' && item.status !== 'processing')) throw new DemoError('payment_not_ready', 409)
    if (firstUnsettledInvoice(current)?.id !== item.id) throw new DemoError('earlier_invoice_required', 409)
    if (automatic && (!automaticInvoice(current, item) || item.due > new Date().toISOString().slice(0, 10))) throw new DemoError('payment_not_ready', 409)
    if (automatic && (!current.autopay?.enabled || currentQuote.bps > current.autopay.feeBps || (current.initialPayment && current.autopay.agreementHash !== current.agreementHash))) throw new DemoError('authorization_required', 409)
    if (!item.attempt) {
      item.attempt = { id: randomUUID(), startedAt: new Date().toISOString(), method: current.paymentMethod, fee: currentQuote.fee, consent: automatic ? scheduleConsent(current, currentQuote.bps) : paymentConsent(item.amount, currentQuote.fee, e.cadence, false), automatic, origin }
      item.status = 'processing'
      audit(current, automatic ? 'Authorized automatic payment' : e.email, `Payment attempt reserved for ${item.id}`)
    }
    return { ...item.attempt, paymentIntent: item.paymentIntent }
  })
  let intent: Intent
  if (attempt.paymentIntent) intent = await stripe<Intent>(`payment_intents/${attempt.paymentIntent}?expand[]=latest_charge`)
  else {
    // Stripe may prune idempotency keys after 24h. Never recreate an uncertain charge after that window.
    if (Date.now() - Date.parse(attempt.startedAt) > 23 * 3600000) throw new DemoError('payment_needs_reconciliation', 409)
    intent = await stripe<Intent>('payment_intents', {
      amount: invoice.amount + attempt.fee, currency: 'usd', customer: e.stripeCustomer!, payment_method: attempt.method,
      'payment_method_types[0]': 'card', confirm: true, off_session: attempt.automatic,
      return_url: `${attempt.origin}/client-portal?engagement=${e.id}`, receipt_email: e.email,
      description: `${e.title} / ${invoice.id} / service ${invoice.amount} cents; surcharge ${attempt.fee} cents`,
      'metadata[engagement]': e.id, 'metadata[invoice]': invoice.id, 'metadata[attempt]': attempt.id, 'expand[0]': 'latest_charge',
    }, `portal-charge-${attempt.id}`)
  }
  await reconcileIntent(intent)
  return intent
}
export async function refreshPayments(e: Engagement): Promise<void> {
  for (const invoice of e.invoices.filter(i => i.paymentIntent && (i.status === 'processing' || i.status === 'paid'))) {
    const intent = await stripe<Intent>(`payment_intents/${invoice.paymentIntent}?expand[]=latest_charge`)
    await reconcileIntent(intent)
  }
}
export async function resetFailedPayment(e: Engagement, invoice: Invoice): Promise<void> {
  if (!invoice.paymentIntent) throw new DemoError('payment_needs_reconciliation', 409)
  const intent = await stripe<Intent>(`payment_intents/${invoice.paymentIntent}`)
  if (!['requires_payment_method', 'requires_action', 'canceled'].includes(intent.status)) throw new DemoError('payment_in_progress', 409)
  if (intent.status !== 'canceled') await stripe(`payment_intents/${intent.id}/cancel`, {}, `portal-cancel-${intent.id}`)
  await reconcileIntent({ ...intent, status: 'canceled' })
  await mutateLedger(entries => { const current = entries.find(v => v.id === e.id)!; current.autopay = undefined })
}
export function verifyWebhook(raw: string, header: string, secret: string, now = Date.now()): void {
  const parts = header.split(',').map(part => part.split('='))
  const timestamp = parts.find(([key]) => key === 't')?.[1] ?? ''
  if (!secret || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) throw new DemoError('invalid_signature', 400)
  const expected = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest()
  if (!parts.some(([key, value]) => key === 'v1' && /^[a-f0-9]{64}$/.test(value) && timingSafeEqual(expected, Buffer.from(value, 'hex')))) throw new DemoError('invalid_signature', 400)
}
export async function handleStripeEvent(raw: string, signature: string): Promise<void> {
  verifyWebhook(raw, signature, process.env.STRIPE_WEBHOOK_SECRET ?? '')
  const event = JSON.parse(raw) as { type: string; data: { object: { id: string; payment_intent?: string } } }
  if (!event.type.startsWith('payment_intent.') && !event.type.startsWith('charge.')) return
  const id = event.type.startsWith('payment_intent.') ? event.data.object.id : event.data.object.payment_intent
  if (!id || !/^pi_[a-zA-Z0-9]+$/.test(id)) return
  // Fetch current Stripe state to make replays and out-of-order delivery harmless.
  const intent = await stripe<Intent>(`payment_intents/${id}?expand[]=latest_charge`)
  const ledger = await allEngagements()
  if (!ledger.some(e => e.id === intent.metadata.engagement)) return
  await reconcileIntent(intent)
}
