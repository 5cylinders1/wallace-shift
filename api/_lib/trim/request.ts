/**
 * Estimate requests from the LP Construction concept.
 *
 *   POST /api/trim-request   → RequestResponse   (via api/lawn.ts)
 *
 * Emailed through Resend, photos attached, once RESEND_API_KEY,
 * LP_REQUEST_TO_EMAIL and a verified sender (LP_REQUEST_FROM_EMAIL, else
 * CONTACT_FROM_EMAIL) are set. Until then the answer is `not_configured` and
 * the page says plainly that nothing was sent. Texts are not sent from here:
 * that would need a sending number and A2P registration, which the owner
 * declined for now (intake #16); the page offers the visitor's own Messages app.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { header, isRateLimited, sendJson } from '../roof/http.js'
import { findFinish, findStyle } from '../../../src/demos/lp-construction/ideas/styles.js'
import {
  CONTACTS, CONTACT_LABELS, CUSTOMERS, CUSTOMER_LABELS, JOBS, JOB_LABELS, LANGUAGES, MAX_PHOTOS, MAX_PHOTO_BYTES, TIMINGS, TIMING_LABELS,
  type RequestErrorCode,
} from '../../../src/demos/lp-construction/request/types.js'
import { checkZip } from '../../../src/demos/lp-construction/serviceArea.js'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
/** Under Vercel's 4.5 MB request limit, with room for three photos and a concept. */
const MAX_BYTES = 4_200_000
const RATE_LIMIT = 6
const RATE_WINDOW_S = 3600
const STATUS: Record<RequestErrorCode, number> = { invalid: 400, not_configured: 200, rate_limited: 429, send_failed: 502 }
const AREA_LABELS = { inside: 'inside the 45-minute area', edge: 'at the edge of the area', outside: 'OUTSIDE the area', unknown: 'not on the ZIP list', invalid: 'invalid' } as const

class RequestError extends Error {
  readonly code: RequestErrorCode
  constructor(code: RequestErrorCode) {
    super(code)
    this.code = code
  }
}

const fail = (res: ServerResponse, code: RequestErrorCode) => sendJson(res, { ok: false, error: code }, STATUS[code])

function mailFromEnv(): { apiKey: string; to: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const to = process.env.LP_REQUEST_TO_EMAIL?.trim()
  const from = (process.env.LP_REQUEST_FROM_EMAIL ?? process.env.CONTACT_FROM_EMAIL)?.trim()
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
  try { value = JSON.parse(raw) } catch { throw new RequestError('invalid') }
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

type Attachment = { filename: string; content: string }
function image(value: unknown, filename: string): Attachment {
  const match = typeof value === 'string' ? /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value) : null
  if (!match || match[2].length % 4 !== 0) throw new RequestError('invalid')
  const bytes = Buffer.from(match[2], 'base64')
  if (bytes.length > MAX_PHOTO_BYTES * 1.5 || bytes.toString('base64') !== match[2]) throw new RequestError('invalid')
  return { filename: `${filename}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`, content: match[2] }
}

export default async function request(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if (req.method !== 'POST') return fail(res, 'invalid')
    const body = await readBody(req)

    // Honeypot: answer like a success so a bot has nothing to retry against.
    if (typeof body.company === 'string' && body.company.trim()) return sendJson(res, { ok: true })

    const lang = choice(body.lang, LANGUAGES)
    const customer = choice(body.customer, CUSTOMERS)
    const zip = line(body.zip, 5)
    if (!/^\d{5}$/.test(zip)) throw new RequestError('invalid')
    const jobs = Array.isArray(body.jobs) ? [...new Set(body.jobs.map(job => choice(job, JOBS)))] : []
    if (!jobs.length) throw new RequestError('invalid')
    const timing = choice(body.timing, TIMINGS)
    const contact = choice(body.contact, CONTACTS)
    const name = line(body.name, 120)
    const phone = line(body.phone, 40)
    if (phone.replace(/\D/g, '').length < 10) throw new RequestError('invalid')
    const email = line(body.email, 200, contact === 'email')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new RequestError('invalid')
    const size = line(body.size, 200, false)
    const details = typeof body.details === 'string' ? body.details.trim().slice(0, 2000) : ''

    const photos = Array.isArray(body.photos) ? body.photos : []
    if (photos.length > MAX_PHOTOS) throw new RequestError('invalid')
    const attachments = photos.map((photo, index) => image(photo, `photo-${index + 1}`))
    let ideaLine = ''
    if (body.idea !== null && body.idea !== undefined) {
      const idea = body.idea as Record<string, unknown>
      if (typeof idea !== 'object' || Array.isArray(idea)) throw new RequestError('invalid')
      const style = findStyle(idea.style)
      const finish = findFinish(idea.finish)
      if (!style || !finish || typeof idea.crown !== 'boolean') throw new RequestError('invalid')
      if (idea.render) {
        attachments.push(image(idea.render, 'room-idea-concept'))
        if (idea.photo) attachments.push(image(idea.photo, 'room-idea-original'))
        ideaLine = `Room idea: ${style.label}, ${finish.label.toLowerCase()}${idea.crown ? ', with crown and tall baseboards' : ''} (AI concept attached)`
      } else {
        ideaLine = `Room idea: ${style.label} (their photo is attached)`
      }
    }

    if (await isRateLimited(req, 'trim-request', RATE_LIMIT, RATE_WINDOW_S)) return fail(res, 'rate_limited')
    const mail = mailFromEnv()
    if (!mail) return fail(res, 'not_configured')

    const area = checkZip(zip)
    const text = [
      ...(lang === 'es' ? ['Request sent in SPANISH. Reply in Spanish.', ''] : []),
      `Name: ${name}`,
      `Phone: ${phone}`,
      ...(email ? [`Email: ${email}`] : []),
      `Prefers: ${CONTACT_LABELS[contact]}`,
      '',
      `Customer: ${CUSTOMER_LABELS[customer]}`,
      `ZIP: ${zip} (${AREA_LABELS[area]})`,
      `Work: ${jobs.map(job => JOB_LABELS[job]).join(', ')}`,
      `Timing: ${TIMING_LABELS[timing]}`,
      ...(size ? [`Size: ${size}`] : []),
      ...(ideaLine ? [ideaLine] : []),
      ...(attachments.length ? [`Attachments: ${attachments.length}`] : []),
      ...(details ? ['', 'Details:', details] : []),
      '',
    ].join('\n')

    let response: Response
    try {
      response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: { authorization: `Bearer ${mail.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: mail.from,
          to: [mail.to],
          ...(email ? { reply_to: email } : {}),
          subject: `${lang === 'es' ? '[Español] ' : ''}Estimate request: ${name}, ${zip}`,
          text,
          ...(attachments.length ? { attachments } : {}),
        }),
        signal: AbortSignal.timeout(15_000),
      })
    } catch {
      return fail(res, 'send_failed')
    }
    if (!response.ok) return fail(res, 'send_failed')
    sendJson(res, { ok: true })
  } catch (error) {
    if (res.headersSent) return
    if (error instanceof RequestError) return fail(res, error.code)
    console.error('[trim-request] unexpected:', error)
    fail(res, 'send_failed')
  }
}
