/**
 * Estimate requests from the Complete Painting page.
 *
 *   POST /api/paint-request   EstimateRequestBody → EstimateResponse   (via api/lawn.ts)
 *
 * Emailed through Resend once RESEND_API_KEY, PAINT_REQUEST_TO_EMAIL and a
 * verified sender (PAINT_REQUEST_FROM_EMAIL, else CONTACT_FROM_EMAIL) are
 * set. Until then the answer is `not_configured` and the page says nothing
 * was sent: no request is ever reported as delivered that wasn't.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { header, isRateLimited, sendJson } from '../roof/http.js'
import {
  CONTACT_LABELS, CONTACT_METHODS, PROJECT_LABELS, PROJECTS, TIMING_LABELS, TIMINGS,
  type EstimateErrorCode,
} from '../../../src/demos/painting/estimate/types.js'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const MAX_BYTES = 12_000
/** A household sends one, maybe two; this stops the form being used as a relay. */
const RATE_LIMIT = 6
const RATE_WINDOW_S = 3600
const STATUS: Record<EstimateErrorCode, number> = { invalid: 400, not_configured: 200, rate_limited: 429, send_failed: 502 }

class RequestError extends Error {
  readonly code: EstimateErrorCode
  constructor(code: EstimateErrorCode) {
    super(code)
    this.code = code
  }
}

const fail = (res: ServerResponse, code: EstimateErrorCode) => sendJson(res, { ok: false, error: code }, STATUS[code])

function mailFromEnv(): { apiKey: string; to: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const to = process.env.PAINT_REQUEST_TO_EMAIL?.trim()
  const from = (process.env.PAINT_REQUEST_FROM_EMAIL ?? process.env.CONTACT_FROM_EMAIL)?.trim()
  return apiKey && to && from ? { apiKey, to, from } : null
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:\s*;|$)/i.test(header(req, 'content-type') ?? '')) throw new RequestError('invalid')
  const parsed = (req as IncomingMessage & { body?: unknown }).body
  let raw: string
  if (parsed !== undefined) {
    raw = Buffer.isBuffer(parsed) ? parsed.toString('utf8') : typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
  } else {
    const chunks: Buffer[] = []
    let bytes = 0
    for await (const chunk of req) {
      const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      bytes += value.length
      if (bytes > MAX_BYTES) throw new RequestError('invalid')
      chunks.push(value)
    }
    raw = Buffer.concat(chunks).toString('utf8')
  }
  if (Buffer.byteLength(raw) > MAX_BYTES) throw new RequestError('invalid')
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new RequestError('invalid')
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RequestError('invalid')
  return value as Record<string, unknown>
}

/** Single-line text: collapsed so a newline can't forge another labelled line in the email. */
function line(value: unknown, max: number, required = true): string {
  const cleaned = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  if ((required && !cleaned) || cleaned.length > max) throw new RequestError('invalid')
  return cleaned
}

function choice<T extends string>(value: unknown, options: readonly T[]): T {
  if (typeof value !== 'string' || !(options as readonly string[]).includes(value)) throw new RequestError('invalid')
  return value as T
}

export default async function request(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if (req.method !== 'POST') return fail(res, 'invalid')
    const body = await readBody(req)

    // Honeypot: answer like a success so a bot has nothing to retry against.
    if (typeof body.company === 'string' && body.company.trim()) return sendJson(res, { ok: true })

    const name = line(body.name, 120)
    const phone = line(body.phone, 40)
    const email = line(body.email, 200)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.replace(/\D/g, '').length < 10) throw new RequestError('invalid')
    const contact = choice(body.contact, CONTACT_METHODS)
    const location = line(body.location, 200)
    const timing = choice(body.timing, TIMINGS)
    const projects = Array.isArray(body.projects) ? [...new Set(body.projects.map((project) => choice(project, PROJECTS)))] : []
    if (!projects.length) throw new RequestError('invalid')
    const colors = line(body.colors, 200, false)
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : ''
    if (await isRateLimited(req, 'paint-request', RATE_LIMIT, RATE_WINDOW_S)) return fail(res, 'rate_limited')

    const mail = mailFromEnv()
    if (!mail) return fail(res, 'not_configured')

    const text = [
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Email: ${email}`,
      `Prefers: ${CONTACT_LABELS[contact]}`,
      '',
      `Location: ${location}`,
      `Project: ${projects.map((project) => PROJECT_LABELS[project]).join(', ')}`,
      `Timing: ${TIMING_LABELS[timing]}`,
      ...(colors ? [`Colors from the studio: ${colors}`] : []),
      ...(notes ? ['', 'Notes:', notes] : []),
      '',
    ].join('\n')

    let response: Response
    try {
      response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: { authorization: `Bearer ${mail.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: mail.from, to: [mail.to], reply_to: email, subject: `Estimate request: ${name}, ${location}`, text }),
        signal: AbortSignal.timeout(8000),
      })
    } catch {
      return fail(res, 'send_failed')
    }
    if (!response.ok) return fail(res, 'send_failed')
    sendJson(res, { ok: true })
  } catch (error) {
    if (res.headersSent) return
    if (error instanceof RequestError) return fail(res, error.code)
    console.error('[paint-request] unexpected:', error)
    fail(res, 'send_failed')
  }
}
