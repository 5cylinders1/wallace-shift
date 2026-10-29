import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { incrementWindow, limiterStore } from './limiter-store.js'
import { agreementText, demoAgreement } from '../../src/content/demoAgreement.js'

export const DEMO_ACCESS_SECONDS = 72 * 60 * 60
export const DEMO_COOKIE = 'wallace_demo_access'
export const DEMO_PENDING_COOKIE = 'wallace_demo_pending'
export const DEMO_PROOF_COOKIE = 'wallace_demo_verified'
export const DEMO_ADMIN_COOKIE = 'wallace_demo_admin'
export const DEMO_ADMIN_PENDING_COOKIE = 'wallace_demo_admin_pending'
export const DEMO_ADMIN_SECONDS = 30 * 24 * 60 * 60
export const DEMO_AGREEMENT_HASH = createHash('sha256').update(agreementText).digest('hex')
export const DEMO_VERIFICATION_SECONDS = 10 * 60
export const PRIVATE_CACHE = 'private, no-store, max-age=0'
export const DEMO_PATHS = {
  roofers: '/northvane',
  'roofers-2': '/alder-stone',
  'roofers-3': '/contour',
  'roofers-4': '/halcyon',
  'roofers-5': '/velar',
  'roofers-6': '/stratum',
  foundation: '/datum',
  cabinetry: '/tambour',
  'cabinetry-2': '/mitre',
  pools: '/stillwater',
  'roofers-dashboard': '/roofing-dashboard',
} as const
export type DemoKey = keyof typeof DEMO_PATHS
type GrantBase = { v: 2; origin: string; demo: DemoKey; iat: number; exp: number; nonce: string; recipientHash: string }
export type InviteGrant = GrantBase & { kind: 'invite' }
export type SessionGrant = GrantBase & { kind: 'session'; agreementVersion: string; agreementHash: string; acceptanceId: string }
export type ProofGrant = GrantBase & { kind: 'proof'; verifiedEmail: string }
export type AdminPendingGrant = GrantBase & { kind: 'admin-pending' }
export type AdminSessionGrant = GrantBase & { kind: 'admin-session' }
export type DemoGrant = InviteGrant | SessionGrant | ProofGrant | AdminPendingGrant | AdminSessionGrant
const PUBLIC_PREVIEWS = new Set(['/demos/roofers-3/preview.jpg', '/demos/roofers-4/preview.jpg', '/demos/roofers-5/hero-poster.jpg', '/demos/roofers-6/preview.jpg', '/demos/foundation/preview.jpg', '/demos/cabinetry/preview.jpg', '/demos/cabinetry-2/preview.jpg', '/demos/pools/preview.jpg'])
/** Collection landers and the real-business concepts (Bucyrus, Trawsome, Complete Painting) are public; other demos are gated. */
const PUBLIC_DEMO_DIRS = new Set(['roofers-offer', 'contractors', 'bucyrus-auto', 'lawn', 'painting'])
const COUNTER_ENV = ['RATE_LIMIT_REDIS_URL', 'RATE_LIMIT_REDIS_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']
const counters = new Map<string, { count: number; until: number }>()

export class DemoError extends Error {
  readonly code: string
  readonly status: number
  constructor(code: string, status: number) { super(code); this.code = code; this.status = status }
}

export function demoKey(value: unknown): DemoKey {
  return typeof value === 'string' && Object.hasOwn(DEMO_PATHS, value) ? value as DemoKey : 'roofers'
}

/** Decode before matching so encoded slashes, dots and aliases cannot skip the gate. */
export function normalizedDemoPath(pathname: string): string {
  let path = pathname.split('?')[0]
  for (let attempt = 0; attempt < 4; attempt++) {
    try { const decoded = decodeURIComponent(path); if (decoded === path) break; path = decoded } catch { break }
  }
  path = path.replace(/\\/g, '/').replace(/\/{2,}/g, '/')
  return new URL(path.startsWith('/') ? `https://local.invalid${path}` : `https://local.invalid/${path}`).pathname
}

function protectedPath(pathname: string): { demo: DemoKey; document: boolean } | null {
  const path = normalizedDemoPath(pathname)
  if (PUBLIC_PREVIEWS.has(path)) return null
  for (const [demo, alias] of Object.entries(DEMO_PATHS)) {
    if (path === alias || path.startsWith(`${alias}/`)) return { demo: demo as DemoKey, document: !/\.[^/]+$/.test(path) || /\.html$/.test(path) }
  }
  const parts = path.split('/')
  if (parts[1] === 'demos' && !PUBLIC_DEMO_DIRS.has(parts[2])) {
    return { demo: demoKey(parts[2]), document: !/\.[^/]+$/.test(path) || /\.html$/.test(path) }
  }
  if (path === '/demo-assets' || path.startsWith('/demo-assets/') || /^\/api\/roof-/.test(path)) return { demo: 'roofers', document: false }
  if (/^\/src\/demos(?:\/|$)/.test(path) && !/^\/src\/demos\/(?:roofers-offer|contractors|bucyrus-auto|lawn|painting)(?:\/|$)/.test(path)) return { demo: 'roofers', document: false }
  if (/^\/src\/roofing-dashboard(?:\/|$)/.test(path)) return { demo: 'roofers-dashboard', document: false }
  // Vite also accepts public-file and absolute-filesystem paths during local development.
  if (path.startsWith('/dist/')) return protectedPath(path.slice('/dist'.length))
  if (path.startsWith('/public/demos/') || path.startsWith('/public/demo-assets/')) return protectedPath(path.slice('/public'.length))
  if (path.startsWith('/@fs/') && /\/(?:src\/demos|src\/roofing-dashboard|(?:public|dist)\/demos|(?:public|dist)\/demo-assets)(?:\/|$)/.test(path)) return { demo: 'roofers', document: false }
  return null
}

export const isProtectedDemoPath = (pathname: string): boolean => protectedPath(pathname) !== null

function secret(): string {
  const value = process.env.DEMO_ACCESS_SECRET ?? ''
  if (value.trim().length < 32) throw new DemoError('not_configured', 503)
  return value
}

export function demoAccessOrigin(): string {
  let origin: URL
  try { origin = new URL(process.env.DEMO_ACCESS_ORIGIN ?? 'https://roofers.wallaceshift.com') } catch { throw new DemoError('not_configured', 503) }
  const local = process.env.NODE_ENV !== 'production' && !process.env.VERCEL && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
  if ((origin.protocol !== 'https:' && !(local && origin.protocol === 'http:')) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new DemoError('not_configured', 503)
  return origin.origin
}

export function signDemoGrant(grant: DemoGrant): string {
  const data = Buffer.from(JSON.stringify(grant)).toString('base64url')
  return `${data}.${createHmac('sha256', secret()).update(data).digest('base64url')}`
}

export function normalizeDemoEmail(value: unknown): string {
  if (typeof value !== 'string') throw new DemoError('invalid', 400)
  const email = value.trim().toLowerCase()
  if (email.length > 254 || [...email].some(character => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DemoError('invalid', 400)
  return email
}

export function recipientEmailHash(email: string): string {
  return createHmac('sha256', secret()).update(`demo-recipient:${normalizeDemoEmail(email)}`).digest('hex')
}

export function verificationCodeHash(nonce: string, code: string): string {
  return createHmac('sha256', secret()).update(`demo-code:${nonce}:${code}`).digest('hex')
}

export function createDemoInvite(demo: DemoKey, email: string, now = Math.floor(Date.now() / 1000)): string {
  return signDemoGrant({ v: 2, kind: 'invite', origin: demoAccessOrigin(), demo, recipientHash: recipientEmailHash(email), iat: now, exp: now + DEMO_ACCESS_SECONDS, nonce: randomBytes(16).toString('hex') })
}

/** Only this server-configured mailbox may become an administrator. */
export function demoAdminEmail(): string {
  try { return normalizeDemoEmail(process.env.DEMO_ADMIN_EMAIL ?? process.env.CONTACT_TO_EMAIL) }
  catch { throw new DemoError('not_configured', 503) }
}

export function createDemoAdminGrant(kind: 'admin-pending' | 'admin-session', origin: string, now = Math.floor(Date.now() / 1000)): string {
  return signDemoGrant({ v: 2, kind, origin, demo: 'roofers', recipientHash: recipientEmailHash(demoAdminEmail()), iat: now, exp: now + (kind === 'admin-session' ? DEMO_ADMIN_SECONDS : DEMO_VERIFICATION_SECONDS), nonce: randomBytes(16).toString('hex') })
}

export function verifyDemoGrant<K extends DemoGrant['kind']>(token: string, origin: string, kind: K, now = Math.floor(Date.now() / 1000)): Extract<DemoGrant, { kind: K }> | null {
  const signingSecret = secret()
  if (token.length > 4096 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token)) return null
  const [data, signature] = token.split('.')
  const expected = createHmac('sha256', signingSecret).update(data).digest()
  const supplied = Buffer.from(signature, 'base64url')
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null
  try {
    const grant = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as DemoGrant
    const lifetime = kind === 'admin-session' ? DEMO_ADMIN_SECONDS : kind === 'admin-pending' ? DEMO_VERIFICATION_SECONDS : DEMO_ACCESS_SECONDS
    if (grant.v !== 2 || grant.kind !== kind || grant.origin !== origin || !Object.hasOwn(DEMO_PATHS, grant.demo) || !Number.isInteger(grant.iat) || !Number.isInteger(grant.exp) || grant.iat > now + 30 || grant.exp <= now || grant.exp <= grant.iat || grant.exp - grant.iat > lifetime || typeof grant.nonce !== 'string' || !/^[a-f0-9]{32}$/.test(grant.nonce) || typeof grant.recipientHash !== 'string' || !/^[a-f0-9]{64}$/.test(grant.recipientHash)) return null
    if ((grant.kind === 'admin-pending' || grant.kind === 'admin-session') && grant.recipientHash !== recipientEmailHash(demoAdminEmail())) return null
    if (grant.kind === 'session' && (grant.agreementVersion !== demoAgreement.version || grant.agreementHash !== DEMO_AGREEMENT_HASH || typeof grant.acceptanceId !== 'string' || !/^[a-f0-9]{64}$/.test(grant.acceptanceId))) return null
    if (grant.kind === 'proof' && (grant.exp - grant.iat > DEMO_VERIFICATION_SECONDS || recipientEmailHash(grant.verifiedEmail) !== grant.recipientHash)) return null
    return grant as Extract<DemoGrant, { kind: K }>
  } catch { return null }
}

export function readDemoCookie(header: string | null | undefined, name: string): string {
  const values = header?.split(';').map(value => value.trim()).filter(value => value.startsWith(`${name}=`)) ?? []
  return values.length === 1 ? values[0].slice(name.length + 1) : ''
}

export function demoCookie(name: string, token: string, origin: string, remaining: number): string {
  return `${name}=${token}; Path=/; Max-Age=${Math.max(0, Math.floor(remaining))}; HttpOnly; SameSite=Lax${origin.startsWith('https:') ? '; Secure' : ''}`
}

export async function gateDemoRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url)
  const protectedRoute = protectedPath(url.pathname)
  if (!protectedRoute) return null
  let granted = false
  try {
    granted = verifyDemoGrant(readDemoCookie(request.headers.get('cookie'), DEMO_COOKIE), url.origin, 'session') !== null
      || verifyDemoGrant(readDemoCookie(request.headers.get('cookie'), DEMO_ADMIN_COOKIE), url.origin, 'admin-session') !== null
  } catch { /* Missing configuration must not publish private files. */ }
  if (granted) return null
  const headers = { 'cache-control': PRIVATE_CACHE, 'cdn-cache-control': 'no-store', 'vercel-cdn-cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-robots-tag': 'noindex, nofollow' }
  if (protectedRoute.document && (request.method === 'GET' || request.method === 'HEAD')) {
    return new Response(null, { status: 303, headers: { ...headers, location: `/request-demo/?demo=${protectedRoute.demo}` } })
  }
  return Response.json({ ok: false, error: 'access_required' }, { status: 403, headers })
}

export function nodeHeader(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name]
  return typeof value === 'string' ? value : undefined
}

/** Production hosts must be explicitly known. Host is never used to construct invitation links. */
export function nodeDemoOrigin(req: IncomingMessage): string {
  const host = nodeHeader(req, 'host') ?? ''
  const configured = demoAccessOrigin()
  for (const origin of [configured, 'https://wallaceshift.com', 'https://www.wallaceshift.com', 'https://roofers.wallaceshift.com', 'https://contractors.wallaceshift.com']) if (new URL(origin).host === host) return origin
  const localHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host)
  const localPeer = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket?.remoteAddress ?? '')
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL && localHost && localPeer) return `http://${host}`
  throw new DemoError('forbidden', 403)
}

export function setDemoPrivateHeaders(res: ServerResponse): void {
  res.setHeader('cache-control', PRIVATE_CACHE)
  res.setHeader('cdn-cache-control', 'no-store')
  res.setHeader('vercel-cdn-cache-control', 'no-store')
  res.setHeader('referrer-policy', 'no-referrer')
  res.setHeader('x-robots-tag', 'noindex, nofollow')
}

export function demoJson(res: ServerResponse, status: number, body: unknown): void {
  setDemoPrivateHeaders(res)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

/** Three requests per IP per hour and 50 per server/day when Redis is absent.
 * The fallback is per-instance only; configure the shared store for deployment-wide limits.
 * Configured but unavailable/invalid Redis always fails closed.
 */
export async function reserveDemoRequest(req: IncomingMessage): Promise<void> {
  const store = limiterStore()
  if (!store && COUNTER_ENV.some(name => process.env[name]?.trim())) throw new DemoError('temporarily_unavailable', 503)
  const ip = process.env.VERCEL === '1' ? nodeHeader(req, 'x-vercel-forwarded-for') : req.socket?.remoteAddress
  if (!ip || !/^[\da-fA-F:.]+$/.test(ip)) throw new DemoError('forbidden', 403)
  const visitor = createHash('sha256').update(ip).digest('hex').slice(0, 32)
  const now = Date.now()
  const checks: [string, number, number][] = [[`demo-request:ip:${visitor}:${Math.floor(now / 3_600_000)}`, 3600, 3], [`demo-request:day:${Math.floor(now / 86_400_000)}`, 86_400, 50]]
  for (const [key, ttl, cap] of checks) {
    let count: number | null
    if (store) count = await incrementWindow(store, key, ttl)
    else {
      for (const [storedKey, value] of counters) if (value.until <= now) counters.delete(storedKey)
      const previous = counters.get(key)
      const current = { count: (previous?.count ?? 0) + 1, until: previous?.until ?? now + ttl * 1000 }
      counters.set(key, current)
      count = current.count
    }
    if (count === null) throw new DemoError('temporarily_unavailable', 503)
    if (count > cap) throw new DemoError('rate_limited', 429)
  }
}
