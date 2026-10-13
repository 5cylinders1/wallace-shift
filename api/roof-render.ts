import type { IncomingMessage, ServerResponse } from 'node:http'
import { requestAccess, reserveRender } from './_lib/roof-render/access.js'
import { MAX_BODY_BYTES, RenderError, validateRequest } from './_lib/roof-render/validation.js'
import { MODEL } from './_lib/roof-render/validation.js'
import { renderRoof } from './_lib/roof-render/provider.js'
import type { RenderResult } from './_lib/roof-render/provider.js'

export const config = { maxDuration: 180 }

const CACHE_MS = 30 * 60_000
const FAILURE_COOLDOWN_MS = 5 * 60_000
const MAX_CACHE_BYTES = 12 * 1024 * 1024
const cache = new Map<string, { result: RenderResult; expires: number; bytes: number }>()
const inFlight = new Map<string, Promise<RenderResult>>()
const cooldown = new Map<string, number>()
let active = 0

function send(res: ServerResponse, body: unknown, status = 200): void {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'private, no-store')
  res.setHeader('x-content-type-options', 'nosniff')
  res.end(JSON.stringify(body))
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  if ((req.headers['content-type'] ?? '').toString().split(';')[0].trim() !== 'application/json') throw new RenderError('invalid', 'Send the photograph as a JSON request.')
  const declaredLength = Number(req.headers['content-length'] ?? 0)
  if (!Number.isSafeInteger(declaredLength) || declaredLength < 0 || declaredLength > MAX_BODY_BYTES) throw new RenderError('photo_too_large', 'Please use a photo smaller than 2 MB.', 413)
  const parsed = (req as IncomingMessage & { body?: unknown }).body
  if (parsed !== undefined) {
    const serialized = typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
    if (!serialized || Buffer.byteLength(serialized) > MAX_BODY_BYTES) throw new RenderError('photo_too_large', 'Please use a photo smaller than 2 MB.', 413)
    try { return typeof parsed === 'string' ? JSON.parse(parsed) as unknown : parsed } catch { throw new RenderError('invalid', 'The photo request could not be read.') }
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let length = 0
    const timer = setTimeout(() => fail(new RenderError('invalid', 'The photo upload took too long. Please try again.', 408)), 10_000)
    const cleanup = () => { clearTimeout(timer); req.off('data', data); req.off('end', end); req.off('error', fail); req.off('aborted', aborted) }
    const fail = (error: unknown) => { cleanup(); req.resume(); reject(error) }
    const aborted = () => fail(new RenderError('invalid', 'The photo upload was interrupted. Please try again.'))
    const data = (chunk: Buffer | string) => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      length += bytes.length
      if (length > MAX_BODY_BYTES) { fail(new RenderError('photo_too_large', 'Please use a photo smaller than 2 MB.', 413)); return }
      chunks.push(bytes)
    }
    const end = () => {
      cleanup()
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown) } catch { reject(new RenderError('invalid', 'The photo request could not be read.')) }
    }
    req.on('data', data).on('end', end).on('error', fail).on('aborted', aborted)
  })
}

function tidyCache(): void {
  const now = Date.now()
  for (const [key, value] of cache) if (value.expires <= now) cache.delete(key)
  for (const [key, expires] of cooldown) if (expires <= now) cooldown.delete(key)
  let bytes = [...cache.values()].reduce((total, entry) => total + entry.bytes, 0)
  for (const [key, value] of cache) {
    if (bytes <= MAX_CACHE_BYTES && cache.size <= 12) break
    cache.delete(key)
    bytes -= value.bytes
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if (req.method === 'GET') {
      let enabled = false
      let message = 'Live photo studies are available in the private studio preview.'
      try { requestAccess(req); enabled = true } catch (error) { if (error instanceof RenderError) message = error.message }
      const configured = Boolean(process.env.OPENAI_API_KEY?.trim())
      send(res, { ok: true, enabled: enabled && configured, configured, model: MODEL, qualities: ['low', 'medium'], maxPhotoBytes: 2 * 1024 * 1024, message: enabled && configured ? 'Photo studies are available.' : configured ? message : 'The photo studio is waiting for its OpenAI connection.' })
      return
    }
    if (req.method !== 'POST') { res.setHeader('allow', 'GET, POST'); throw new RenderError('invalid', 'Use POST to create a photo study.', 405) }
    const access = requestAccess(req)
    const request = validateRequest(await readBody(req))
    const apiKey = process.env.OPENAI_API_KEY?.trim()
    if (!apiKey) throw new RenderError('not_configured', 'The photo studio is waiting for its OpenAI connection.', 503)
    // Exact-photo results are retained briefly in this process, scoped to the
    // connection. Neither the uploaded original nor a public cache is stored.
    const key = `${access.visitor}:${request.fingerprint}`
    tidyCache()
    const saved = cache.get(key)
    if (saved) { send(res, { ...saved.result, cached: true, usage: null, costUsd: 0 }); return }
    const pending = inFlight.get(key)
    if (pending) { send(res, { ...await pending, cached: true, usage: null, costUsd: 0 }); return }
    if (cooldown.has(key)) throw new RenderError('busy', 'This study is cooling down after an interrupted request. Wait a few minutes to avoid paying twice.', 503)
    if (active >= 2) throw new RenderError('busy', 'Two photo studies are already in progress. Please try again shortly.', 503)
    active++
    const work = (async () => {
      try {
        await reserveRender(access)
        const result = await renderRoof(request, apiKey)
        cache.set(key, { result, expires: Date.now() + CACHE_MS, bytes: Buffer.byteLength(result.image) })
        tidyCache()
        return result
      } catch (error) {
        // Once a provider call may have started, a short cooldown protects
        // against accidentally buying the same study again after a timeout.
        if (!(error instanceof RenderError) || ['timed_out', 'upstream', 'busy'].includes(error.code)) cooldown.set(key, Date.now() + FAILURE_COOLDOWN_MS)
        throw error
      } finally { active--; inFlight.delete(key) }
    })()
    inFlight.set(key, work)
    send(res, await work)
  } catch (error) {
    const safe = error instanceof RenderError ? error : new RenderError('upstream', 'The photo studio could not complete this request. Please try again later.', 502)
    if (!res.headersSent) send(res, { ok: false, error: safe.code, message: safe.message }, safe.status)
  }
}
