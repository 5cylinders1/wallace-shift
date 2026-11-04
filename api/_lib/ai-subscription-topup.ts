import { DemoError } from './demo-access.js'
import type { Identity } from './portal-auth.js'
import { accessible } from './portal-ledger.js'
import { audit, mutateLedger } from './portal-store.js'
import { charge } from './portal-stripe.js'
import { assertSubscriptionCharge } from './ai-subscription.js'
import { aiSubscriptionOffer } from '../../src/content/aiSubscriptionOffer.js'
import type { Invoice } from '../../src/client-portal/model.js'

/** Optional credits are one explicit purchase, never part of the renewal job. */
export async function purchasePhoneCredit(body: Record<string, unknown>, who: Identity, origin: string) {
  if (who.admin || body.consent !== true) throw new DemoError('client_authorization_required', 403)
  if (typeof body.requestId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.requestId)) throw new DemoError('invalid_fields', 400)
  const amount = aiSubscriptionOffer.extraPhoneMinuteCents * aiSubscriptionOffer.extraPhonePackMinutes
  if (body.total !== amount) throw new DemoError('quote_changed', 409)
  const snapshot = await mutateLedger(entries => {
    const e = accessible(entries, body.id, who)
    if (!e.aiSubscription || !e.signature || !e.paymentMethod) throw new DemoError('payment_not_ready', 409)
    const id = `${e.id}-phone-credit-${body.requestId}`
    let invoice = e.invoices.find(item => item.id === id)
    if (!invoice) {
      if (e.invoices.some(item => item.subscriptionCredit && ['open', 'processing'].includes(item.status))) throw new DemoError('payment_in_progress', 409)
      invoice = { id, due: new Date().toISOString().slice(0, 10), amount, fee: 0, status: 'open', subscriptionCredit: { phoneSeconds: aiSubscriptionOffer.extraPhonePackMinutes * 60 } } satisfies Invoice
      assertSubscriptionCharge(e, invoice)
      e.invoices.push(invoice)
      audit(e, who.email, `Authorized one-time ${aiSubscriptionOffer.extraPhonePackMinutes} extra phone minutes for ${(amount / 100).toFixed(2)} USD; no automatic top-up`)
    }
    return { e, invoice }
  })
  if (snapshot.invoice.status === 'paid') return { ok: true, status: 'succeeded' }
  const intent = await charge(snapshot.e, snapshot.invoice, origin, false, 0)
  return { ok: true, status: intent.status, ...(intent.status === 'requires_action' ? { clientSecret: intent.client_secret } : {}) }
}
