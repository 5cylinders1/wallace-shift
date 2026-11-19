import { randomBytes, randomInt } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { DemoError, demoCookie, demoJson, nodeDemoOrigin, nodeHeader, normalizeDemoEmail, readDemoCookie } from './demo-access.js'
import { demoAgreementStore, reserveVerificationCode } from './demo-agreement-store.js'
import { readOpportunityBody } from './ai-opportunity-validation.js'
import { createPurchaseSession, hash, ownerEmail } from './portal-auth.js'
import { draft, field } from './portal-ledger.js'
import { requirePortalStripeConfig } from './portal-stripe-config.js'
import { billingKey, getValue, mutateLedger, redis, setValue } from './portal-store.js'
import { createInvoice, money, nextDueDate } from '../../src/client-portal/model.js'
import { packageAgreement } from '../../src/client-portal/package-agreement.js'
import { packagePurchases, PACKAGE_TERMS_VERSION, type PurchasePackageId } from '../../src/content/packagePurchase.js'

/**
 * Self-service purchase for the homepage website and lead page packages. It mirrors the AI checkout:
 * verify the buyer's email with a code, issue a fixed-terms agreement in the client portal, and hand the
 * buyer a portal session. Signing, card setup and payment then run through the existing portal.
 */
export const config = { maxDuration: 30, api: { bodyParser: false } }
const PENDING = 'wallace_package_pending'
const TTL = 600
// Codes share the AI checkout's code namespace and per-recipient send limits; pending state is separate.
const CODE_NAMESPACE = () => billingKey('ai-checkout')
type Purchase = { orderId: string; packageId: PurchasePackageId; termsVersion: string; name: string; businessName: string; email: string; fingerprint: string }
type Challenge = { nonce: string; recipientHash: string; exp: number; purchase: Purchase }
const pendingKey = (nonce: string) => billingKey(`package-checkout:pending:${hash(nonce)}`)
const proofKey = (nonce: string) => billingKey(`package-checkout:proof:${hash(nonce)}`)

function requireConfiguration(): void {
  demoAgreementStore(); ownerEmail()
  const from = process.env.CONTACT_FROM_EMAIL?.trim()
  if (!process.env.RESEND_API_KEY?.trim() || !from || /[\r\n]/.test(from)) throw new DemoError('email_not_configured', 503)
  requirePortalStripeConfig()
}

function validatePurchase(body: Record<string, unknown>): Purchase {
  const fields = ['action', 'submissionId', 'packageId', 'termsVersion', 'name', 'businessName', 'email', 'authorityConfirmed', 'company']
  if (Object.keys(body).some(key => !fields.includes(key))) throw new DemoError('invalid', 400)
  if (body.authorityConfirmed !== true) throw new DemoError('authority_required', 400)
  // Hidden field: people leave it empty.
  if (body.company !== '') throw new DemoError('invalid', 400)
  if (body.packageId !== 'website' && body.packageId !== 'lead') throw new DemoError('invalid', 400)
  if (body.termsVersion !== PACKAGE_TERMS_VERSION) throw new DemoError('offer_changed', 409)
  if (typeof body.submissionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(body.submissionId)) throw new DemoError('invalid', 400)
  let purchase: Omit<Purchase, 'fingerprint'>
  try {
    purchase = { orderId: body.submissionId, packageId: body.packageId, termsVersion: PACKAGE_TERMS_VERSION, name: field(body.name, 160), businessName: field(body.businessName, 200), email: normalizeDemoEmail(body.email) }
  } catch { throw new DemoError('invalid_fields', 400) }
  return { ...purchase, fingerprint: hash(JSON.stringify(purchase)) }
}

const LIMIT = `-- package-checkout:limit
if tonumber(redis.call('GET', KEYS[1]) or '0') >= 8 then return 0 end
redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], 3600, 'NX')
return 1`
async function limitSend(req: IncomingMessage): Promise<void> {
  const ip = process.env.VERCEL === '1' ? nodeHeader(req, 'x-vercel-forwarded-for') : req.socket?.remoteAddress
  if (!ip || !/^[\da-fA-F:.]+$/.test(ip)) throw new DemoError('forbidden', 403)
  if (await redis(['EVAL', LIMIT, 1, billingKey(`package-checkout:ip:${hash(ip)}:${Math.floor(Date.now() / 3_600_000)}`)]) !== 1) throw new DemoError('rate_limited', 429)
}

// Same atomic consume-and-prove step as the AI checkout, so a lost response can be retried without a new code.
const VERIFY = `-- package-checkout:verify
local pendingRaw = redis.call('GET', KEYS[2])
if not pendingRaw then return 'code_expired' end
local pending = cjson.decode(pendingRaw)
if pending.exp <= tonumber(ARGV[2]) then return 'code_expired' end
local verified = redis.call('GET', KEYS[3])
if verified then
  if verified == ARGV[1] then return 'ok' end
  return 'code_invalid'
end
local raw = redis.call('GET', KEYS[1])
if not raw then return 'code_expired' end
local code = cjson.decode(raw)
if code.expiresAt <= tonumber(ARGV[2]) then return 'code_expired' end
if code.recipientHash ~= pending.recipientHash or code.email ~= pending.purchase.email then return 'code_invalid' end
if code.attempts >= 5 then return 'rate_limited' end
code.attempts = code.attempts + 1
if code.codeHash ~= ARGV[1] then
  redis.call('SET', KEYS[1], cjson.encode(code), 'KEEPTTL')
  return 'code_invalid'
end
redis.call('SET', KEYS[3], ARGV[1], 'EX', pending.exp - tonumber(ARGV[2]))
redis.call('DEL', KEYS[1])
return 'ok'`

/** Issues the fixed-terms agreement with its first invoice due today. Repeating the same order returns the same agreement. */
export async function issuePackagePurchase(purchase: Purchase, origin: string): Promise<string> {
  return mutateLedger(entries => {
    const existing = entries.find(entry => entry.selfService?.orderId === purchase.orderId)
    if (existing) {
      if (existing.email !== purchase.email || existing.selfService?.fingerprint !== purchase.fingerprint) throw new DemoError('submission_conflict', 409)
      if (existing.archivedAt) throw new DemoError('agreement_archived', 409)
      return existing.id
    }
    if (purchase.termsVersion !== PACKAGE_TERMS_VERSION) throw new DemoError('offer_changed', 409)
    const item = packagePurchases[purchase.packageId]
    const today = new Date().toISOString().slice(0, 10)
    const e = draft({
      client: purchase.businessName, email: purchase.email, title: `${item.name} ${item.accent}`,
      scope: item.scope, exclusions: item.exclusions, delivery: item.delivery,
      amount: item.amount, cadence: item.cadence, firstDue: today,
    }, 'Self service checkout')
    e.agreement = packageAgreement(e, purchase.packageId)
    e.agreementHash = hash(e.agreement)
    e.selfService = { setupOrigin: origin, orderId: purchase.orderId, packageId: purchase.packageId, offerVersion: PACKAGE_TERMS_VERSION, buyerName: purchase.name, fingerprint: purchase.fingerprint }
    e.state = 'issued'
    e.issuedAt = new Date().toISOString()
    e.invoices.push(createInvoice(e, today, item.cadence === 'once' ? undefined : 'recurring'))
    e.nextDue = nextDueDate(today, e.cadence, today)
    e.audit.push({ at: e.issuedAt, actor: 'Self service checkout', action: `${item.name} ${item.accent} purchased online; agreement issued for signature` })
    entries.push(e)
    return e.id
  })
}

async function notifyOwner(purchase: Purchase, id: string, origin: string): Promise<void> {
  const item = packagePurchases[purchase.packageId]
  const portal = new URL('/client-portal', origin); portal.searchParams.set('engagement', id)
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`, 'content-type': 'application/json', 'idempotency-key': `package-purchase/${purchase.orderId}` },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM_EMAIL!.trim(), to: [ownerEmail()],
      subject: `${item.name} ${item.accent} purchased online: ${purchase.businessName.replace(/[\r\n\t]+/g, ' ')}`,
      text: [`A verified buyer started a self-service purchase. The agreement is issued and waits for their signature and first payment.`, '',
        `Package: ${item.name} ${item.accent}`, `Business: ${purchase.businessName}`, `Contact: ${purchase.name} <${purchase.email}>`,
        `First payment: ${money(item.amount)}${item.cadence === 'monthly' ? ', then monthly' : `, then ${money(item.amount)} at launch`}`, `Terms version: ${PACKAGE_TERMS_VERSION}`, '',
        'Open the agreement in the owner portal:', portal.href, 'Sign in with the owner account. This link grants no access by itself.'].join('\n'),
    }),
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error('Notification unavailable')
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if (!['GET', 'POST'].includes(req.method ?? '')) { res.setHeader('allow', 'GET, POST'); throw new DemoError('method_not_allowed', 405) }
    const origin = nodeDemoOrigin(req)
    if (req.method === 'GET') {
      let ready = true
      try { requireConfiguration() } catch { ready = false }
      demoJson(res, 200, { ok: true, ready, termsVersion: PACKAGE_TERMS_VERSION }); return
    }
    if (nodeHeader(req, 'origin') !== origin || nodeHeader(req, 'sec-fetch-site') === 'cross-site') throw new DemoError('forbidden', 403)
    const body = await readOpportunityBody(req)
    requireConfiguration()
    if (body.action === 'send-code') {
      const purchase = validatePurchase(body)
      await limitSend(req)
      const nonce = randomBytes(32).toString('hex')
      const challenge: Challenge = { nonce, recipientHash: hash(purchase.email), exp: Math.floor(Date.now() / 1000) + TTL, purchase }
      const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
      await reserveVerificationCode(challenge, purchase.email, hash(`${nonce}:${code}`), undefined, CODE_NAMESPACE())
      await setValue(pendingKey(nonce), challenge, TTL)
      res.setHeader('set-cookie', demoCookie(PENDING, nonce, origin, TTL))
      const item = packagePurchases[purchase.packageId]
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json', 'idempotency-key': `package-checkout/${nonce}` },
          body: JSON.stringify({ from: process.env.CONTACT_FROM_EMAIL!.trim(), to: [purchase.email], subject: 'Your Wallace Shift purchase verification code', text: `Your verification code is ${code}. It expires in 10 minutes. Do not share it. Enter it to continue to the ${item.name} ${item.accent} agreement and payment.` }),
          signal: AbortSignal.timeout(10000),
        })
        if (!response.ok) throw new Error('Email rejected')
      } catch { throw new DemoError('email_unavailable', 503) }
      demoJson(res, 200, { ok: true }); return
    }
    if (body.action !== 'verify-code' || Object.keys(body).some(key => !['action', 'code'].includes(key)) || typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) throw new DemoError('invalid_code', 400)
    const nonce = readDemoCookie(nodeHeader(req, 'cookie'), PENDING)
    if (!/^[a-f0-9]{64}$/.test(nonce)) throw new DemoError('code_expired', 400)
    const digest = hash(`${nonce}:${body.code}`)
    const result = await redis(['EVAL', VERIFY, 3, `${CODE_NAMESPACE()}:code:${nonce}`, `portal:${pendingKey(nonce)}`, `portal:${proofKey(nonce)}`, digest, Math.floor(Date.now() / 1000)])
    if (result !== 'ok') throw new DemoError(['code_expired', 'code_invalid', 'rate_limited'].includes(String(result)) ? String(result) : 'storage_unavailable', result === 'rate_limited' ? 429 : result === 'code_expired' || result === 'code_invalid' ? 400 : 503)
    const pending = await getValue<Challenge>(pendingKey(nonce))
    if (!pending || await redis(['GET', `portal:${proofKey(nonce)}`]) !== digest) throw new DemoError('code_expired', 400)
    const id = await issuePackagePurchase(pending.purchase, origin)
    res.setHeader('set-cookie', await createPurchaseSession(pending.purchase.email, id, origin))
    // The agreement is saved either way; the owner also sees it in the portal.
    try { await notifyOwner(pending.purchase, id, origin) } catch { /* best effort */ }
    demoJson(res, 200, { ok: true, url: `/client-portal?engagement=${encodeURIComponent(id)}` })
  } catch (error) {
    const failure = error instanceof DemoError ? error : new DemoError('temporarily_unavailable', 503)
    if (failure.status === 429) res.setHeader('retry-after', '60')
    demoJson(res, failure.status, { ok: false, error: failure.code })
  }
}
