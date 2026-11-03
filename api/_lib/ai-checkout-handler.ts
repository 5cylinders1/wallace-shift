import { randomBytes, randomInt } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { DemoError, demoCookie, demoJson, nodeDemoOrigin, nodeHeader, readDemoCookie } from './demo-access.js'
import { demoAgreementStore, reserveVerificationCode } from './demo-agreement-store.js'
import { readOpportunityBody, validateOpportunity } from './ai-opportunity-validation.js'
import { createPurchaseSession, hash, ownerEmail } from './portal-auth.js'
import { changeLedger, draft } from './portal-ledger.js'
import { getValue, mutateLedger, redis, setValue } from './portal-store.js'
import { aiOffer, aiPackages, routeAiOpportunity, type AiPackageId, type AiQualificationAnswers } from '../../src/content/aiOffer.js'

export const config = { maxDuration: 60, api: { bodyParser: false } }
const PENDING = 'wallace_checkout_pending'
const TTL = 600
const answerFields = ['businessType', 'workflows', 'workflowDetails', 'currentTools', 'weeklyHours', 'impacts', 'impactDetails', 'role', 'approverAvailability', 'revenue', 'aiExperience', 'aiBarriers', 'budget', 'timing'] as const
type Purchase = { orderId: string; offerVersion: string; packageId: AiPackageId; name: string; businessName: string; email: string; answers: AiQualificationAnswers; fingerprint: string }
type Challenge = { nonce: string; recipientHash: string; exp: number; purchase: Purchase }
const pendingKey = (nonce: string) => `checkout:pending:${hash(nonce)}`
const proofKey = (nonce: string) => `checkout:proof:${hash(nonce)}`

/** Readiness describes configuration only, never a provider or payment verification. */
function requireCheckoutConfiguration(): void {
  demoAgreementStore(); ownerEmail()
  const from = process.env.CONTACT_FROM_EMAIL?.trim()
  if (!process.env.RESEND_API_KEY?.trim() || !from || /[\r\n]/.test(from)) throw new DemoError('email_not_configured', 503)
  if (!process.env.STRIPE_SECRET_KEY?.trim() || !process.env.STRIPE_PUBLISHABLE_KEY?.trim() || !process.env.STRIPE_WEBHOOK_SECRET?.trim()) throw new DemoError('stripe_not_configured', 503)
}

function validatePurchase(body: Record<string, unknown>): Purchase {
  const fields = ['action', 'submissionId', 'offerVersion', 'packageId', 'name', 'businessName', 'email', 'answers', 'authorityConfirmed', 'company']
  if (Object.keys(body).some(key => !fields.includes(key)) || body.authorityConfirmed !== true) throw new DemoError('invalid', 400)
  if (!body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers) || Object.keys(body.answers).some(key => !(answerFields as readonly string[]).includes(key))) throw new DemoError('invalid', 400)
  if (typeof body.company !== 'string' || body.company !== '') throw new DemoError('invalid', 400)
  const answers = body.answers as AiQualificationAnswers
  let offerApplies: boolean
  try { offerApplies = routeAiOpportunity(answers) !== 'resource' } catch { throw new DemoError('invalid', 400) }
  // Use the existing strict quiz schema; operational checkout messages are not marketing consent.
  const { id, application } = validateOpportunity({
    ...answers, submissionId: body.submissionId, offerVersion: body.offerVersion,
    name: body.name, businessName: body.businessName, email: body.email,
    website: '', nextStep: 'package', packageId: body.packageId, contactMethod: 'email', phone: '',
    offerAcknowledged: offerApplies, contactConsent: true, company: '',
  })
  const cleanAnswers = Object.fromEntries(answerFields.map(key => [key, application[key]])) as AiQualificationAnswers
  const purchase = { orderId: id, offerVersion: aiOffer.version, packageId: application.packageId as AiPackageId, name: application.name, businessName: application.businessName, email: application.email, answers: cleanAnswers }
  return { ...purchase, fingerprint: hash(JSON.stringify(purchase)) }
}

const LIMIT = `-- ai-checkout:limit
if tonumber(redis.call('GET', KEYS[1]) or '0') >= 8 then return 0 end
redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], 3600, 'NX')
return 1`
async function limitSend(req: IncomingMessage): Promise<void> {
  const ip = process.env.VERCEL === '1' ? nodeHeader(req, 'x-vercel-forwarded-for') : req.socket?.remoteAddress
  if (!ip || !/^[\da-fA-F:.]+$/.test(ip)) throw new DemoError('forbidden', 403)
  if (await redis(['EVAL', LIMIT, 1, `ai-checkout:ip:${hash(ip)}:${Math.floor(Date.now() / 3_600_000)}`]) !== 1) throw new DemoError('rate_limited', 429)
}

// Consuming the code and persisting proof is atomic. A retry after a ledger or
// session write failure can finish this same purchase without verifying again.
const VERIFY = `-- ai-checkout:verify
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

async function issuePurchase(purchase: Purchase): Promise<string> {
  const item = aiPackages[purchase.packageId]
  return mutateLedger(entries => {
    const existing = entries.find(entry => entry.selfService?.orderId === purchase.orderId)
    if (existing) {
      if (existing.email !== purchase.email || existing.selfService?.fingerprint !== purchase.fingerprint) throw new DemoError('submission_conflict', 409)
      return existing.id
    }
    if (purchase.offerVersion !== aiOffer.version) throw new DemoError('offer_changed', 409)
    const e = draft({
      client: purchase.businessName, email: purchase.email, title: item.name,
      scope: `${item.scope.join('\n')}\n\nIncluded business website: ${aiOffer.websiteScope}.\nThe service amount includes any applicable service taxes.`,
      exclusions: item.boundary,
      delivery: item.delivery,
      amount: item.price * 100, cadence: 'once', firstDue: new Date().toISOString().slice(0, 10),
    }, 'Self service checkout')
    e.selfService = { orderId: purchase.orderId, packageId: purchase.packageId, offerVersion: purchase.offerVersion, buyerName: purchase.name, answers: purchase.answers, fingerprint: purchase.fingerprint }
    entries.push(e)
    changeLedger(entries, { action: 'issue', id: e.id }, { email: 'Self service checkout', admin: true })
    return e.id
  })
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if (!['GET', 'POST'].includes(req.method ?? '')) { res.setHeader('allow', 'GET, POST'); throw new DemoError('method_not_allowed', 405) }
    const origin = nodeDemoOrigin(req)
    if (req.method === 'GET') {
      let ready = true
      try { requireCheckoutConfiguration() } catch { ready = false }
      demoJson(res, 200, { ok: true, ready }); return
    }
    if (nodeHeader(req, 'origin') !== origin || nodeHeader(req, 'sec-fetch-site') === 'cross-site') throw new DemoError('forbidden', 403)
    const body = await readOpportunityBody(req)
    requireCheckoutConfiguration()
    if (body.action === 'send-code') {
      const purchase = validatePurchase(body)
      await limitSend(req)
      const nonce = randomBytes(32).toString('hex')
      const challenge: Challenge = { nonce, recipientHash: hash(purchase.email), exp: Math.floor(Date.now() / 1000) + TTL, purchase }
      const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
      await reserveVerificationCode(challenge, purchase.email, hash(`${nonce}:${code}`), undefined, 'ai-checkout')
      await setValue(pendingKey(nonce), challenge, TTL)
      res.setHeader('set-cookie', demoCookie(PENDING, nonce, origin, TTL))
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json', 'idempotency-key': `ai-checkout/${nonce}` },
          body: JSON.stringify({ from: process.env.CONTACT_FROM_EMAIL!.trim(), to: [purchase.email], subject: 'Your Wallace Shift purchase verification code', text: `Your verification code is ${code}. It expires in 10 minutes. Do not share it. Enter it to continue to the ${aiPackages[purchase.packageId].name} agreement and payment. Verification does not sign the agreement or charge your card.` }),
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
    const result = await redis(['EVAL', VERIFY, 3, `ai-checkout:code:${nonce}`, `portal:${pendingKey(nonce)}`, `portal:${proofKey(nonce)}`, digest, Math.floor(Date.now() / 1000)])
    if (result !== 'ok') throw new DemoError(['code_expired', 'code_invalid', 'rate_limited'].includes(String(result)) ? String(result) : 'storage_unavailable', result === 'rate_limited' ? 429 : result === 'code_expired' || result === 'code_invalid' ? 400 : 503)
    const pending = await getValue<Challenge>(pendingKey(nonce))
    if (!pending || await redis(['GET', `portal:${proofKey(nonce)}`]) !== digest) throw new DemoError('code_expired', 400)
    const id = await issuePurchase(pending.purchase)
    res.setHeader('set-cookie', await createPurchaseSession(pending.purchase.email, id, origin))
    // Retain the short-lived challenge cookie for a retry if this response is lost.
    demoJson(res, 200, { ok: true, url: `/client-portal?engagement=${encodeURIComponent(id)}` })
  } catch (error) {
    const failure = error instanceof DemoError ? error : new DemoError('temporarily_unavailable', 503)
    if (failure.status === 429) res.setHeader('retry-after', '60')
    demoJson(res, failure.status, { ok: false, error: failure.code })
  }
}
