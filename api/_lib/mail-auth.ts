import { randomBytes, randomInt } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { isIP } from 'node:net'
import { DemoError, demoCookie, nodeHeader, readDemoCookie } from './demo-access.js'
import { mailGet, mailHash, mailKey, mailLimit, mailRedis } from './mail-store.js'

export const MAIL_SESSION_COOKIE = 'wallace_mail_session'
export const MAIL_PENDING_COOKIE = 'wallace_mail_pending'
const SESSION_SECONDS = 8 * 3600
type Session = { email: string; origin: string }
type Challenge = Session & { digest: string; attempts: number; expiresAt: number }

export function internalEmail(value: unknown): string {
  if (typeof value !== 'string') throw new DemoError('work_email_required', 400)
  const email = value.trim().toLowerCase()
  if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@wallaceshift\.com$/.test(email) || email.startsWith('.') || email.includes('..') || email.includes('.@')) throw new DemoError('work_email_required', 403)
  return email
}

export function mailApiKey(): string {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) throw new DemoError('email_not_configured', 503)
  return key
}

export async function mailIdentity(req: IncomingMessage, origin: string): Promise<string | null> {
  const token = readDemoCookie(nodeHeader(req, 'cookie'), MAIL_SESSION_COOKIE)
  if (!/^[a-f0-9]{64}$/.test(token)) return null
  const session = await mailGet<Session>(mailKey(`session:${mailHash(token)}`))
  if (!session || session.origin !== origin) return null
  try { return internalEmail(session.email) } catch { return null }
}

const RESERVE = `-- wallace-mail:challenge
if redis.call('EXISTS', KEYS[2]) == 1 then return 0 end
if tonumber(redis.call('GET', KEYS[3]) or '0') >= 15 then return 0 end
if tonumber(redis.call('GET', KEYS[4]) or '0') >= 5 then return 0 end
if tonumber(redis.call('GET', KEYS[5]) or '0') >= 100 then return 0 end
for i = 3, 5 do
  local count = redis.call('INCR', KEYS[i])
  if count == 1 then redis.call('EXPIRE', KEYS[i], i == 5 and 86400 or 3600) end
end
redis.call('SET', KEYS[2], '1', 'EX', 60)
redis.call('SET', KEYS[1], ARGV[1], 'EX', 600)
return 1`
const VERIFY = `-- wallace-mail:verify
local raw = redis.call('GET', KEYS[1])
if not raw then return {'code_expired'} end
local item = cjson.decode(raw)
if item.expiresAt <= tonumber(ARGV[3]) then redis.call('DEL', KEYS[1]); return {'code_expired'} end
if item.origin ~= ARGV[2] then return {'code_invalid'} end
if item.attempts >= 5 then return {'rate_limited'} end
item.attempts = item.attempts + 1
if item.digest ~= ARGV[1] then
  redis.call('SET', KEYS[1], cjson.encode(item), 'KEEPTTL')
  return {'code_invalid'}
end
redis.call('DEL', KEYS[1])
return {'ok', item.email}`

export async function mailLogin(req: IncomingMessage, res: ServerResponse, origin: string, body: Record<string, unknown>): Promise<string | null> {
  const cookie = nodeHeader(req, 'cookie')
  if (body.action === 'logout') {
    const session = readDemoCookie(cookie, MAIL_SESSION_COOKIE)
    const pending = readDemoCookie(cookie, MAIL_PENDING_COOKIE)
    if (/^[a-f0-9]{64}$/.test(session)) await mailRedis(['DEL', mailKey(`session:${mailHash(session)}`)])
    if (/^[a-f0-9]{64}$/.test(pending)) await mailRedis(['DEL', mailKey(`challenge:${mailHash(pending)}`)])
    res.setHeader('set-cookie', [demoCookie(MAIL_SESSION_COOKIE, '', origin, 0), demoCookie(MAIL_PENDING_COOKIE, '', origin, 0)])
    return null
  }
  if (body.action === 'send-code') {
    const email = internalEmail(body.email)
    const key = mailApiKey()
    const from = process.env.MAIL_LOGIN_FROM_EMAIL?.trim() || process.env.CONTACT_FROM_EMAIL?.trim()
    if (!from || /[\r\n]/.test(from)) throw new DemoError('email_not_configured', 503)
    // Trust only Vercel's own single-client-IP header on Vercel. Local requests
    // use their socket peer; a caller-supplied X-Forwarded-For cannot reset limits.
    const ip = process.env.VERCEL === '1' ? nodeHeader(req, 'x-vercel-forwarded-for') : req.socket?.remoteAddress
    if (!ip || !isIP(ip)) throw new DemoError('forbidden', 403)
    // A short request limit bounds abuse separately from actual code budgets.
    // Cooldown clicks must never consume the remaining hourly email allowance.
    await mailLimit(`login-attempt-ip:${mailHash(ip)}`, 60, 60)
    const now = Date.now()
    const nonce = randomBytes(32).toString('hex')
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    const challenge: Challenge = { email, origin, digest: mailHash(`${nonce}:${code}`), attempts: 0, expiresAt: now + 600_000 }
    const challengeKey = mailKey(`challenge:${mailHash(nonce)}`)
    const reserved = await mailRedis(['EVAL', RESERVE, 5, challengeKey, mailKey(`cooldown:${mailHash(email)}`),
      mailKey(`login-ip:${mailHash(ip)}:${Math.floor(now / 3_600_000)}`),
      mailKey(`login-email:${mailHash(email)}:${Math.floor(now / 3_600_000)}`),
      mailKey(`login-global:${Math.floor(now / 86_400_000)}`), JSON.stringify(challenge)])
    if (reserved === 0) throw new DemoError('rate_limited', 429)
    if (reserved !== 1) throw new DemoError('storage_unavailable', 503)
    try {
      const result = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', 'idempotency-key': `mail-login/${nonce}` },
        body: JSON.stringify({ from, to: [email], subject: 'Your Wallace Shift Mail sign in code', text: `Your Wallace Shift Mail sign in code is ${code}. It expires in 10 minutes. Do not share this code. If you did not request it, you can ignore this message.` }),
        signal: AbortSignal.timeout(10000),
      })
      if (!result.ok) throw new Error('Email unavailable')
    } catch {
      await mailRedis(['DEL', challengeKey])
      throw new DemoError('email_unavailable', 503)
    }
    res.setHeader('set-cookie', demoCookie(MAIL_PENDING_COOKIE, nonce, origin, 600))
    return null
  }
  if (body.action !== 'verify-code' || typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) throw new DemoError('code_invalid', 400)
  const nonce = readDemoCookie(cookie, MAIL_PENDING_COOKIE)
  if (!/^[a-f0-9]{64}$/.test(nonce)) throw new DemoError('code_expired', 400)
  const result = await mailRedis(['EVAL', VERIFY, 1, mailKey(`challenge:${mailHash(nonce)}`), mailHash(`${nonce}:${body.code}`), origin, Date.now()])
  if (!Array.isArray(result) || result[0] !== 'ok') {
    const error = Array.isArray(result) && ['code_expired', 'code_invalid', 'rate_limited'].includes(result[0]) ? result[0] as string : 'storage_unavailable'
    throw new DemoError(error, error === 'rate_limited' ? 429 : error === 'storage_unavailable' ? 503 : 400)
  }
  const email = internalEmail(result[1])
  const token = randomBytes(32).toString('hex')
  await mailRedis(['SET', mailKey(`session:${mailHash(token)}`), JSON.stringify({ email, origin }), 'EX', SESSION_SECONDS])
  const oldToken = readDemoCookie(cookie, MAIL_SESSION_COOKIE)
  if (/^[a-f0-9]{64}$/.test(oldToken)) await mailRedis(['DEL', mailKey(`session:${mailHash(oldToken)}`)])
  res.setHeader('set-cookie', [demoCookie(MAIL_SESSION_COOKIE, token, origin, SESSION_SECONDS), demoCookie(MAIL_PENDING_COOKIE, '', origin, 0)])
  return email
}
