import { createHash } from 'node:crypto'
import { DemoError, DEMO_VERIFICATION_SECONDS } from './demo-access.js'
import type { InviteGrant } from './demo-access.js'
import { limiterStore } from './limiter-store.js'
import type { LimiterStore } from './limiter-store.js'

export interface DemoAcceptanceRecord {
  id: string
  inviteId: string
  person: string
  businessName: string
  verifiedEmail: string
  acceptedAt: string
  agreementVersion: string
  agreementHash: string
  agreementText: string
  accepted: true
  authority: true
}

/** Verification and acceptance always require a shared, durable store. */
export function demoAgreementStore(): LimiterStore {
  const dedicatedUrl = process.env.DEMO_AUDIT_REDIS_URL?.trim()
  const dedicatedToken = process.env.DEMO_AUDIT_REDIS_TOKEN?.trim()
  let store: LimiterStore | null
  if (dedicatedUrl || dedicatedToken) {
    if (!dedicatedUrl || !dedicatedToken) throw new DemoError('not_configured', 503)
    store = { url: dedicatedUrl.replace(/\/+$/, ''), token: dedicatedToken, from: 'DEMO_AUDIT_REDIS_URL' }
  } else store = limiterStore()
  if (!store) throw new DemoError('not_configured', 503)
  try {
    const url = new URL(store.url)
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('invalid URL')
  } catch { throw new DemoError('not_configured', 503) }
  return store
}

async function evaluate(script: string, keys: string[], args: string[]): Promise<unknown> {
  const store = demoAgreementStore()
  try {
    const response = await fetch(`${store.url}/pipeline`, {
      method: 'POST',
      headers: { authorization: `Bearer ${store.token}`, 'content-type': 'application/json' },
      signal: AbortSignal.timeout(3000),
      body: JSON.stringify([['EVAL', script, String(keys.length), ...keys, ...args]]),
    })
    if (!response.ok) throw new Error('store unavailable')
    const result = await response.json() as Array<{ result?: unknown; error?: unknown }>
    if (!Array.isArray(result) || result.length !== 1 || result[0]?.error || !Object.hasOwn(result[0] ?? {}, 'result')) throw new Error('store unavailable')
    return result[0].result
  } catch { throw new DemoError('unavailable', 503) }
}

// One atomic operation reserves the email budget and the next single-use code.
const RESERVE_CODE = `-- demo-agreement:reserve-code
if redis.call('EXISTS', KEYS[2]) == 1 then return 'rate_limited' end
if tonumber(redis.call('GET', KEYS[3]) or '0') >= 3 then return 'rate_limited' end
if tonumber(redis.call('GET', KEYS[4]) or '0') >= 200 then return 'rate_limited' end
redis.call('INCR', KEYS[3])
redis.call('EXPIRE', KEYS[3], 3600, 'NX')
redis.call('INCR', KEYS[4])
redis.call('EXPIRE', KEYS[4], 86400, 'NX')
redis.call('SET', KEYS[2], '1', 'EX', 60)
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
return 'ok'`

type VerificationChallenge = Pick<InviteGrant, 'nonce' | 'recipientHash' | 'exp'>
type VerificationNamespace = 'demo-agreement' | 'demo-admin'

export async function reserveVerificationCode(invite: VerificationChallenge, email: string, codeHash: string, now = Math.floor(Date.now() / 1000), namespace: VerificationNamespace = 'demo-agreement'): Promise<void> {
  const ttl = Math.min(DEMO_VERIFICATION_SECONDS, invite.exp - now)
  if (ttl <= 0) throw new DemoError('invite_expired', 403)
  const result = await evaluate(RESERVE_CODE, [
    `${namespace}:code:${invite.nonce}`,
    `${namespace}:cooldown:${namespace === 'demo-admin' ? invite.recipientHash : invite.nonce}`,
    `${namespace}:send:${invite.recipientHash}:${Math.floor(now / 3600)}`,
    `${namespace}:send:day:${Math.floor(now / 86400)}`,
  ], [JSON.stringify({ email, recipientHash: invite.recipientHash, codeHash, attempts: 0, expiresAt: now + ttl }), String(ttl)])
  if (result === 'rate_limited') throw new DemoError('rate_limited', 429)
  if (result !== 'ok') throw new DemoError('unavailable', 503)
}

const VERIFY_CODE = `-- demo-agreement:verify-code
local raw = redis.call('GET', KEYS[1])
if not raw then return {'code_expired'} end
local code = cjson.decode(raw)
if code.expiresAt <= tonumber(ARGV[3]) then redis.call('DEL', KEYS[1]); return {'code_expired'} end
if code.recipientHash ~= ARGV[2] then return {'code_invalid'} end
if code.attempts >= 5 then return {'rate_limited'} end
code.attempts = code.attempts + 1
if code.codeHash ~= ARGV[1] then
  redis.call('SET', KEYS[1], cjson.encode(code), 'KEEPTTL')
  return {'code_invalid'}
end
redis.call('DEL', KEYS[1])
return {'ok', code.email}`

export async function consumeVerificationCode(invite: VerificationChallenge, codeHash: string, now = Math.floor(Date.now() / 1000), namespace: VerificationNamespace = 'demo-agreement'): Promise<string> {
  const result = await evaluate(VERIFY_CODE, [`${namespace}:code:${invite.nonce}`], [codeHash, invite.recipientHash, String(now)])
  if (!Array.isArray(result)) throw new DemoError('unavailable', 503)
  if (result[0] === 'rate_limited') throw new DemoError('rate_limited', 429)
  if (result[0] === 'code_invalid' || result[0] === 'code_expired') throw new DemoError(result[0], 400)
  if (result[0] !== 'ok' || typeof result[1] !== 'string') throw new DemoError('unavailable', 503)
  return result[1]
}

export function acceptanceId(inviteId: string, agreementHash: string): string {
  return createHash('sha256').update(`${inviteId}:${agreementHash}`).digest('hex')
}

const SAVE_ACCEPTANCE = `-- demo-agreement:save-acceptance
local saved = redis.call('GET', KEYS[1])
if saved then return saved end
redis.call('SET', KEYS[1], ARGV[1], 'NX')
return redis.call('GET', KEYS[1])`

/** No TTL, overwrite or in-memory fallback: the exact terms and original identity are retained. */
export async function persistAcceptance(record: DemoAcceptanceRecord): Promise<DemoAcceptanceRecord> {
  const result = await evaluate(SAVE_ACCEPTANCE, [`demo-agreement:acceptance:${record.id}`], [JSON.stringify(record)])
  let saved: DemoAcceptanceRecord
  try { saved = JSON.parse(typeof result === 'string' ? result : '') as DemoAcceptanceRecord } catch { throw new DemoError('unavailable', 503) }
  if (!saved || typeof saved.acceptedAt !== 'string' || !Number.isFinite(Date.parse(saved.acceptedAt))) throw new DemoError('unavailable', 503)
  for (const key of ['id', 'inviteId', 'person', 'businessName', 'verifiedEmail', 'agreementVersion', 'agreementHash', 'agreementText', 'accepted', 'authority'] as const) {
    if (saved[key] !== record[key]) throw new DemoError('identity_mismatch', 409)
  }
  return saved
}
