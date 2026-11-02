import { createHash, randomUUID } from 'node:crypto'
import { DemoError } from './demo-access.js'
import { redis } from './portal-store.js'
import { recommendAiOpportunity, type AiOpportunityPayload, type AiOpportunityRoute } from '../../src/content/aiOffer.js'

export type OpportunityRoute = AiOpportunityRoute
export type OpportunityApplication = Omit<AiOpportunityPayload, 'submissionId' | 'company'>
export type NotificationState = 'pending' | 'sending' | 'sent' | 'failed' | 'review_required'
export type NotificationPayload = { from: string; to: string[]; reply_to?: string; subject: string; text: string }
export interface OpportunityRecord {
  id: string
  fingerprint: string
  createdAt: string
  route: OpportunityRoute
  application: OpportunityApplication
  /** Absent on older records. Capture the rules at receipt instead of reclassifying history. */
  qualification?: ReturnType<typeof recommendAiOpportunity>
  notification: {
    state: NotificationState
    attempts: number
    firstAttemptAt?: string
    lastAttemptAt?: string
    attemptToken?: string
    payload?: NotificationPayload
    providerId?: string
    error?: 'email_not_configured' | 'provider_unavailable' | 'provider_history_required'
  }
}

const prefix = 'ai-opportunity:'
const index = `${prefix}index`
const recordKey = (id: string) => `${prefix}application:${id}`
export const opportunityId = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)) throw new DemoError('invalid', 400)
  return value
}

const CREATE = `-- ai-opportunity:create
local saved = redis.call('GET', KEYS[1])
if saved then return {'existing', saved} end
redis.call('ZADD', KEYS[2], ARGV[2], ARGV[3])
redis.call('SET', KEYS[1], ARGV[1])
return {'created', ARGV[1]}`

/** Records never expire. Production requires durable Redis with backups and no eviction. */
export async function createOpportunity(id: string, application: OpportunityApplication, route: OpportunityRoute): Promise<{ record: OpportunityRecord; created: boolean }> {
  const fingerprint = createHash('sha256').update(JSON.stringify(application)).digest('hex')
  const record: OpportunityRecord = { id: opportunityId(id), fingerprint, createdAt: new Date(Date.now()).toISOString(), route, application, qualification: recommendAiOpportunity(application), notification: { state: 'pending', attempts: 0 } }
  const result = await redis(['EVAL', CREATE, 2, recordKey(id), index, JSON.stringify(record), Date.now(), id])
  if (!Array.isArray(result) || !['created', 'existing'].includes(result[0]) || typeof result[1] !== 'string') throw new DemoError('storage_unavailable', 503)
  let saved: OpportunityRecord
  try { saved = JSON.parse(result[1]) as OpportunityRecord } catch { throw new DemoError('storage_unavailable', 503) }
  if (saved.id !== id || saved.fingerprint !== fingerprint) throw new DemoError('submission_conflict', 409)
  return { record: saved, created: result[0] === 'created' }
}

export async function getOpportunity(id: string): Promise<OpportunityRecord> {
  const raw = await redis(['GET', recordKey(opportunityId(id))])
  if (typeof raw !== 'string') throw new DemoError('not_found', 404)
  try { return JSON.parse(raw) as OpportunityRecord } catch { throw new DemoError('storage_unavailable', 503) }
}

const CHANGE = `-- ai-opportunity:change
local old = redis.call('GET', KEYS[1])
if old ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2])
return 1`

export async function mutateOpportunity<T>(id: string, change: (record: OpportunityRecord) => T): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const raw = await redis(['GET', recordKey(opportunityId(id))])
    if (typeof raw !== 'string') throw new DemoError('not_found', 404)
    const record = JSON.parse(raw) as OpportunityRecord
    const result = change(record)
    if (await redis(['EVAL', CHANGE, 1, recordKey(id), raw, JSON.stringify(record)]) === 1) return result
  }
  throw new DemoError('conflict_retry', 409)
}

export async function listOpportunities(offset: number, limit = 25): Promise<{ applications: OpportunityRecord[]; nextOffset: number | null }> {
  const ids = await redis(['ZREVRANGE', index, offset, offset + limit])
  if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) throw new DemoError('storage_unavailable', 503)
  const page = ids.slice(0, limit) as string[]
  if (!page.length) return { applications: [], nextOffset: null }
  const values = await redis(['MGET', ...page.map(id => recordKey(opportunityId(id)))])
  if (!Array.isArray(values) || values.length !== page.length || values.some(value => typeof value !== 'string')) throw new DemoError('storage_unavailable', 503)
  return { applications: values.map(value => JSON.parse(value as string) as OpportunityRecord), nextOffset: ids.length > limit ? offset + limit : null }
}

const LIMIT = `-- ai-opportunity:limit
if tonumber(redis.call('GET', KEYS[1]) or '0') >= tonumber(ARGV[1]) then return 0 end
if tonumber(redis.call('GET', KEYS[2]) or '0') >= tonumber(ARGV[2]) then return 0 end
redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], 3600, 'NX')
redis.call('INCR', KEYS[2])
redis.call('EXPIRE', KEYS[2], 86400, 'NX')
return 1`

export async function reserveOpportunity(ip: string): Promise<void> {
  if (!/^[\da-fA-F:.]+$/.test(ip)) throw new DemoError('forbidden', 403)
  const digest = createHash('sha256').update(ip).digest('hex').slice(0, 32)
  const now = Date.now()
  const result = await redis(['EVAL', LIMIT, 2, `${prefix}rate:ip:${digest}:${Math.floor(now / 3_600_000)}`, `${prefix}rate:day:${Math.floor(now / 86_400_000)}`, 8, 200])
  if (result === 0) throw new DemoError('rate_limited', 429)
  if (result !== 1) throw new DemoError('storage_unavailable', 503)
}

export async function beginNotification(id: string, payload: NotificationPayload): Promise<{ token: string; payload: NotificationPayload } | null> {
  return mutateOpportunity(id, record => {
    const note = record.notification
    if (note.state === 'sent' || note.state === 'review_required') return null
    if (note.state === 'sending' && Date.now() - Date.parse(note.lastAttemptAt ?? '') < 60_000) return null
    if (note.firstAttemptAt && Date.now() - Date.parse(note.firstAttemptAt) >= 23 * 3_600_000) {
      note.state = 'review_required'; note.error = 'provider_history_required'
      return null
    }
    note.payload ??= payload
    note.firstAttemptAt ??= new Date(Date.now()).toISOString()
    note.lastAttemptAt = new Date(Date.now()).toISOString()
    note.state = 'sending'; note.attempts++; note.attemptToken = randomUUID(); delete note.error
    return { token: note.attemptToken, payload: note.payload }
  })
}
