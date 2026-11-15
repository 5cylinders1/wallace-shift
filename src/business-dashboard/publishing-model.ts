export type PublishingStatus = 'uploading' | 'processing' | 'ready' | 'publishing' | 'published' | 'review' | 'failed'
export type PublishingPage = { id: string; name: string; url: string }
export type PublishingMediaInput = {
  name: string
  mimeType: 'image/jpeg' | 'image/png' | 'video/mp4'
  size: number
  title: string
  altText: string
}
export type PublishingMedia = PublishingMediaInput & {
  kind: 'image' | 'video'
  parts: { index: number; firstByte: number; lastByte: number; uploaded: boolean }[]
}
export type PublishingDraft = {
  id: string
  pageId: string
  text: string
  status: PublishingStatus
  createdAt: string
  updatedAt: string
  media?: PublishingMedia
  postUrl?: string
  detail?: string
}
export type PublishingSnapshot = {
  page: PublishingPage
  connection: { status: 'ready' | 'needs-setup' | 'needs-sign-in' | 'error'; detail: string }
  limits: { text: number; imageBytes: number; videoBytes: number }
  history: PublishingDraft[]
}
export type PublishingResponse =
  | { ok: true; snapshot: PublishingSnapshot; draft?: never }
  | { ok: true; draft: PublishingDraft; snapshot?: never }
  | { ok: false; error: string }

// /api/business-publishing: GET snapshot; GET ?draftId=... reads a saved draft.
// POST JSON: {action:'prepare',text,media?:PublishingMediaInput},
// {action:'finalize',draftId}, or {action:'publish',draftId,confirm:true}.
// POST ?action=upload&draftId=...&part=... streams one raw octet-stream part.
// Upload URLs, access tokens and provider media identifiers stay on the server.
