import { createHash, randomBytes, randomInt } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { DemoError, demoCookie, nodeHeader, normalizeDemoEmail, readDemoCookie } from './demo-access.js'
import { consumeVerificationCode, reserveVerificationCode } from './demo-agreement-store.js'
import { allEngagements, getValue, redis, setValue } from './portal-store.js'

export const hash = (text: string) => createHash('sha256').update(text).digest('hex')
const SESSION = 'wallace_client_session'
const PENDING = 'wallace_client_pending'
type Pending = { nonce: string; recipientHash: string; exp: number; email: string }
export type Identity = { email: string; admin: boolean }
export function ownerEmail(): string {
  const email = process.env.PORTAL_ADMIN_EMAIL?.trim()
  if (!email) throw new DemoError('portal_not_configured', 503)
  return normalizeDemoEmail(email)
}
export async function identity(req: IncomingMessage): Promise<Identity | null> {
  const token = readDemoCookie(nodeHeader(req, 'cookie'), SESSION)
  if (!/^[a-f0-9]{64}$/.test(token)) return null
  const session = await getValue<{ email: string }>(`session:${hash(token)}`)
  return session ? { email: session.email, admin: session.email === ownerEmail() } : null
}
export async function login(req: IncomingMessage, res: ServerResponse, origin: string, body: Record<string, unknown>): Promise<void> {
  if (body.action === 'logout') {
    const token = readDemoCookie(nodeHeader(req, 'cookie'), SESSION)
    if (token) await redis(['DEL', `portal:session:${hash(token)}`])
    res.setHeader('set-cookie', [demoCookie(SESSION, '', origin, 0), demoCookie(PENDING, '', origin, 0)])
    return
  }
  if (body.action === 'send-code') {
    const email = normalizeDemoEmail(body.email)
    const owner = ownerEmail()
    const nonce = randomBytes(32).toString('hex')
    const pending: Pending = { email, nonce, recipientHash: hash(email), exp: Math.floor(Date.now() / 1000) + 600 }
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    await reserveVerificationCode(pending, email, hash(`${nonce}:${code}`), undefined, 'client-portal')
    await setValue(`pending:${hash(nonce)}`, pending, 600)
    res.setHeader('set-cookie', demoCookie(PENDING, nonce, origin, 600))
    const known = email === owner || (await allEngagements()).some(e => e.email === email && e.state !== 'draft')
    if (known) {
      const key = process.env.RESEND_API_KEY
      const from = process.env.CONTACT_FROM_EMAIL
      if (!key || !from) throw new DemoError('email_not_configured', 503)
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', 'idempotency-key': `portal-login/${nonce}` },
        body: JSON.stringify({ from, to: [email], subject: 'Your Wallace Shift portal sign in code', text: `Your sign in code is ${code}. It expires in 10 minutes. Do not share this code. Signing in does not sign an agreement or authorize a payment.` }),
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) throw new DemoError('email_unavailable', 503)
    }
    return
  }
  if (body.action !== 'verify-code' || typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) throw new DemoError('invalid_code', 400)
  const nonce = readDemoCookie(nodeHeader(req, 'cookie'), PENDING)
  const pending = await getValue<Pending>(`pending:${hash(nonce)}`)
  if (!pending || pending.exp <= Date.now() / 1000) throw new DemoError('code_expired', 400)
  const email = await consumeVerificationCode(pending, hash(`${nonce}:${body.code}`), undefined, 'client-portal')
  const known = email === ownerEmail() || (await allEngagements()).some(e => e.email === email && e.state !== 'draft')
  if (!known) throw new DemoError('access_required', 403)
  const token = randomBytes(32).toString('hex')
  await setValue(`session:${hash(token)}`, { email }, 8 * 3600)
  await redis(['DEL', `portal:pending:${hash(nonce)}`])
  res.setHeader('set-cookie', [demoCookie(SESSION, token, origin, 8 * 3600), demoCookie(PENDING, '', origin, 0)])
}
