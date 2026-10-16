import { randomInt } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  DEMO_ADMIN_COOKIE, DEMO_ADMIN_PENDING_COOKIE, DEMO_ADMIN_SECONDS, DEMO_COOKIE,
  DEMO_PENDING_COOKIE, DEMO_PROOF_COOKIE, DemoError, createDemoAdminGrant, demoAdminEmail,
  demoCookie, demoJson, nodeDemoOrigin, nodeHeader, normalizeDemoEmail, readDemoCookie,
  verificationCodeHash, verifyDemoGrant,
} from './_lib/demo-access.js'
import { consumeVerificationCode, reserveVerificationCode } from './_lib/demo-agreement-store.js'

export const config = { maxDuration: 15 }

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:\s*;|$)/i.test(nodeHeader(req, 'content-type') ?? '')) throw new DemoError('invalid', 400)
  const length = Number(nodeHeader(req, 'content-length') ?? 0)
  if (!Number.isFinite(length) || length < 0 || length > 2000) throw new DemoError('too_large', 413)
  const parsed = (req as IncomingMessage & { body?: unknown }).body
  let raw: string
  if (parsed !== undefined) {
    try { raw = Buffer.isBuffer(parsed) ? parsed.toString('utf8') : typeof parsed === 'string' ? parsed : JSON.stringify(parsed) }
    catch { throw new DemoError('invalid', 400) }
    if (typeof raw !== 'string') throw new DemoError('invalid', 400)
  } else {
    const chunks: Buffer[] = []
    let bytes = 0
    for await (const chunk of req) {
      const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      bytes += value.length
      if (bytes > 2000) throw new DemoError('too_large', 413)
      chunks.push(value)
    }
    raw = Buffer.concat(chunks).toString('utf8')
  }
  if (Buffer.byteLength(raw) > 2000) throw new DemoError('too_large', 413)
  let value: unknown
  try { value = JSON.parse(raw) } catch { throw new DemoError('invalid', 400) }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DemoError('invalid', 400)
  return value as Record<string, unknown>
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.setHeader('allow', 'GET, POST')
      throw new DemoError('method_not_allowed', 405)
    }
    const origin = nodeDemoOrigin(req)
    const cookie = nodeHeader(req, 'cookie')
    if (req.method === 'GET') {
      demoAdminEmail()
      const authenticated = verifyDemoGrant(readDemoCookie(cookie, DEMO_ADMIN_COOKIE), origin, 'admin-session') !== null
      demoJson(res, 200, { ok: true, authenticated })
      return
    }
    if (nodeHeader(req, 'origin') !== origin || nodeHeader(req, 'sec-fetch-site') === 'cross-site') throw new DemoError('forbidden', 403)
    const body = await readBody(req)
    if (body.action === 'logout') {
      // Also end any visitor session, so signing out really locks this browser.
      res.setHeader('set-cookie', [DEMO_ADMIN_COOKIE, DEMO_ADMIN_PENDING_COOKIE, DEMO_COOKIE, DEMO_PENDING_COOKIE, DEMO_PROOF_COOKIE].map(name => demoCookie(name, '', origin, 0)))
      demoJson(res, 200, { ok: true, authenticated: false })
      return
    }
    const owner = demoAdminEmail()
    if (body.action === 'send-code') {
      const apiKey = process.env.RESEND_API_KEY?.trim()
      const from = process.env.CONTACT_FROM_EMAIL?.trim()
      if (!apiKey || !from || /[\r\n]/.test(from)) throw new DemoError('not_configured', 503)
      const now = Math.floor(Date.now() / 1000)
      const existing = readDemoCookie(cookie, DEMO_ADMIN_PENDING_COOKIE)
      const previous = verifyDemoGrant(existing, origin, 'admin-pending')
      const token = previous && previous.exp > now + 60 ? existing : createDemoAdminGrant('admin-pending', origin)
      const pending = verifyDemoGrant(token, origin, 'admin-pending')
      if (!pending) throw new DemoError('verification_required', 403)
      const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
      const codeHash = verificationCodeHash(pending.nonce, code)
      // A mailbox cooldown survives cookie clearing and different browsers/IPs.
      // Its separate namespace prevents visitor codes from becoming admin codes.
      await reserveVerificationCode(pending, owner, codeHash, now, 'demo-admin')
      try {
        const result = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json', 'idempotency-key': `demo-admin/${pending.nonce}/${codeHash}` },
          signal: AbortSignal.timeout(10_000),
          body: JSON.stringify({
            from, to: [owner], subject: 'Your Wallace Shift admin sign-in code',
            text: [
              'Your Wallace Shift admin sign-in code:', '', code, '',
              `Enter it on the admin sign-in page at ${origin}/demo-admin/.`,
              'This single-use code expires within 10 minutes. Signing in gives this browser access to all demos for 30 days.',
              'If you did not request this code, ignore this email. Do not share the code.', '', 'Wallace Shift LLC',
            ].join('\n'),
          }),
        })
        if (!result.ok) throw new Error('email unavailable')
      } catch { throw new DemoError('unavailable', 503) }
      const remaining = pending.exp - Math.floor(Date.now() / 1000)
      if (remaining <= 0) throw new DemoError('code_expired', 400)
      res.setHeader('set-cookie', demoCookie(DEMO_ADMIN_PENDING_COOKIE, token, origin, remaining))
      demoJson(res, 200, { ok: true, retryAfter: 60 })
      return
    }
    if (body.action === 'verify-code') {
      if (typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) throw new DemoError('invalid', 400)
      const token = readDemoCookie(cookie, DEMO_ADMIN_PENDING_COOKIE)
      const pending = verifyDemoGrant(token, origin, 'admin-pending')
      if (!pending) throw new DemoError('verification_required', 403)
      const email = normalizeDemoEmail(await consumeVerificationCode(pending, verificationCodeHash(pending.nonce, body.code), Math.floor(Date.now() / 1000), 'demo-admin'))
      if (email !== owner || !verifyDemoGrant(token, origin, 'admin-pending')) throw new DemoError('verification_required', 403)
      const session = createDemoAdminGrant('admin-session', origin)
      res.setHeader('set-cookie', [
        demoCookie(DEMO_ADMIN_COOKIE, session, origin, DEMO_ADMIN_SECONDS),
        demoCookie(DEMO_ADMIN_PENDING_COOKIE, '', origin, 0),
      ])
      demoJson(res, 200, { ok: true, authenticated: true })
      return
    }
    throw new DemoError('invalid', 400)
  } catch (error) {
    const failure = error instanceof DemoError ? error : new DemoError('unavailable', 503)
    if (failure.code === 'rate_limited') res.setHeader('retry-after', '60')
    demoJson(res, failure.status, { ok: false, error: failure.code })
  }
}
