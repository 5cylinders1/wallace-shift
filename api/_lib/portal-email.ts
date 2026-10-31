import { randomBytes, randomUUID } from 'node:crypto'
import { DemoError } from './demo-access.js'
import { accessible, changeLedger } from './portal-ledger.js'
import { audit, mutateLedger } from './portal-store.js'
import { hash, type Identity } from './portal-auth.js'
import { cadenceLabel, money, type Engagement, type InvoiceEmail } from '../../src/client-portal/model.js'

const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const line = (value: string) => value.replace(/[\r\n\t]+/g, ' ')

export function invoiceEmailPayload(e: Engagement, origin: string, from: string, replyTo: string, accessToken?: string): NonNullable<InvoiceEmail['payload']> {
  const portal = new URL('/client-portal', origin)
  portal.searchParams.set('engagement', e.id)
  if (accessToken) portal.hash = `access=${accessToken}`
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(portal.hostname)
  const heading = 'Your agreement and invoices are ready'
  const schedule = e.cadence === 'once' ? 'This is a one-time invoice.' : `Recurring service: ${money(e.amount)} ${cadenceLabel[e.cadence].toLowerCase()}, starting ${e.firstDue}${e.endDate ? ` through ${e.endDate}, inclusive` : ' until canceled'}. ${e.initialPayment ? 'The initial payment is separate from recurring charges. ' : ''}Automatic Stripe payments require your separate authorization.`
  const fee = 'The listed amounts are service amounts. Any eligible credit card surcharge is shown separately for your approval before payment. Debit and prepaid cards have no surcharge.'
  const method = e.cadence === 'once' ? 'After signing, choose Stripe, cash, check, or Zelle in the portal. Offline payments are credited after receipt is confirmed.' : 'After signing, save your card securely with Stripe, then review and authorize the payment schedule. Signing alone does not authorize a charge.'
  const notice = local ? 'LOCAL TEST: This portal link works only on the computer running the Wallace Shift development server.' : ''
  const invoiceText = (i: Engagement['invoices'][number]) => `WALLACE SHIFT LLC\nINVOICE\n\nInvoice: ${i.id}\nIssued: ${e.issuedAt?.slice(0, 10)}\nClient: ${e.client}\nProject: ${e.title}\nType: ${i.kind === 'initial' ? 'Initial payment' : i.kind === 'recurring' ? 'Recurring service' : 'One time'}\nDue: ${i.due}\nService amount (USD): ${money(i.amount)}\n\nScope:\n${e.scope}\n\n${fee}\n\nReview and sign the agreement before payment. Sign in with ${e.email}:\n${portal.href}\n${notice}`
  const text = `WALLACE SHIFT LLC\n\n${heading}\n\nHello ${e.client},\n\nYour agreement and invoices for ${e.title} are ready. Review and sign your agreement before making the first payment.\n\n${e.invoices.map(invoiceText).join('\n\n---\n\n')}\n\n${schedule}\n\n${method}\n\nView your agreement and invoices: ${portal.href}\nThis private link signs you in and opens your agreement. It expires in 7 days and can be used once. Do not forward it. If it has expired, sign in with ${e.email} to continue.\n\nCopies of the invoices and unsigned agreement are attached as text files. Reply to this email with any questions.\n\n${notice}`
  const invoices = e.invoices.map(i => `<div style="border-top:1px solid #c7d1d7;padding:18px 0"><h2 style="font-size:18px;margin:0 0 8px">${i.kind === 'initial' ? 'Initial payment' : i.kind === 'recurring' ? 'Recurring service' : 'Invoice'}: ${money(i.amount)}</h2><p style="margin:0">Due ${escape(i.due)}</p><p style="margin:6px 0 0;font-size:12px;overflow-wrap:anywhere;word-break:break-all">Invoice ${escape(i.id)}</p></div>`).join('')
  const html = `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${heading}</title></head><body style="margin:0;background:#edf1f2;color:#121a21;font-family:Arial,sans-serif;font-size:16px;line-height:1.6"><div style="display:none;max-height:0;overflow:hidden">Review your invoices and sign your service agreement before payment.</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff"><tr><td style="background:#080d12;color:white;padding:22px 24px;font-weight:bold;letter-spacing:2px">WALLACE SHIFT</td></tr><tr><td style="padding:24px"><h1 style="font-size:26px;line-height:1.25;margin:0 0 20px">${heading}</h1>${notice ? `<p style="background:#fff3cd;padding:12px">${notice}</p>` : ''}<p>Hello ${escape(e.client)},</p><p>Your agreement and invoices for <strong>${escape(e.title)}</strong> are ready. Review and sign your agreement before making the first payment.</p>${invoices}<p>${escape(schedule)}</p><p style="color:#52616b">${fee}</p><p>${method}</p><p style="margin:24px 0"><a href="${escape(portal.href)}" style="display:inline-block;background:#175c99;color:#fff;text-decoration:none;padding:14px 20px;border-radius:6px;font-weight:bold">Review and sign your agreement</a></p><p>This private link signs you in and opens your agreement. It expires in 7 days and can be used once. Do not forward it. If it has expired, sign in with <strong>${escape(e.email)}</strong> to continue.</p><p style="font-size:14px">Copies of the invoices and unsigned agreement are attached as text files. Reply to this email with any questions.</p><p style="font-size:12px;overflow-wrap:anywhere;word-break:break-all">Portal: <a href="${escape(portal.href)}">${escape(portal.href)}</a></p><p style="font-size:12px;color:#52616b">Wallace Shift LLC</p></td></tr></table></td></tr></table></body></html>`
  return { from, to: [e.email], reply_to: replyTo, subject: `${local ? '[Local test] ' : ''}Wallace Shift: agreement and invoices for ${line(e.title)}`, html, text,
    attachments: [...e.invoices.map(i => ({ filename: `invoice-${i.id}.txt`, content: Buffer.from(invoiceText(i)).toString('base64') })), { filename: `agreement-${e.id}.txt`, content: Buffer.from(`${e.agreement}\n\nUNSIGNED COPY\nSign in to review and sign: ${portal.href}`).toString('base64') }],
  }
}

/** Issue and reserve one email atomically; delivery happens only after the ledger commits. */
export async function issueAndEmail(id: unknown, who: Identity, origin: string, retryOnly = false): Promise<InvoiceEmail['state']> {
  if (!who.admin) throw new DemoError('forbidden', 403)
  const key = process.env.RESEND_API_KEY?.trim()
  const from = process.env.CONTACT_FROM_EMAIL?.trim()
  if (!key || !from || /[\r\n]/.test(from)) throw new DemoError('invoice_email_not_configured', 503)
  const email = await mutateLedger(entries => {
    const e = accessible(entries, id, who)
    if (e.state === 'draft' && !retryOnly) changeLedger(entries, { action: 'issue', id }, who)
    if (e.state !== 'issued') throw new DemoError('already_issued', 409)
    if (!e.issueEmail) {
      // Old issued records can explicitly send their current invoices once.
      if (e.signature || e.invoices.some(i => i.status !== 'open' || i.attempt)) throw new DemoError('invoice_email_not_available', 409)
      const accessToken = randomBytes(32).toString('hex')
      e.issueEmail = { id: randomUUID(), state: 'pending', startedAt: new Date().toISOString(), access: { hash: hash(accessToken), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() }, payload: invoiceEmailPayload(e, origin, from, who.email, accessToken) }
      audit(e, who.email, `Invoice email prepared for ${e.email}`)
    }
    return structuredClone(e.issueEmail)
  })
  if (email.state === 'sent') return 'sent'
  // An uncertain send must not be recreated after Resend's 24-hour deduplication window.
  if (!email.payload || Date.now() - Date.parse(email.startedAt) > 23 * 3600000) {
    await mutateLedger(entries => { const e = accessible(entries, id, who); if (e.issueEmail?.id === email.id && e.issueEmail.state !== 'sent') e.issueEmail.state = 'review' })
    return 'review'
  }
  let providerId: string | undefined
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', 'idempotency-key': `portal-issue/${email.id}` },
      body: JSON.stringify(email.payload), signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) throw new Error('Email request failed')
    const result = await response.json() as { id?: string }
    if (!result.id) throw new Error('Missing email identifier')
    providerId = result.id
  } catch { /* Preserve the issued invoices and the same payload/key for an owner retry. */ }
  return await mutateLedger(entries => {
    const e = accessible(entries, id, who)
    if (e.issueEmail?.id !== email.id) throw new DemoError('conflict_retry', 409)
    if (e.issueEmail.state === 'sent') return 'sent'
    e.issueEmail.state = providerId ? 'sent' : 'failed'
    if (providerId) { e.issueEmail.providerId = providerId; e.issueEmail.sentAt = new Date().toISOString() }
    audit(e, who.email, providerId ? `Invoice email accepted for sending to ${e.email}` : `Invoice email could not be confirmed for ${e.email}; retry required`)
    return e.issueEmail.state
  })
}
