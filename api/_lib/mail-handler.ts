import type { IncomingMessage, ServerResponse } from 'node:http'
import { DemoError, demoJson, nodeDemoOrigin, nodeHeader } from './demo-access.js'
import { mailIdentity, mailLogin } from './mail-auth.js'
import { mailView, prepareMail, saveMailSignature, sendMail } from './mail-messages.js'

export const config = { maxDuration: 60, api: { bodyParser: false } }
const MAX_REQUEST_BYTES = 4_400_000

async function bodyOf(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:\s*;|$)/i.test(nodeHeader(req, 'content-type') ?? '')) throw new DemoError('invalid_fields', 400)
  const length = Number(nodeHeader(req, 'content-length') ?? 0)
  if (!Number.isFinite(length) || length < 0 || length > MAX_REQUEST_BYTES) throw new DemoError('too_large', 413)
  const parsed = (req as IncomingMessage & { body?: unknown }).body
  let raw: string
  if (parsed !== undefined) {
    raw = Buffer.isBuffer(parsed) ? parsed.toString('utf8') : typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
  } else {
    raw = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = []; let bytes = 0; let settled = false
      const finish = (error?: Error) => {
        if (settled) return
        settled = true; clearTimeout(timer)
        if (error) reject(error); else resolve(Buffer.concat(chunks).toString('utf8'))
      }
      const timer = setTimeout(() => finish(new DemoError('invalid_fields', 408)), 10000)
      req.on('data', (chunk: Buffer | string) => {
        if (settled) return
        const buffer = Buffer.from(chunk); bytes += buffer.length
        if (bytes > MAX_REQUEST_BYTES) { finish(new DemoError('too_large', 413)); return }
        chunks.push(buffer)
      })
      req.on('end', () => finish())
      req.on('error', () => finish(new DemoError('invalid_fields', 400)))
      req.on('aborted', () => finish(new DemoError('invalid_fields', 400)))
    })
  }
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > MAX_REQUEST_BYTES) throw new DemoError('too_large', 413)
  const body: unknown = JSON.parse(raw)
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new DemoError('invalid_fields', 400)
  return body as Record<string, unknown>
}

export default async function mailHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('allow', 'GET, POST'); throw new DemoError('method_not_allowed', 405) }
    const origin = nodeDemoOrigin(req)
    if (req.method === 'GET') {
      const email = await mailIdentity(req, origin)
      demoJson(res, 200, email ? await mailView(email) : { authenticated: false })
      return
    }
    if (nodeHeader(req, 'origin') !== origin || nodeHeader(req, 'sec-fetch-site') === 'cross-site') throw new DemoError('forbidden', 403)
    const body = await bodyOf(req)
    if (body.action === 'send-code' || body.action === 'verify-code' || body.action === 'logout') {
      const email = await mailLogin(req, res, origin, body)
      demoJson(res, 200, email ? { ok: true, ...await mailView(email) } : { ok: true, authenticated: false })
      return
    }
    const email = await mailIdentity(req, origin)
    if (!email) throw new DemoError('access_required', 401)
    if (body.action === 'save-signature') {
      await saveMailSignature(email, body.sender, body.html)
      demoJson(res, 200, { ok: true, ...await mailView(email) })
      return
    }
    if (body.action === 'send' || body.action === 'retry-send') {
      if (body.action === 'send') await prepareMail(email, body)
      demoJson(res, 200, { ok: true, message: await sendMail(email, body.id) })
      return
    }
    throw new DemoError('invalid_fields', 400)
  } catch (error) {
    const failure = error instanceof DemoError ? error : new DemoError(error instanceof SyntaxError ? 'invalid_fields' : 'temporarily_unavailable', error instanceof SyntaxError ? 400 : 503)
    demoJson(res, failure.status, { ok: false, error: failure.code })
  }
}
