import type { IncomingMessage, ServerResponse } from 'node:http'
import { createDemoInvite, demoAccessOrigin, demoJson, demoKey, DemoError, nodeDemoOrigin, nodeHeader, reserveDemoRequest } from './_lib/demo-access.js'

export const config = { maxDuration: 15 }
const MAX_BYTES = 12_000

function field(value: unknown, maximum: number, required = true, multiline = false): string {
  if (value === undefined && !required) return ''
  if (typeof value !== 'string' || value.length > maximum || (!multiline && [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127))) throw new DemoError('invalid', 400)
  const cleaned = value.trim()
  if (required && !cleaned) throw new DemoError('invalid', 400)
  return cleaned
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:\s*;|$)/i.test(nodeHeader(req, 'content-type') ?? '')) throw new DemoError('invalid', 400)
  const length = Number(nodeHeader(req, 'content-length') ?? 0)
  if (!Number.isFinite(length) || length < 0 || length > MAX_BYTES) throw new DemoError('too_large', 413)
  const parsed = (req as IncomingMessage & { body?: unknown }).body
  let raw: string
  if (parsed !== undefined) raw = typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
  else {
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

/** Sends one internal review request. It never emails or unlocks the prospect. */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if (req.method !== 'POST') { res.setHeader('allow', 'POST'); throw new DemoError('method_not_allowed', 405) }
    const origin = nodeDemoOrigin(req)
    if (nodeHeader(req, 'origin') !== origin || nodeHeader(req, 'sec-fetch-site') === 'cross-site') throw new DemoError('forbidden', 403)
    const body = await readBody(req)
    if (field(body.company, 200, false)) { demoJson(res, 200, { ok: true }); return }
    const name = field(body.name, 120)
    const businessName = field(body.businessName, 160)
    const email = field(body.email, 254)
    const websiteValue = field(body.website, 500, false)
    const website = websiteValue && !/^[a-z][a-z\d+.-]*:/i.test(websiteValue) ? `https://${websiteValue}` : websiteValue
    const message = field(body.message, 5000, false, true)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DemoError('invalid', 400)
    if (website) {
      let url: URL
      try { url = new URL(website) } catch { throw new DemoError('invalid', 400) }
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new DemoError('invalid', 400)
    }
    const demo = demoKey(body.demo)
    const apiKey = process.env.RESEND_API_KEY?.trim()
    const to = process.env.CONTACT_TO_EMAIL?.trim()
    const from = process.env.CONTACT_FROM_EMAIL?.trim()
    if (!apiKey || !to || !from || /[\r\n]/.test(to + from)) throw new DemoError('not_configured', 503)
    const token = createDemoInvite(demo)
    await reserveDemoRequest(req)
    const invitation = `${demoAccessOrigin()}/api/demo-access?token=${encodeURIComponent(token)}`
    let result: Response
    try {
      result = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({
          from, to: [to], reply_to: email,
          subject: `Demo access request from ${name}`,
          text: [
            'Review this request before sharing access.',
            'No invitation has been sent to the requester and their browser has not been unlocked.',
            '', `Name: ${name}`, `Business: ${businessName}`, `Email: ${email}`, `Website: ${website || 'Not provided'}`, `Requested demo: ${demo}`, '',
            'Requester message:', message || 'Not provided', '',
            'If you approve, manually send the following link to the requester:', invitation, '',
            'The link and resulting browser access expire 72 hours after this request. It grants access to all demos on the invitation host. Anyone holding this link can use it until expiry; share it only with the approved requester.',
          ].join('\n'),
        }),
      })
    } catch { throw new DemoError('send_failed', 502) }
    if (!result.ok) throw new DemoError('send_failed', 502)
    demoJson(res, 200, { ok: true })
  } catch (error) {
    const failure = error instanceof DemoError ? error : new DemoError('temporarily_unavailable', 503)
    demoJson(res, failure.status, { ok: false, error: failure.code })
  }
}
