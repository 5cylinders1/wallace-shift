import { createHash } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { PublishingMediaInput, PublishingSnapshot } from '../../src/business-dashboard/publishing-model.js'
import { DemoError, demoJson, nodeDemoOrigin, nodeHeader } from './demo-access.js'
import { identity } from './portal-auth.js'
import { changeDraft, createDraft, draftHistory, loadDraft, publicDraft, publishingRate } from './linkedin-publishing-store.js'
import { LINKEDIN_PAGE, LinkedInPublishingError, PUBLISHING_LIMITS, finalizeLinkedInVideo, initializeLinkedInMedia, linkedInMediaStatus, publishLinkedInPost, uploadLinkedInPart, verifyLinkedInPage } from './linkedin-publishing-provider.js'

type Request = IncomingMessage & { query?: Record<string, unknown>; body?: unknown }
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DemoError('invalid_request', 400)
  return value as Record<string, unknown>
}
function fields(value: Record<string, unknown>, allowed: string[]): void {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new DemoError('invalid_request', 400)
}
function parameter(req: Request, name: string): string | undefined {
  const values = new URL(req.url ?? '/', 'https://local.invalid').searchParams.getAll(name)
  const query = req.query?.[name]
  if (values.length > 1 || (query !== undefined && typeof query !== 'string') || (values.length && query !== undefined && query !== values[0])) throw new DemoError('invalid_request', 400)
  return values[0] ?? query as string | undefined
}
function string(value: unknown, max: number, code = 'invalid_request'): string {
  if (typeof value !== 'string' || [...value].length > max || [...value].some(character => {
    const point = character.charCodeAt(0)
    return (point < 32 && ![9, 10, 13].includes(point)) || point === 127
  })) throw new DemoError(code, 400)
  return value
}
function inputMedia(value: unknown): PublishingMediaInput | undefined {
  if (value === undefined) return undefined
  const media = record(value)
  fields(media, ['name', 'mimeType', 'size', 'title', 'altText'])
  const name = string(media.name, 200, 'invalid_media').trim()
  const title = string(media.title, 200, 'invalid_media')
  const altText = string(media.altText, 4086, 'invalid_media')
  if (!name || !['image/jpeg', 'image/png', 'video/mp4'].includes(String(media.mimeType)) || !Number.isSafeInteger(media.size)) throw new DemoError('invalid_media', 400)
  const video = media.mimeType === 'video/mp4', size = media.size as number
  if (size < (video ? 75 * 1024 : 8) || size > (video ? PUBLISHING_LIMITS.videoBytes : PUBLISHING_LIMITS.imageBytes)) throw new DemoError('media_size', 400)
  return { name, mimeType: media.mimeType as PublishingMediaInput['mimeType'], size, title, altText }
}
async function bytes(req: Request, max: number): Promise<Buffer> {
  const length = nodeHeader(req, 'content-length')
  if (length && (!/^\d+$/.test(length) || Number(length) > max)) throw new DemoError('body_too_large', 413)
  if (Buffer.isBuffer(req.body)) {
    if (req.body.length > max) throw new DemoError('body_too_large', 413)
    return req.body
  }
  if (typeof req.body === 'string') {
    const body = Buffer.from(req.body)
    if (body.length > max) throw new DemoError('body_too_large', 413)
    return body
  }
  if (req.body !== undefined) throw new DemoError('invalid_request', 400)
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    const timer = setTimeout(() => finish(new DemoError('upload_timeout', 408)), 30_000)
    const finish = (error?: Error) => {
      clearTimeout(timer); req.off('data', data); req.off('end', end); req.off('error', fail); req.off('aborted', aborted)
      if (error) reject(error); else resolve(Buffer.concat(chunks, size))
    }
    const data = (chunk: Buffer) => { size += chunk.length; if (size > max) finish(new DemoError('body_too_large', 413)); else chunks.push(chunk) }
    const end = () => finish()
    const fail = () => finish(new DemoError('invalid_request', 400))
    const aborted = () => finish(new DemoError('invalid_request', 400))
    req.on('data', data); req.on('end', end); req.on('error', fail); req.on('aborted', aborted)
  })
}
async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  if (nodeHeader(req, 'content-type')?.split(';')[0].trim() !== 'application/json') throw new DemoError('invalid_content_type', 415)
  if (req.body !== undefined && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    if (JSON.stringify(req.body).length > 65_536) throw new DemoError('body_too_large', 413)
    return record(req.body)
  }
  const raw = await bytes(req, 65_536)
  try { return record(JSON.parse(raw.toString('utf8'))) } catch { throw new DemoError('invalid_request', 400) }
}
function signature(media: PublishingMediaInput, body: Buffer): void {
  const matches = media.mimeType === 'image/png'
    ? body.length >= 24 && body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && body.subarray(12, 16).toString('ascii') === 'IHDR' && body.readUInt32BE(16) > 0 && body.readUInt32BE(20) > 0 && body.readUInt32BE(16) * body.readUInt32BE(20) <= 36_152_320
    : media.mimeType === 'image/jpeg'
      ? body.length >= 4 && body[0] === 255 && body[1] === 216 && body[2] === 255 && body.at(-2) === 255 && body.at(-1) === 217
      : body.length >= 16 && body.subarray(4, 8).toString('ascii') === 'ftyp' && body.readUInt32BE(0) >= 16 && body.readUInt32BE(0) <= body.length
  if (!matches) throw new DemoError('media_signature', 400)
}
const reviewDetail = 'LinkedIn may have received this post. Check the Wallace Shift Page before creating another draft. This attempt will not be sent again.'
function failureDetail(error: unknown): string {
  if (error instanceof LinkedInPublishingError && error.code === 'linkedin_permissions') return 'LinkedIn denied publishing. Check the token, its organization posting permission, and your Page role, then prepare a new draft.'
  if (error instanceof LinkedInPublishingError && error.code === 'linkedin_rate_limited') return 'LinkedIn has temporarily limited requests. Wait before preparing a new draft.'
  return 'LinkedIn rejected this post. Check the text and media, then prepare a new draft.'
}
async function refresh(owner: string, id: string) {
  const loaded = await loadDraft(owner, id), draft = loaded.draft
  if (draft.status === 'publishing' && Date.now() - Date.parse(draft.updatedAt) > 120_000) {
    try { return (await changeDraft(owner, loaded, 'publish_review', { status: 'review', detail: reviewDetail })).draft }
    catch (error) { if (error instanceof DemoError && error.code === 'draft_changed') return (await loadDraft(owner, id)).draft; throw error }
  }
  if (draft.status !== 'processing' || !draft.provider) return draft
  const result = await linkedInMediaStatus(draft.provider)
  if (result === 'processing') return draft
  try { return (await changeDraft(owner, loaded, `media_${result}`, { status: result, detail: result === 'failed' ? 'LinkedIn could not process this media. Prepare a new draft with another file.' : 'Media is ready. Review your post before publishing.' })).draft }
  catch (error) { if (error instanceof DemoError && error.code === 'draft_changed') return (await loadDraft(owner, id)).draft; throw error }
}
async function snapshot(owner: string): Promise<PublishingSnapshot> {
  let connection: PublishingSnapshot['connection']
  try { await verifyLinkedInPage(); connection = { status: 'ready', detail: 'Wallace Shift Page role confirmed. LinkedIn checks posting permission when you publish.' } }
  catch (error) {
    const code = error instanceof LinkedInPublishingError ? error.code : ''
    connection = code === 'linkedin_not_configured' ? { status: 'needs-setup', detail: 'Add the LinkedIn access token to connect the Wallace Shift Page.' }
      : ['linkedin_permissions', 'linkedin_page_access'].includes(code) ? { status: 'needs-sign-in', detail: 'Refresh the LinkedIn token with organization permissions and confirm your Wallace Shift Page role.' }
        : { status: 'error', detail: 'LinkedIn is unavailable. Try checking the connection again.' }
  }
  return { page: LINKEDIN_PAGE, connection, limits: PUBLISHING_LIMITS, history: await draftHistory(owner) }
}
async function upload(req: Request, owner: string) {
  if (nodeHeader(req, 'content-type')?.split(';')[0].trim() !== 'application/octet-stream') throw new DemoError('invalid_content_type', 415)
  const id = parameter(req, 'draftId') ?? '', partValue = parameter(req, 'part') ?? ''
  if (!/^\d{1,3}$/.test(partValue)) throw new DemoError('invalid_part', 400)
  const index = Number(partValue)
  let loaded = await loadDraft(owner, id)
  const draft = loaded.draft, provider = draft.provider, media = draft.media
  if (draft.status !== 'uploading' || draft.finalizing || !provider || !media) throw new DemoError('draft_not_uploading', 409)
  const part = provider.parts[index]
  if (!part || provider.parts.slice(0, index).some(part => !part.uploaded)) throw new DemoError('invalid_part', 400)
  if (provider.expiresAt <= Date.now()) throw new DemoError('linkedin_upload_expired', 409)
  const expected = part.lastByte - part.firstByte + 1
  const body = await bytes(req, expected)
  if (body.length !== expected) throw new DemoError('invalid_part_size', 400)
  if (index === 0) signature(media, body)
  const digest = createHash('sha256').update(body).digest('hex')
  if (part.sha256 && part.sha256 !== digest) throw new DemoError('media_changed', 409)
  if (part.uploaded) return draft
  if (!part.sha256) loaded = await changeDraft(owner, loaded, 'upload_reserved', { provider: { ...provider, parts: provider.parts.map((item, i) => i === index ? { ...item, sha256: digest } : item) } })
  const etag = await uploadLinkedInPart(loaded.draft.provider!.parts[index], body, media.mimeType !== 'video/mp4')
  if (media.mimeType === 'video/mp4' && !etag) throw new DemoError('linkedin_invalid_upload', 502)
  const updated = loaded.draft.provider!
  try { return (await changeDraft(owner, loaded, 'part_uploaded', { provider: { ...updated, parts: updated.parts.map((item, i) => i === index ? { ...item, uploaded: true, etag } : item) } })).draft }
  catch (error) { if (error instanceof DemoError && error.code === 'draft_changed') return (await loadDraft(owner, id)).draft; throw error }
}
async function finalize(owner: string, id: string) {
  let loaded = await loadDraft(owner, id), draft = loaded.draft
  if (['processing', 'ready', 'publishing', 'published', 'review', 'failed'].includes(draft.status)) return draft
  if (draft.status !== 'uploading' || !draft.provider || !draft.media || draft.provider.parts.some(part => !part.uploaded)) throw new DemoError('media_incomplete', 409)
  if (draft.finalizing) throw new DemoError('media_finalizing', 409)
  loaded = await changeDraft(owner, loaded, 'finalize_reserved', { finalizing: true })
  draft = loaded.draft
  if (draft.media!.mimeType === 'video/mp4') {
    try { await finalizeLinkedInVideo(draft.provider!) }
    catch {
      return (await changeDraft(owner, loaded, 'finalize_failed', { status: 'failed', detail: 'LinkedIn could not finalize this video. Prepare a new draft and upload the file again.' })).draft
    }
  }
  return (await changeDraft(owner, loaded, 'media_processing', { status: 'processing', finalizing: false, detail: 'LinkedIn is processing your media. Nothing has been posted.' })).draft
}
async function publish(owner: string, id: string) {
  let loaded = await loadDraft(owner, id)
  if (['publishing', 'published', 'review', 'failed'].includes(loaded.draft.status)) return loaded.draft
  if (loaded.draft.status !== 'ready') throw new DemoError('draft_not_ready', 409)
  await verifyLinkedInPage()
  if (loaded.draft.provider && await linkedInMediaStatus(loaded.draft.provider) !== 'ready') throw new DemoError('media_not_ready', 409)
  // The durable CAS is the publish reservation. Never clear it on a timeout,
  // unknown result, request crash, or failed save after the provider accepted it.
  try { loaded = await changeDraft(owner, loaded, 'publish_reserved', { status: 'publishing', detail: 'Publishing to the Wallace Shift Page. Do not submit another draft.' }) }
  catch (error) { if (error instanceof DemoError && error.code === 'draft_changed') return (await loadDraft(owner, id)).draft; throw error }
  let postUrl: string
  try { postUrl = await publishLinkedInPost(loaded.draft.text, loaded.draft.media && loaded.draft.provider ? { input: loaded.draft.media, provider: loaded.draft.provider } : undefined) }
  catch (error) {
    const uncertain = !(error instanceof LinkedInPublishingError) || error.uncertain
    return (await changeDraft(owner, loaded, uncertain ? 'publish_review' : 'publish_rejected', { status: uncertain ? 'review' : 'failed', detail: uncertain ? reviewDetail : failureDetail(error) })).draft
  }
  return (await changeDraft(owner, loaded, 'published', { status: 'published', postUrl, detail: 'Published to the Wallace Shift LinkedIn Page.' })).draft
}

export default async function linkedinPublishingHandler(req: Request, res: ServerResponse): Promise<void> {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('allow', 'GET, POST'); throw new DemoError('method_not_allowed', 405) }
    const origin = nodeDemoOrigin(req)
    if (nodeHeader(req, 'sec-fetch-site') === 'cross-site' || (req.method === 'POST' && nodeHeader(req, 'origin') !== origin) || (nodeHeader(req, 'origin') && nodeHeader(req, 'origin') !== origin)) throw new DemoError('forbidden_origin', 403)
    const user = await identity(req)
    if (!user) throw new DemoError('authentication_required', 401)
    if (!user.admin) throw new DemoError('owner_required', 403)
    await publishingRate(user.email, 'requests', 60, 600)
    if (req.method === 'GET') {
      const id = parameter(req, 'draftId')
      if (id !== undefined) { demoJson(res, 200, { ok: true, draft: publicDraft(await refresh(user.email, id)) }); return }
      demoJson(res, 200, { ok: true, snapshot: await snapshot(user.email) }); return
    }
    if (parameter(req, 'action') === 'upload') { demoJson(res, 200, { ok: true, draft: publicDraft(await upload(req, user.email)) }); return }
    const body = await jsonBody(req)
    if (body.action === 'prepare') {
      fields(body, ['action', 'text', 'media'])
      const text = string(body.text, PUBLISHING_LIMITS.text, 'invalid_text'), media = inputMedia(body.media)
      if (!text.trim() && !media) throw new DemoError('empty_post', 400)
      await publishingRate(user.email, 'prepare', 3600, 20)
      await verifyLinkedInPage()
      const provider = media ? await initializeLinkedInMedia(media) : undefined
      const draft = await createDraft(user.email, { text, pageId: LINKEDIN_PAGE.id, status: media ? 'uploading' : 'ready', ...(media ? { media, provider } : {}) })
      demoJson(res, 200, { ok: true, draft: publicDraft(draft) }); return
    }
    if (body.action === 'finalize') {
      fields(body, ['action', 'draftId'])
      demoJson(res, 200, { ok: true, draft: publicDraft(await finalize(user.email, string(body.draftId, 36))) }); return
    }
    if (body.action === 'publish') {
      fields(body, ['action', 'draftId', 'confirm'])
      if (body.confirm !== true) throw new DemoError('confirmation_required', 400)
      await publishingRate(user.email, 'publish', 60, 20)
      demoJson(res, 200, { ok: true, draft: publicDraft(await publish(user.email, string(body.draftId, 36))) }); return
    }
    throw new DemoError('invalid_action', 400)
  } catch (error) {
    const known = error instanceof DemoError || error instanceof LinkedInPublishingError
    demoJson(res, known ? error.status : 503, { ok: false, error: known ? error.code : 'publishing_unavailable' })
  }
}
