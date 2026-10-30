import { demoAgreementStore } from './demo-agreement-store.js'
import { DemoError } from './demo-access.js'
import type { Engagement } from '../../src/client-portal/model.js'

export async function redis(command: (string | number)[]): Promise<unknown> {
  const store = demoAgreementStore()
  const response = await fetch(store.url, {
    method: 'POST', headers: { authorization: `Bearer ${store.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(command), signal: AbortSignal.timeout(6000),
  })
  if (!response.ok) throw new DemoError('storage_unavailable', 503)
  const data = await response.json() as { result?: unknown; error?: string }
  if (data.error || !Object.hasOwn(data, 'result')) throw new DemoError('storage_unavailable', 503)
  return data.result
}
export async function getValue<T>(key: string): Promise<T | null> {
  const raw = await redis(['GET', `portal:${key}`])
  return typeof raw === 'string' ? JSON.parse(raw) as T : null
}
export async function setValue(key: string, value: unknown, ttl: number): Promise<void> {
  await redis(['SET', `portal:${key}`, JSON.stringify(value), 'EX', ttl])
}
const CAS = `local old = redis.call('GET', KEYS[1]) or '[]'
if old ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2])
return 1`
export async function allEngagements(): Promise<Engagement[]> { return await getValue<Engagement[]>('engagements') ?? [] }
/** Small-business ledger. Atomic compare-and-set prevents lost receipts and double issuance.
 * No expiration; use a dedicated durable Redis database with persistence/backups and no eviction. */
export async function mutateLedger<T>(change: (entries: Engagement[]) => T): Promise<T> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const raw = await redis(['GET', 'portal:engagements'])
    const before = typeof raw === 'string' ? raw : '[]'
    const entries = JSON.parse(before) as Engagement[]
    const result = change(entries)
    if (await redis(['EVAL', CAS, 1, 'portal:engagements', before, JSON.stringify(entries)]) === 1) return result
  }
  throw new DemoError('conflict_retry', 409)
}
export function audit(e: Engagement, actor: string, action: string): void {
  e.revision++
  e.audit.push({ at: new Date().toISOString(), actor, action })
}
