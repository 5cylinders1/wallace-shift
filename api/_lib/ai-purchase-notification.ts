import { randomUUID } from 'node:crypto'
import { ownerEmail } from './portal-auth.js'
import { allEngagements, audit, mutateLedger } from './portal-store.js'
import { money, type Engagement } from '../../src/client-portal/model.js'
import { workflowOptions, roleOptions, revenueOptions, weeklyHoursOptions, impactOptions, aiExperienceOptions, aiBarrierOptions, budgetOptions, timingOptions } from '../../src/content/aiOffer.js'

type Notification = NonNullable<NonNullable<Engagement['selfService']>['ownerNotification']>
const retryWindow = 23 * 3600000
const label = (options: readonly { value: string; label: string }[], value: string) => options.find(option => option.value === value)?.label ?? value

function paidProject(e: Engagement): boolean {
  return Boolean(!e.archivedAt && e.selfService && e.signature && e.signature.hash === e.agreementHash && e.cadence === 'once'
    && e.invoices.length === 1 && e.invoices[0].status === 'paid' && e.invoices[0].method === 'stripe'
    && e.invoices[0].paymentIntent && !e.invoices[0].refunded && !e.invoices[0].disputed)
}

function setupProject(e: Engagement): boolean {
  return Boolean(!e.archivedAt && e.selfService && e.aiSubscription && !e.aiSubscription.canceledAt)
}

function payload(e: Engagement, kind: 'paid' | 'setup'): Notification['payload'] {
  const from = process.env.CONTACT_FROM_EMAIL?.trim()
  if (!from || /[\r\n]/.test(from)) return undefined
  const invoice = e.invoices[0]
  const origin = kind === 'setup' ? e.selfService?.setupOrigin : invoice.attempt?.origin
  if (!origin) return undefined
  let portal: URL
  try {
    portal = new URL('/client-portal', origin)
    if (portal.protocol !== 'https:' && !(portal.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(portal.hostname))) return undefined
    portal.searchParams.set('engagement', e.id)
  } catch { return undefined }
  let to: string
  try { to = ownerEmail() } catch { return undefined }
  const purchase = e.selfService!
  const a = purchase.answers
  if (kind === 'setup') return {
    from, to: [to], subject: `AI service setup requested: ${e.client.replace(/[\r\n\t]+/g, ' ')}`,
    text: ['A verified client requested AI chatbot and phone agent setup. No trial or payment has started.', '',
      `Client: ${e.client}`, `Contact: ${purchase.buyerName} <${e.email}>`,
      `Selected payment interval: ${e.aiSubscription!.plan}`, `Amount after the free month: ${money(e.amount)}`,
      'Connect the client workspace in Reply365, install the chatbot on their existing site, and test an incoming AI call.',
      'Only publish readiness after both services work. The client then confirms their exact free-month and payment dates in the portal.', '',
      'Review the setup request, agreement status, and saved quiz answers:', portal.href,
      'Sign in with the owner account. This link grants no access by itself.', '', 'Scope:', e.scope].join('\n'),
  }
  return {
    from, to: [to], subject: `Paid AI project: ${e.title.replace(/[\r\n\t]+/g, ' ')}`,
    text: [
      'A client purchased a self service package. The agreement is signed and Stripe has confirmed payment.', '',
      `Project: ${e.title}`, `Client: ${e.client}`, `Contact: ${purchase.buyerName} <${e.email}>`,
      `Service amount: ${money(invoice.amount)}`, `Card surcharge: ${money(invoice.fee)}`,
      `Paid total: ${money(invoice.amount + invoice.fee)}`, `Paid at: ${invoice.paidAt}`,
      `Order: ${purchase.orderId}`, `Invoice: ${invoice.id}`, `Offer version: ${purchase.offerVersion}`, '',
      'Open the project, signed agreement, payment record, and saved quiz answers:', portal.href,
      'Sign in with your owner account. This link does not grant access by itself.', '',
      'Purchased scope:', e.scope, '', 'Exclusions:', e.exclusions, '', 'Delivery:', e.delivery, '',
      'Quiz answers:',
      `Challenges: ${a.workflows.map(value => label(workflowOptions, value)).join('; ')}`,
      `Decision authority: ${label(roleOptions, a.role)}`,
      ...(a.approverAvailability ? [`Approver participation: ${a.approverAvailability}`] : []),
      `Annual revenue: ${label(revenueOptions, a.revenue)}`,
      `Weekly time: ${label(weeklyHoursOptions, a.weeklyHours)}`,
      `Impact: ${a.impacts.map(value => label(impactOptions, value)).join('; ')}`,
      ...(a.impacts.includes('other') && a.impactDetails?.trim() ? [`Other consequence: ${a.impactDetails}`] : []),
      `AI experience: ${label(aiExperienceOptions, a.aiExperience)}`,
      `Barriers: ${a.aiBarriers.map(value => label(aiBarrierOptions, value)).join('; ') || 'None selected'}`,
      ...(a.currentTools?.trim() ? [`Tools: ${a.currentTools}`] : []), `Additional context: ${a.workflowDetails || 'Not provided'}`,
      `Budget: ${label(budgetOptions, a.budget)}`, `Timing: ${label(timingOptions, a.timing)}`,
    ].join('\n'),
  }
}

/** A paid engagement is the durable project handoff. Email is a retryable notice only.
 * Reserve one immutable payload/key after verified payment, never from a browser redirect. */
export async function notifyAiPurchase(id: string): Promise<void> { return notifyRecord(id, 'paid') }
export async function notifyAiSetup(id: string): Promise<void> { return notifyRecord(id, 'setup') }
async function notifyRecord(id: string, kind: 'paid' | 'setup'): Promise<void> {
  const attempt = await mutateLedger(entries => {
    const e = entries.find(entry => entry.id === id)
    if (!e || !(kind === 'setup' ? setupProject(e) : paidProject(e))) return null
    const purchase = e.selfService!
    if (!purchase.ownerNotification) {
      purchase.ownerNotification = { id: randomUUID(), state: 'pending', startedAt: new Date().toISOString() }
      audit(e, 'Self service checkout', kind === 'setup' ? 'AI setup request saved; owner notification queued' : 'Paid project saved; owner notification queued')
    }
    const notice = purchase.ownerNotification
    if (notice.state === 'sent' || notice.state === 'review' || (notice.leaseUntil ?? 0) > Date.now()) return null
    if (Date.now() - Date.parse(notice.startedAt) > retryWindow) {
      notice.state = 'review'
      audit(e, 'Self service checkout', 'Owner notification needs review; automatic email retry window ended')
      return null
    }
    notice.payload ??= payload(e, kind)
    if (!notice.payload || !process.env.RESEND_API_KEY?.trim()) { notice.state = 'failed'; return null }
    notice.state = 'pending'; notice.attemptToken = randomUUID(); notice.leaseUntil = Date.now() + 20000
    return structuredClone(notice)
  })
  if (!attempt?.payload) return
  let providerId: string | undefined
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`, 'content-type': 'application/json', 'idempotency-key': `ai-purchase/${attempt.id}` },
      body: JSON.stringify(attempt.payload), signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error('Notification unavailable')
    const result = await response.json() as { id?: unknown }
    if (typeof result.id !== 'string' || !result.id || result.id.length > 200) throw new Error('Notification unavailable')
    providerId = result.id
  } catch { /* The paid project remains saved, with its exact payload/key available for retry. */ }
  await mutateLedger(entries => {
    const e = entries.find(entry => entry.id === id)
    const notice = e?.selfService?.ownerNotification
    if (!e || !notice || notice.attemptToken !== attempt.attemptToken || notice.state === 'sent') return
    notice.state = providerId ? 'sent' : 'failed'
    delete notice.attemptToken; delete notice.leaseUntil
    if (providerId) { notice.providerId = providerId; notice.sentAt = new Date().toISOString() }
    audit(e, 'Self service checkout', `${kind === 'setup' ? 'AI setup' : 'Paid project'} notification ${providerId ? 'accepted by email provider' : 'pending retry'}`)
  })
}

/** Called by the existing protected billing cron. Bounded work avoids starving billing. */
export async function retryAiPurchaseNotifications(budgetMs = 16000): Promise<void> {
  if (budgetMs < 9000) return
  const deadline = Date.now() + budgetMs
  const entries = await allEngagements()
  const candidates = entries.filter(e => (paidProject(e) || setupProject(e)) && !['sent', 'review'].includes(e.selfService?.ownerNotification?.state ?? ''))
    .sort((a, b) => (a.selfService?.ownerNotification?.startedAt ?? a.createdAt).localeCompare(b.selfService?.ownerNotification?.startedAt ?? b.createdAt))
  for (const e of candidates.slice(0, 2)) {
    if (Date.now() + 8000 >= deadline) break
    try { await (e.aiSubscription ? notifyAiSetup(e.id) : notifyAiPurchase(e.id)) } catch { /* A future cron run can retry the stored project. */ }
  }
}
