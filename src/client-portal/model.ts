import type { AiQualificationAnswers } from '../content/aiOffer.js'
import { subscriptionConsent, type AiSubscription, type SubscriptionPeriod } from './ai-subscription.js'

export type Cadence = 'once' | 'monthly' | 'quarterly' | 'six_months' | 'yearly'
export type OfflineMethod = 'cash' | 'check' | 'zelle'
export type InvoiceEmail = {
  id: string; state: 'pending' | 'sent' | 'failed' | 'review'; startedAt: string
  sentAt?: string; providerId?: string
  access?: { hash: string; expiresAt: string; usedAt?: string }
  /** Server-only immutable payload: retries must send exactly the same message. */
  payload?: { from: string; to: string[]; reply_to: string; subject: string; html: string; text: string; attachments: { filename: string; content: string }[] }
}
export type Invoice = {
  id: string; due: string; amount: number; fee: number
  subscriptionPeriod?: SubscriptionPeriod
  subscriptionCredit?: {
    phoneSeconds: number; appliedAt?: string
    refunds?: { id: string; seconds: number; amount: number; state: 'pending' | 'sent' | 'review'; startedAt: string; checkedAt?: string; refundId?: string; error?: string }[]
  }
  kind?: 'initial' | 'recurring'
  status: 'open' | 'processing' | 'paid' | 'void'
  method?: OfflineMethod | 'stripe'; reportedAt?: string; reference?: string
  paidAt?: string; receivedBy?: string; paymentIntent?: string; receiptUrl?: string
  refunded?: number; disputed?: boolean
  attempt?: { id: string; startedAt: string; method: string; fee: number; consent: string; automatic: boolean; origin: string }
}
export type Engagement = {
  id: string; revision: number; createdAt: string; client: string; email: string; title: string
  scope: string; exclusions: string; delivery: string; amount: number; cadence: Cadence
  firstDue: string; endDate: string; state: 'draft' | 'issued' | 'complete' | 'canceled'
  archivedAt?: string
  aiSubscription?: AiSubscription
  /** Optional setup payment. amount/firstDue remain the recurring terms for existing records. */
  initialPayment?: { amount: number; due: string }
  agreement: string; agreementHash: string; issuedAt?: string
  issueEmail?: InvoiceEmail
  selfService?: {
    setupOrigin?: string
    orderId: string; fingerprint: string; packageId: 'inquiry' | 'notes' | 'assistant'; offerVersion: string; buyerName: string
    answers: AiQualificationAnswers
    ownerNotification?: {
      id: string; state: 'pending' | 'sent' | 'failed' | 'review'; startedAt: string
      sentAt?: string; providerId?: string; attemptToken?: string; leaseUntil?: number
      payload?: { from: string; to: string[]; subject: string; text: string }
    }
  }
  signature?: { name: string; email: string; at: string; hash: string; consent: string }
  invoices: Invoice[]; nextDue?: string; stripeCustomer?: string
  setup?: { id: string; expiresAt: number; completed?: boolean }; paymentMethod?: string
  autopay?: { enabled: boolean; consent: string; at: string; feeBps: number; agreementHash?: string }
  audit: { at: string; actor: string; action: string }[]
}
export function visibleToClient(e: Engagement): boolean {
  return !e.archivedAt && e.state !== 'draft'
}
export const cadenceLabel: Record<Cadence, string> = { once: 'One time', monthly: 'Monthly', quarterly: 'Every 3 months', six_months: 'Every 6 months', yearly: 'Yearly' }
export const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
export const SIGNATURE_CONSENT = 'I have read this agreement, can save or print a copy, and consent to electronic records. I am authorized to sign for this client. By typing my full name and selecting Sign agreement, I intend to sign this agreement electronically.'
export function paymentConsent(amount: number, fee: number, cadence: Cadence, automatic: boolean): string {
  return `I authorize Wallace Shift LLC to charge ${money(amount + fee)} (${money(amount)} services and ${money(fee)} eligible credit card surcharge) ${automatic && cadence !== 'once' ? `${cadenceLabel[cadence].toLowerCase()} on the invoice due dates in my agreement until I cancel future service or the agreement ends` : 'for this invoice only'}. Cancellation stops future billing and automatic attempts, but does not reverse an in-flight payment or remove amounts already owed. Cash, check, and Zelle have no surcharge and are available for one-time invoices. No debit or prepaid card surcharge applies. Any increase requires new authorization; a reduced or waived fee may lower the total.`
}
export const feeFor = (amount: number, bps: number) => Math.round(amount * bps / 10000)
export function scheduleConsent(e: Engagement, bps: number): string {
  if (e.aiSubscription) return subscriptionConsent(e.aiSubscription)
  const describe = (amount: number) => `${money(amount + feeFor(amount, bps))} (${money(amount)} services and ${money(feeFor(amount, bps))} eligible credit card surcharge)`
  const initial = e.initialPayment && e.invoices.some(i => i.kind === 'initial' && ['open', 'processing'].includes(i.status))
    ? `one initial payment of ${describe(e.initialPayment.amount)} due ${e.initialPayment.due}, and ` : ''
  return `I authorize Wallace Shift LLC to charge ${initial}${describe(e.amount)} ${cadenceLabel[e.cadence].toLowerCase()} beginning ${e.firstDue}${e.endDate ? ` through ${e.endDate}, inclusive. No automatic recurring charges will be attempted after that date` : ' until I cancel future service'}. These are separate invoices, even if their dates match. Overdue authorized amounts may be collected when authorization is completed. Cancellation stops future billing and automatic attempts, but does not reverse an in-flight payment or remove amounts already owed. Debit and prepaid cards have no surcharge. Any increase requires new authorization; a reduced or waived fee may lower the total.`
}
export function automaticInvoice(e: Engagement, invoice: Invoice, today = new Date().toISOString().slice(0, 10)): boolean {
  if (e.aiSubscription) return !e.archivedAt && e.state === 'issued' && !e.aiSubscription.canceledAt && Boolean(e.aiSubscription.trialEnd && today >= e.aiSubscription.trialEnd && invoice.subscriptionPeriod)
  return !e.archivedAt && e.cadence !== 'once' && e.state === 'issued' && (invoice.kind === 'initial' || !e.endDate || today <= e.endDate)
}
export function firstUnsettledInvoice(e: Engagement, recurringOnly = false): Invoice | undefined {
  return e.invoices.filter(i => (i.status === 'open' || i.status === 'processing') && (!recurringOnly || !e.aiSubscription || i.subscriptionPeriod)).sort((a, b) => a.due.localeCompare(b.due) || Number(b.kind === 'initial') - Number(a.kind === 'initial'))[0]
}
/** Keep the original day of month (Jan 31 -> Feb 28 -> Mar 31). UTC dates only. */
export function nextDueDate(current: string, cadence: Cadence, anchor: string): string | undefined {
  if (cadence === 'once') return undefined
  const months = cadence === 'monthly' ? 1 : cadence === 'quarterly' ? 3 : cadence === 'six_months' ? 6 : 12
  const date = new Date(`${current}T12:00:00Z`)
  const desiredDay = Number(anchor.slice(8, 10))
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 12))
  const last = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate()
  next.setUTCDate(Math.min(desiredDay, last))
  return next.toISOString().slice(0, 10)
}
export function createInvoice(engagement: Engagement, due: string, kind?: Invoice['kind']): Invoice {
  return { id: `${engagement.id}${kind === 'initial' ? '-initial' : ''}-${due}`, due, amount: kind === 'initial' ? engagement.initialPayment!.amount : engagement.amount, ...(kind ? { kind } : {}), fee: 0, status: 'open' }
}
