import { randomInt } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { agreementText, demoAgreement } from '../src/content/demoAgreement.js'
import {
  DEMO_AGREEMENT_HASH, DEMO_COOKIE, DEMO_PATHS, DEMO_PENDING_COOKIE, DEMO_PROOF_COOKIE, DEMO_VERIFICATION_SECONDS,
  DemoError, demoCookie, demoJson, nodeDemoOrigin, nodeHeader, normalizeDemoEmail, readDemoCookie,
  recipientEmailHash, signDemoGrant, verificationCodeHash, verifyDemoGrant,
} from './_lib/demo-access.js'
import type { InviteGrant, ProofGrant } from './_lib/demo-access.js'
import { acceptanceId, consumeVerificationCode, persistAcceptance, reserveVerificationCode } from './_lib/demo-agreement-store.js'

export const config = { maxDuration: 15 }
const MAX_BYTES = 12_000

function field(value: unknown, maximum: number): string {
  if (typeof value !== 'string' || value.length > maximum || [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) || !value.trim()) throw new DemoError('invalid', 400)
  return value.trim()
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:\s*;|$)/i.test(nodeHeader(req, 'content-type') ?? '')) throw new DemoError('invalid', 400)
  const length = Number(nodeHeader(req, 'content-length') ?? 0)
  if (!Number.isFinite(length) || length < 0 || length > MAX_BYTES) throw new DemoError('too_large', 413)
  const parsed = (req as IncomingMessage & { body?: unknown }).body
  let raw: string
  if (parsed !== undefined) {
    try { raw = Buffer.isBuffer(parsed) ? parsed.toString('utf8') : typeof parsed === 'string' ? parsed : JSON.stringify(parsed) } catch { throw new DemoError('invalid', 400) }
    if (typeof raw !== 'string') throw new DemoError('invalid', 400)
  } else {
    const chunks: Buffer[] = []
    let bytes = 0
    for await (const chunk of req) {
      const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      bytes += value.length
      if (bytes > MAX_BYTES) throw new DemoError('too_large', 413)
      chunks.push(value)
    }
    raw = Buffer.concat(chunks).toString('utf8')
  }
  if (Buffer.byteLength(raw) > MAX_BYTES) throw new DemoError('too_large', 413)
  let value: unknown
  try { value = JSON.parse(raw) } catch { throw new DemoError('invalid', 400) }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DemoError('invalid', 400)
  return value as Record<string, unknown>
}

function assertInviteCurrent(invite: InviteGrant): void {
  if (invite.exp <= Math.floor(Date.now() / 1000)) throw new DemoError('invite_expired', 403)
}

function verifiedProof(req: IncomingMessage, origin: string, invite: InviteGrant): ProofGrant | null {
  const proof = verifyDemoGrant(readDemoCookie(nodeHeader(req, 'cookie'), DEMO_PROOF_COOKIE), origin, 'proof')
  return proof && proof.nonce === invite.nonce && proof.recipientHash === invite.recipientHash && proof.demo === invite.demo && proof.exp <= invite.exp && proof.iat >= invite.iat ? proof : null
}

async function sendVerificationEmail(email: string, code: string, nonce: string, codeHash: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.CONTACT_FROM_EMAIL?.trim()
  if (!apiKey || !from || /[\r\n]/.test(from)) throw new DemoError('not_configured', 503)
  try {
    const result = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json', 'idempotency-key': `demo-verification/${nonce}/${codeHash}` },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        from, to: [email], subject: 'Verify your Wallace Shift demo access',
        text: [
          'Your Wallace Shift demo verification code:', '', code, '',
          'Enter this code on the demo agreement page to verify your approved email address. It expires in 10 minutes or when your invitation expires, whichever comes first, and can be used once.',
          'Verifying your email does not accept the agreement or unlock the demos. You will review and accept the agreement separately.', '',
          'If you did not request this code, you can ignore this email. Do not share the code or your invitation link.', '',
          'Wallace Shift LLC',
        ].join('\n'),
      }),
    })
    if (!result.ok) throw new Error('email unavailable')
  } catch { throw new DemoError('unavailable', 503) }
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('allow', 'GET, POST'); throw new DemoError('method_not_allowed', 405) }
    const origin = nodeDemoOrigin(req)
    const pending = readDemoCookie(nodeHeader(req, 'cookie'), DEMO_PENDING_COOKIE)
    const invite = verifyDemoGrant(pending, origin, 'invite')
    if (!invite) throw new DemoError(pending ? 'invite_expired' : 'invite_required', 403)
    const proof = verifiedProof(req, origin, invite)
    if (req.method === 'GET') {
      demoJson(res, 200, { ok: true, demo: invite.demo, verified: Boolean(proof), ...(proof ? { email: proof.verifiedEmail } : {}), agreementVersion: demoAgreement.version, agreementHash: DEMO_AGREEMENT_HASH })
      return
    }
    if (nodeHeader(req, 'origin') !== origin || nodeHeader(req, 'sec-fetch-site') === 'cross-site') throw new DemoError('forbidden', 403)
    const body = await readBody(req)
    assertInviteCurrent(invite)
    if (body.action === 'send-code') {
      const email = normalizeDemoEmail(body.email)
      if (recipientEmailHash(email) !== invite.recipientHash) throw new DemoError('email_mismatch', 403)
      const apiKey = process.env.RESEND_API_KEY?.trim()
      const from = process.env.CONTACT_FROM_EMAIL?.trim()
      if (!apiKey || !from || /[\r\n]/.test(from)) throw new DemoError('not_configured', 503)
      const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
      const codeHash = verificationCodeHash(invite.nonce, code)
      await reserveVerificationCode(invite, email, codeHash)
      assertInviteCurrent(invite)
      await sendVerificationEmail(email, code, invite.nonce, codeHash)
      assertInviteCurrent(invite)
      res.setHeader('set-cookie', demoCookie(DEMO_PROOF_COOKIE, '', origin, 0))
      demoJson(res, 200, { ok: true, retryAfter: 60 })
      return
    }
    if (body.action === 'verify-code') {
      if (typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) throw new DemoError('invalid', 400)
      const email = normalizeDemoEmail(await consumeVerificationCode(invite, verificationCodeHash(invite.nonce, body.code)))
      assertInviteCurrent(invite)
      if (recipientEmailHash(email) !== invite.recipientHash) throw new DemoError('unavailable', 503)
      const now = Math.floor(Date.now() / 1000)
      const expires = Math.min(invite.exp, now + DEMO_VERIFICATION_SECONDS)
      const token = signDemoGrant({ ...invite, kind: 'proof', verifiedEmail: email, iat: now, exp: expires })
      res.setHeader('set-cookie', demoCookie(DEMO_PROOF_COOKIE, token, origin, expires - now))
      demoJson(res, 200, { ok: true, verified: true, email })
      return
    }
    if (body.action === 'accept') {
      const currentProof = verifiedProof(req, origin, invite)
      if (!currentProof) throw new DemoError('verification_required', 403)
      if (body.accepted !== true || body.authority !== true) throw new DemoError('acceptance_required', 400)
      if (body.agreementVersion !== demoAgreement.version || body.agreementHash !== DEMO_AGREEMENT_HASH) throw new DemoError('agreement_changed', 409)
      const person = field(body.name, 120)
      const businessName = field(body.businessName, 160)
      const record = await persistAcceptance({
        id: acceptanceId(invite.nonce, DEMO_AGREEMENT_HASH), inviteId: invite.nonce, person, businessName,
        verifiedEmail: currentProof.verifiedEmail, acceptedAt: new Date().toISOString(), agreementVersion: demoAgreement.version,
        agreementHash: DEMO_AGREEMENT_HASH, agreementText, accepted: true, authority: true,
      })
      assertInviteCurrent(invite)
      if (!verifiedProof(req, origin, invite)) throw new DemoError('verification_required', 403)
      const remaining = invite.exp - Math.floor(Date.now() / 1000)
      const token = signDemoGrant({ ...invite, kind: 'session', agreementVersion: record.agreementVersion, agreementHash: record.agreementHash, acceptanceId: record.id })
      res.setHeader('set-cookie', [
        demoCookie(DEMO_COOKIE, token, origin, remaining),
        demoCookie(DEMO_PENDING_COOKIE, '', origin, 0),
        demoCookie(DEMO_PROOF_COOKIE, '', origin, 0),
      ])
      demoJson(res, 200, { ok: true, redirectTo: DEMO_PATHS[invite.demo] })
      return
    }
    throw new DemoError('invalid', 400)
  } catch (error) {
    const failure = error instanceof DemoError ? error : new DemoError('unavailable', 503)
    if (failure.code === 'rate_limited') res.setHeader('retry-after', '60')
    demoJson(res, failure.status, { ok: false, error: failure.code })
  }
}
