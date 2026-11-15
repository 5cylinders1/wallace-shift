import type { PublishingMediaInput } from '../../src/business-dashboard/publishing-model.js'

export const LINKEDIN_PAGE = { id: '143962288', name: 'Wallace Shift', url: 'https://www.linkedin.com/company/wallace-shift/' }
export const LINKEDIN_AUTHOR = `urn:li:organization:${LINKEDIN_PAGE.id}`
export const PUBLISHING_LIMITS = { text: 3000, imageBytes: 4 * 1024 * 1024, videoBytes: 200 * 1024 * 1024 }
export type UploadPart = { firstByte: number; lastByte: number; url: string; sha256?: string; etag?: string; uploaded: boolean }
export type ProviderMedia = { urn: string; expiresAt: number; uploadToken?: string; parts: UploadPart[] }

export class LinkedInPublishingError extends Error {
  readonly code: string
  readonly status: number
  readonly uncertain: boolean
  constructor(code: string, status = 502, uncertain = false) { super(code); this.code = code; this.status = status; this.uncertain = uncertain }
}
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
function headers(): Record<string, string> {
  const token = process.env.DASHBOARD_LINKEDIN_ACCESS_TOKEN?.trim()
  const version = process.env.DASHBOARD_LINKEDIN_API_VERSION?.trim() || '202610'
  if (!token || !/^20\d{2}(?:0[1-9]|1[0-2])$/.test(version)) throw new LinkedInPublishingError('linkedin_not_configured', 503)
  return { authorization: `Bearer ${token}`, 'LinkedIn-Version': version, 'X-Restli-Protocol-Version': '2.0.0' }
}
async function api(path: string, body?: unknown): Promise<Response> {
  let response: Response
  const requestHeaders = headers()
  try {
    response = await fetch(`https://api.linkedin.com/rest/${path}`, {
      method: body === undefined ? 'GET' : 'POST', headers: { ...requestHeaders, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'error', signal: AbortSignal.timeout(15_000),
    })
  } catch { throw new LinkedInPublishingError('linkedin_unavailable', 502, true) }
  if (!response.ok) {
    // Provider bodies can contain private payloads or signed URLs. Never expose them.
    if ([401, 403].includes(response.status)) throw new LinkedInPublishingError('linkedin_permissions', 403)
    if (response.status === 429) throw new LinkedInPublishingError('linkedin_rate_limited', 429)
    throw new LinkedInPublishingError('linkedin_rejected', 502, response.status >= 500 || response.status === 408)
  }
  return response
}
async function json(response: Response): Promise<Record<string, unknown>> {
  try {
    const text = await response.text()
    if (text.length > 1_000_000) throw new Error('large')
    return object(JSON.parse(text))
  } catch { throw new LinkedInPublishingError('linkedin_invalid_response') }
}
export async function verifyLinkedInPage(): Promise<void> {
  // The roleAssignee finder scopes roles to the token's member; the organization
  // finder can include other members. Use the member finder to prove *their* role.
  for (let start = 0; start < 1000; start += 100) {
    const response = await json(await api(`organizationAcls?q=roleAssignee&state=APPROVED&count=100&start=${start}`))
    if (!Array.isArray(response.elements)) throw new LinkedInPublishingError('linkedin_invalid_response')
    const rows = response.elements.map(object)
    if (rows.some(row => (row.organization ?? row.organizationTarget) === LINKEDIN_AUTHOR && row.state === 'APPROVED' && ['ADMINISTRATOR', 'CONTENT_ADMIN', 'CONTENT_ADMINISTRATOR'].includes(String(row.role)))) return
    if (rows.length < 100) break
  }
  throw new LinkedInPublishingError('linkedin_page_access', 403)
}
export function trustedUploadUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 16000) throw new LinkedInPublishingError('linkedin_invalid_upload')
  let url: URL
  try { url = new URL(value) } catch { throw new LinkedInPublishingError('linkedin_invalid_upload') }
  // Current official image and video APIs issue signed dms-uploads URLs here.
  // Bearer authentication is sent only for images, and redirects are forbidden.
  if (url.protocol !== 'https:' || url.hostname !== 'www.linkedin.com' || (url.port && url.port !== '443') || url.username || url.password || url.hash || !url.pathname.startsWith('/dms-uploads/')) throw new LinkedInPublishingError('linkedin_invalid_upload')
  return url.href
}
export async function initializeLinkedInMedia(media: PublishingMediaInput): Promise<ProviderMedia> {
  const video = media.mimeType === 'video/mp4'
  const data = object((await json(await api(`${video ? 'videos' : 'images'}?action=initializeUpload`, {
    initializeUploadRequest: { owner: LINKEDIN_AUTHOR, ...(video ? { fileSizeBytes: media.size, uploadCaptions: false, uploadThumbnail: false } : {}) },
  }))).value)
  const urn = data[video ? 'video' : 'image']
  if (typeof urn !== 'string' || !(video ? /^urn:li:video:[A-Za-z0-9_-]+$/ : /^urn:li:image:[A-Za-z0-9_-]+$/).test(urn)) throw new LinkedInPublishingError('linkedin_invalid_upload')
  const expiresAt = data[video ? 'uploadUrlsExpireAt' : 'uploadUrlExpiresAt']
  if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new LinkedInPublishingError('linkedin_upload_expired')
  const raw = video ? data.uploadInstructions : [{ firstByte: 0, lastByte: media.size - 1, uploadUrl: data.uploadUrl }]
  if (!Array.isArray(raw) || !raw.length || raw.length > 100) throw new LinkedInPublishingError('linkedin_invalid_upload')
  let expected = 0
  const parts = raw.map(value => {
    const part = object(value), firstByte = part.firstByte, lastByte = part.lastByte
    if (!Number.isSafeInteger(firstByte) || !Number.isSafeInteger(lastByte) || firstByte !== expected || (lastByte as number) < (firstByte as number) || (lastByte as number) >= media.size || (lastByte as number) - (firstByte as number) + 1 > PUBLISHING_LIMITS.imageBytes) throw new LinkedInPublishingError('linkedin_invalid_upload')
    expected = (lastByte as number) + 1
    return { firstByte: firstByte as number, lastByte: lastByte as number, url: trustedUploadUrl(part.uploadUrl), uploaded: false }
  })
  if (expected !== media.size || (video && (typeof data.uploadToken !== 'string' || data.uploadToken.length > 16000))) throw new LinkedInPublishingError('linkedin_invalid_upload')
  return { urn, expiresAt, parts, ...(video ? { uploadToken: data.uploadToken as string } : {}) }
}
export async function uploadLinkedInPart(part: UploadPart, bytes: Buffer, image: boolean): Promise<string> {
  let response: Response
  const uploadHeaders = { 'content-type': 'application/octet-stream', ...(image ? { authorization: headers().authorization } : {}) }
  try {
    response = await fetch(trustedUploadUrl(part.url), { method: 'PUT', headers: uploadHeaders, body: new Uint8Array(bytes), redirect: 'error', signal: AbortSignal.timeout(25_000) })
  } catch { throw new LinkedInPublishingError('linkedin_upload_failed') }
  if (!response.ok) throw new LinkedInPublishingError('linkedin_upload_failed')
  const etag = response.headers.get('etag')?.replace(/^"|"$/g, '') ?? ''
  if (etag.length > 4000 || /[\r\n]/.test(etag)) throw new LinkedInPublishingError('linkedin_invalid_upload')
  return etag
}
export async function finalizeLinkedInVideo(media: ProviderMedia): Promise<void> {
  if (media.parts.some(part => !part.uploaded || !part.etag)) throw new LinkedInPublishingError('media_incomplete', 409)
  await api('videos?action=finalizeUpload', { finalizeUploadRequest: { video: media.urn, uploadToken: media.uploadToken ?? '', uploadedPartIds: media.parts.map(part => part.etag) } })
}
export async function linkedInMediaStatus(media: ProviderMedia): Promise<'ready' | 'processing' | 'failed'> {
  const kind = media.urn.startsWith('urn:li:video:') ? 'videos' : 'images'
  const result = await json(await api(`${kind}/${encodeURIComponent(media.urn)}`))
  if (result.owner !== LINKEDIN_AUTHOR || result.id !== media.urn) throw new LinkedInPublishingError('linkedin_invalid_response')
  if (result.status === 'AVAILABLE') return 'ready'
  if (result.status === 'PROCESSING_FAILED') return 'failed'
  if (result.status === 'PROCESSING' || result.status === 'WAITING_UPLOAD') return 'processing'
  throw new LinkedInPublishingError('linkedin_invalid_response')
}
export function linkedinPlainText(text: string): string { return text.replace(/[|{}@[\]()<>#\\*_~]/g, '\\$&') }
export async function publishLinkedInPost(text: string, media?: { input: PublishingMediaInput; provider: ProviderMedia }): Promise<string> {
  const response = await api('posts', {
    author: LINKEDIN_AUTHOR, commentary: linkedinPlainText(text), visibility: 'PUBLIC',
    distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: 'PUBLISHED', isReshareDisabledByAuthor: false,
    ...(media ? { content: { media: { id: media.provider.urn, title: media.input.title || media.input.name, ...(media.input.altText ? { altText: media.input.altText } : {}) } } } : {}),
  })
  const id = response.headers.get('x-restli-id')
  if (response.status !== 201 || !id || !/^urn:li:(share|ugcPost):\d+$/.test(id)) throw new LinkedInPublishingError('linkedin_publish_unknown', 502, true)
  return `https://www.linkedin.com/feed/update/${id}/`
}
