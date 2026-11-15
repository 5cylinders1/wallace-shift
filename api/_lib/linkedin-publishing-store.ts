import { randomUUID } from 'node:crypto'
import { DemoError } from './demo-access.js'
import { hash } from './portal-auth.js'
import { billingKey, redis } from './portal-store.js'
import type { PublishingDraft, PublishingMediaInput } from '../../src/business-dashboard/publishing-model.js'
import type { ProviderMedia } from './linkedin-publishing-provider.js'

export type StoredDraft = Omit<PublishingDraft, 'media'> & {
  media?: PublishingMediaInput
  provider?: ProviderMedia
  finalizing?: boolean
  audit: { at: string; action: string }[]
}
type LoadedDraft = { raw: string; draft: StoredDraft }
const base = (owner: string) => `portal:${billingKey(`linkedin-publishing:${hash(owner)}`)}`
const draftKey = (owner: string, id: string) => `${base(owner)}:draft:${id}`
const CREATE = `-- linkedin-publishing-create
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
redis.call('SET', KEYS[1], ARGV[1])
redis.call('LPUSH', KEYS[2], ARGV[2])
redis.call('LTRIM', KEYS[2], 0, 49)
return 1`
const CAS = `-- linkedin-publishing-cas
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2])
return 1`
const RATE = `-- linkedin-publishing-rate
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return n`

/** Fail closed on missing durable storage. Publishing reservations never expire. */
export async function publishingRate(owner: string, action: string, seconds: number, maximum: number): Promise<void> {
  const key = `${base(owner)}:rate:${action}:${Math.floor(Date.now() / (seconds * 1000))}`
  const result = await redis(['EVAL', RATE, 1, key, seconds])
  if (typeof result !== 'number') throw new DemoError('storage_unavailable', 503)
  if (result > maximum) throw new DemoError('rate_limited', 429)
}
export async function createDraft(owner: string, data: Pick<StoredDraft, 'text' | 'media' | 'provider' | 'pageId' | 'status'>): Promise<StoredDraft> {
  const now = new Date().toISOString()
  const draft: StoredDraft = { ...data, id: randomUUID(), createdAt: now, updatedAt: now, audit: [{ at: now, action: 'prepared' }] }
  if (await redis(['EVAL', CREATE, 2, draftKey(owner, draft.id), `${base(owner)}:history`, JSON.stringify(draft), draft.id]) !== 1) throw new DemoError('storage_unavailable', 503)
  return draft
}
export async function loadDraft(owner: string, id: string): Promise<LoadedDraft> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) throw new DemoError('invalid_draft', 400)
  const raw = await redis(['GET', draftKey(owner, id)])
  if (typeof raw !== 'string') throw new DemoError('draft_not_found', 404)
  let draft: StoredDraft
  try { draft = JSON.parse(raw) as StoredDraft } catch { throw new DemoError('storage_unavailable', 503) }
  if (draft.id !== id || !Array.isArray(draft.audit)) throw new DemoError('storage_unavailable', 503)
  return { raw, draft }
}
export async function changeDraft(owner: string, current: LoadedDraft, action: string, change: Partial<StoredDraft>): Promise<LoadedDraft> {
  const now = new Date().toISOString()
  const draft: StoredDraft = { ...current.draft, ...change, updatedAt: now, audit: [...current.draft.audit, { at: now, action }].slice(-120) }
  const raw = JSON.stringify(draft)
  if (await redis(['EVAL', CAS, 1, draftKey(owner, draft.id), current.raw, raw]) !== 1) throw new DemoError('draft_changed', 409)
  return { raw, draft }
}
export async function draftHistory(owner: string): Promise<PublishingDraft[]> {
  const ids = await redis(['LRANGE', `${base(owner)}:history`, 0, 49])
  if (!Array.isArray(ids)) throw new DemoError('storage_unavailable', 503)
  const drafts = await Promise.all(ids.map(id => loadDraft(owner, String(id))))
  return drafts.map(item => publicDraft(item.draft))
}
/** Construct the public contract explicitly; signed URLs and provider URNs stay server side. */
export function publicDraft(draft: StoredDraft): PublishingDraft {
  return {
    id: draft.id, pageId: draft.pageId, text: draft.text, status: draft.status,
    createdAt: draft.createdAt, updatedAt: draft.updatedAt,
    ...(draft.detail ? { detail: draft.detail } : {}), ...(draft.postUrl ? { postUrl: draft.postUrl } : {}),
    ...(draft.media && draft.provider ? { media: { ...draft.media, kind: draft.media.mimeType === 'video/mp4' ? 'video' as const : 'image' as const,
      parts: draft.provider.parts.map((part, index) => ({ index, firstByte: part.firstByte, lastByte: part.lastByte, uploaded: part.uploaded })),
    } } : {}),
  }
}
