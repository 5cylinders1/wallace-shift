import { createHash } from 'node:crypto'
import { DemoError } from './demo-access.js'
import { demoAgreementStore } from './demo-agreement-store.js'

export const mailHash = (value: string): string => createHash('sha256').update(value).digest('hex')
/** Mail never shares authentication or records with the client billing portal. */
export function mailKey(value: string): string {
  const environment = process.env.VERCEL_ENV === 'production' ? 'production' : process.env.VERCEL_ENV === 'preview' ? 'preview' : 'development'
  return `wallace-mail:${environment}:${value}`
}
export const userKey = (email: string, value: string): string => mailKey(`user:${mailHash(email)}:${value}`)

export async function mailRedis(command: (string | number)[]): Promise<unknown> {
  const store = demoAgreementStore()
  try {
    const response = await fetch(store.url, {
      method: 'POST', headers: { authorization: `Bearer ${store.token}`, 'content-type': 'application/json' },
      body: JSON.stringify(command), signal: AbortSignal.timeout(6000),
    })
    if (!response.ok) throw new Error('Storage unavailable')
    const result = await response.json() as { result?: unknown; error?: unknown }
    if (result.error || !Object.hasOwn(result, 'result')) throw new Error('Storage unavailable')
    return result.result
  } catch { throw new DemoError('storage_unavailable', 503) }
}

export async function mailGet<T>(key: string): Promise<T | null> {
  const value = await mailRedis(['GET', key])
  return typeof value === 'string' ? JSON.parse(value) as T : null
}

const LIMIT = `-- wallace-mail:limit
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return count`
export async function mailLimit(key: string, seconds: number, cap: number): Promise<void> {
  const count = await mailRedis(['EVAL', LIMIT, 1, mailKey(`limit:${key}:${Math.floor(Date.now() / (seconds * 1000))}`), seconds])
  if (typeof count !== 'number') throw new DemoError('storage_unavailable', 503)
  if (count > cap) throw new DemoError('rate_limited', 429)
}

const CAS = `-- wallace-mail:cas
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2])
return 1`
export async function mailCompareAndSet(key: string, before: unknown, after: unknown): Promise<boolean> {
  return await mailRedis(['EVAL', CAS, 1, key, JSON.stringify(before), JSON.stringify(after)]) === 1
}
