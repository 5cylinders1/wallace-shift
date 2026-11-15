import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import type { PublishingDraft, PublishingMedia, PublishingMediaInput, PublishingResponse, PublishingSnapshot, PublishingStatus } from './publishing-model'
import './linkedin-publisher.css'

const ENDPOINT = '/api/business-publishing'
const SESSION_KEY = 'wallace-linkedin-draft'
const DEFAULT_LIMITS = { text: 3000, imageBytes: 4 * 1024 * 1024, videoBytes: 200 * 1024 * 1024 }
const statusLabels: Record<PublishingStatus, string> = {
  uploading: 'Uploading media', processing: 'Processing media', ready: 'Ready to publish',
  publishing: 'Publishing', published: 'Published', review: 'Check LinkedIn', failed: 'Not published',
}
const errorMessages: Record<string, string> = {
  access_required: 'Your owner session has ended. Sign in again to continue.',
  owner_required: 'Only the Wallace Shift owner can publish from this workspace.',
  forbidden: 'This request could not be authorized. Reload the page and try again.',
  rate_limited: 'Too many requests. Wait one minute, then try again.',
  not_configured: 'The LinkedIn publishing connection needs server configuration.',
  linkedin_not_configured: 'The LinkedIn publishing connection needs server configuration.',
  publishing_not_configured: 'The LinkedIn publishing connection needs server configuration.',
  linkedin_auth: 'LinkedIn access needs to be renewed. Check the Page connection before continuing.',
  linkedin_access_required: 'LinkedIn access needs to be renewed. Check the Page connection before continuing.',
  linkedin_permissions: 'LinkedIn denied access. Renew the token with organization posting permission and confirm your Wallace Shift Page role.',
  linkedin_page_access: 'The connected LinkedIn account needs permission to post as Wallace Shift. Check your Page role and reconnect.',
  linkedin_rate_limited: 'LinkedIn has temporarily limited requests. Wait before trying again.',
  media_size: 'Choose a JPEG or PNG image up to 4 MB, or an MP4 video from 75 KB to 200 MB.',
  media_signature: 'The selected file could not be recognized as valid media. Export it as JPEG, PNG, or MP4 and select it again.',
  media_changed: 'This file differs from the reviewed attachment. Reselect the file and review the post again.',
  linkedin_upload_expired: 'The media upload has expired. Edit the post and review it again to start a new upload.',
  linkedin_upload_failed: 'The media upload did not finish. Your post is still here; try resuming the upload.',
  media_incomplete: 'The media upload is incomplete. Resume the upload before publishing.',
  media_finalizing: 'LinkedIn is finishing this upload. Check its status shortly.',
  draft_changed: 'This review was updated by another request. Check its status before continuing.',
  publishing_unavailable: 'Publishing is temporarily unavailable. Your post has been kept here.',
  invalid_fields: 'Check the post text and media details, then try again.',
  invalid_text: 'Enter post text within the character limit.',
  invalid_media: 'Choose a valid JPEG, PNG, or MP4 file within the size limits.',
  unsupported_media: 'Choose a JPEG or PNG image, or an MP4 video.',
  too_large: 'The selected file is too large for this upload.',
  draft_not_found: 'This saved review is no longer available. Your text is still here; review the post again.',
  draft_expired: 'This saved review has expired. Review the post again before publishing.',
  media_not_ready: 'LinkedIn is still processing the media. Check its status before publishing.',
  invalid_part: 'The upload could not be completed. Reselect the file and review the post again.',
  upload_failed: 'The media upload did not finish. Your post is still here; try resuming the upload.',
  network_error: 'The request could not finish. Check your connection and try again.',
}

class PublishingError extends Error {
  readonly code: string
  readonly status: number
  constructor(code: string, status = 0) { super(errorMessages[code] ?? 'The request could not be completed. Your post has been kept here. Try again shortly.'); this.code = code; this.status = status }
}
async function request(path: string, init: RequestInit = {}): Promise<PublishingResponse> {
  let response: Response
  try { response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...init, signal: init.signal ?? AbortSignal.timeout(55_000) }) }
  catch (error) { if (error instanceof DOMException && error.name === 'AbortError') throw error; throw new PublishingError('network_error') }
  let result: PublishingResponse
  try { result = await response.json() as PublishingResponse } catch { throw new PublishingError('unavailable', response.status) }
  if (!response.ok || !result.ok) {
    const code = !result.ok && result.error in errorMessages ? result.error : response.status === 401 ? 'access_required' : response.status === 403 ? 'forbidden' : response.status === 429 ? 'rate_limited' : !result.ok ? result.error : 'unavailable'
    throw new PublishingError(code, response.status)
  }
  return result
}
async function action(body: Record<string, unknown>): Promise<PublishingDraft> {
  const result = await request(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  if (!result.ok || !result.draft) throw new PublishingError('unavailable')
  return result.draft
}
function savedDraftId(): string | null { try { const id = sessionStorage.getItem(SESSION_KEY); return id && /^[a-zA-Z0-9-]{20,80}$/.test(id) ? id : null } catch { return null } }
function rememberDraft(id: string | null) { try { if (id) sessionStorage.setItem(SESSION_KEY, id); else sessionStorage.removeItem(SESSION_KEY) } catch { /* The server record still protects this attempt. */ } }
function linkedInUrl(value?: string): string | undefined {
  try { const url = new URL(value ?? ''); return url.protocol === 'https:' && url.hostname === 'www.linkedin.com' && !url.username && !url.password && (url.pathname.startsWith('/company/') || url.pathname.startsWith('/feed/update/')) ? url.href : undefined } catch { return undefined }
}
function dateLabel(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }
function bytesLabel(bytes: number) { return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} MB` }
async function validateMediaMetadata(file: File, url: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const media = file.type.startsWith('image/') ? new Image() : document.createElement('video')
    const cleanup = () => { window.clearTimeout(timer); media.onload = null; media.onerror = null; if (media instanceof HTMLVideoElement) { media.onloadedmetadata = null; media.removeAttribute('src'); media.load() } }
    const fail = (message: string) => { cleanup(); reject(new Error(message)) }
    const timer = window.setTimeout(() => fail('The file details could not be read. Try exporting and selecting the file again.'), 15_000)
    media.onerror = () => fail('This file could not be previewed. Choose a valid JPEG, PNG, or MP4 file.')
    if (media instanceof HTMLImageElement) {
      media.onload = () => {
        if (!media.naturalWidth || !media.naturalHeight || media.naturalWidth * media.naturalHeight > 36_152_320) { fail('Choose an image with no more than 36,152,320 pixels.'); return }
        cleanup(); resolve()
      }
    } else {
      media.preload = 'metadata'
      media.onloadedmetadata = () => {
        if (!Number.isFinite(media.duration) || media.duration < 3 || media.duration > 1800) { fail('Choose an MP4 video between 3 seconds and 30 minutes long.'); return }
        if (!media.videoWidth || !media.videoHeight) { fail('This MP4 does not contain a readable video track.'); return }
        cleanup(); resolve()
      }
    }
    media.src = url
  })
}

export function LinkedInPublisher({ active, onBusyChange }: { active: boolean; onBusyChange: (busy: boolean) => void }) {
  const [snapshot, setSnapshot] = useState<PublishingSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [restoredAttachment, setRestoredAttachment] = useState<PublishingMedia | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [mediaTitle, setMediaTitle] = useState('')
  const [altText, setAltText] = useState('')
  const [draft, setDraft] = useState<PublishingDraft | null>(null)
  const [operation, setOperation] = useState<'validating' | 'reviewing' | 'uploading' | 'publishing' | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [accessExpired, setAccessExpired] = useState(false)
  const [processingPaused, setProcessingPaused] = useState(false)
  const [checkedPage, setCheckedPage] = useState(false)
  const working = useRef(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const previewHeading = useRef<HTMLHeadingElement>(null)
  const objectUrl = useRef<string | null>(null)
  const alive = useRef(true)
  const draftId = useRef<string | null>(null)
  const uncertainDraft = useRef<string | null>(null)
  const busy = operation !== null
  const limits = snapshot?.limits ?? DEFAULT_LIMITS
  const count = Array.from(text).length
  const terminal = draft?.status === 'published' || draft?.status === 'review' || draft?.status === 'publishing'
  const restoredMedia = Boolean(restoredAttachment && !file)
  const ready = snapshot?.connection.status === 'ready' && !accessExpired
  const pageUrl = linkedInUrl(snapshot?.page.url)

  const showError = useCallback((reason: unknown) => {
    if (!alive.current) return
    setError(reason instanceof PublishingError ? reason.message : 'The request could not finish. Your post has been kept here.')
    if (reason instanceof PublishingError && (reason.status === 401 || reason.code === 'access_required')) setAccessExpired(true)
  }, [])
  const acceptDraft = useCallback((next: PublishingDraft) => {
    if (!alive.current) return
    draftId.current = next.id
    setDraft(next); rememberDraft(next.id)
    if (next.status === 'published' || next.status === 'failed' || next.status === 'review' || next.status === 'publishing') {
      setSnapshot(current => current ? { ...current, history: [next, ...current.history.filter(item => item.id !== next.id)] } : current)
    }
  }, [])
  const loadSnapshot = useCallback(async (signal?: AbortSignal) => {
    const result = await request(ENDPOINT, { signal })
    if (!result.ok || !result.snapshot) throw new PublishingError('unavailable')
    if (!signal?.aborted && alive.current) { setSnapshot(result.snapshot); setAccessExpired(false) }
  }, [])

  useEffect(() => {
    alive.current = true
    const controller = new AbortController()
    void (async () => {
      await loadSnapshot(controller.signal)
      const id = savedDraftId()
      if (!id) return
      const result = await request(`${ENDPOINT}?draftId=${encodeURIComponent(id)}`, { signal: controller.signal })
      if (result.ok && result.draft && !controller.signal.aborted && alive.current) {
        acceptDraft(result.draft); setText(result.draft.text)
        setRestoredAttachment(result.draft.media ?? null)
        setMediaTitle(result.draft.media?.title ?? ''); setAltText(result.draft.media?.altText ?? '')
      }
    })().catch(reason => { if (!controller.signal.aborted) showError(reason) }).finally(() => { if (!controller.signal.aborted && alive.current) setLoading(false) })
    return () => { alive.current = false; controller.abort() }
  }, [loadSnapshot, acceptDraft, showError])
  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current) }, [])
  useEffect(() => { onBusyChange(busy); return () => onBusyChange(false) }, [busy, onBusyChange])
  useEffect(() => {
    if (!busy && ((!text.trim() && !file) || draft?.status === 'published')) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [busy, text, file, draft?.status])
  useEffect(() => {
    if (!active || draft?.status !== 'processing' || processingPaused || accessExpired) return
    const controller = new AbortController()
    const id = draft.id
    let timer: number | undefined
    const started = Date.now()
    const poll = async () => {
      try {
        const result = await request(`${ENDPOINT}?draftId=${encodeURIComponent(id)}`, { signal: controller.signal })
        if (controller.signal.aborted || !alive.current || draftId.current !== id || !result.ok || !result.draft) return
        acceptDraft(result.draft)
        if (result.draft.status === 'processing') {
          if (Date.now() - started >= 120_000) setProcessingPaused(true)
          else timer = window.setTimeout(poll, 4000)
        }
      } catch (reason) { if (!controller.signal.aborted) { setProcessingPaused(true); showError(reason) } }
    }
    timer = window.setTimeout(poll, 3000)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [active, draft?.id, draft?.status, processingPaused, accessExpired, acceptDraft, showError])

  function clearPrepared() { draftId.current = null; uncertainDraft.current = null; setDraft(null); rememberDraft(null); setError(''); setProcessingPaused(false); setCheckedPage(false) }
  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const selected = event.target.files?.[0] ?? null
    if (!selected || working.current) return
    clearPrepared()
    const isImage = selected.type === 'image/jpeg' || selected.type === 'image/png'
    const isVideo = selected.type === 'video/mp4'
    if ((!isImage && !isVideo) || selected.size <= 0 || selected.size > (isImage ? limits.imageBytes : limits.videoBytes) || (isVideo && selected.size < 75 * 1024)) {
      setError(isVideo ? 'Choose an MP4 video between 75 KB and 200 MB.' : 'Choose a JPEG or PNG image up to 4 MB, or an MP4 video up to 200 MB.')
      input.value = ''; return
    }
    if (Array.from(selected.name).length > 200) { setError('Rename the file using 200 characters or fewer, then select it again.'); input.value = ''; return }
    working.current = true; setOperation('validating'); setError('')
    const url = URL.createObjectURL(selected)
    try {
      await validateMediaMetadata(selected, url)
      if (!alive.current) { URL.revokeObjectURL(url); return }
      clearPrepared()
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
      objectUrl.current = url
      setFile(selected); setPreviewUrl(url); setRestoredAttachment(null)
      if (selected.name !== restoredAttachment?.name) { setMediaTitle(''); setAltText('') }
    } catch (reason) {
      URL.revokeObjectURL(url); input.value = ''
      if (alive.current) setError(reason instanceof Error ? reason.message : 'This file could not be previewed. Select another file.')
    } finally { working.current = false; if (alive.current) setOperation(null) }
  }
  function removeMedia() {
    clearPrepared(); setFile(null); setRestoredAttachment(null); setPreviewUrl(null); setMediaTitle(''); setAltText('')
    if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = null }
    if (fileInput.current) fileInput.current.value = ''
  }
  async function refreshConnection() {
    setChecking(true); setError('')
    try { await loadSnapshot() } catch (reason) { showError(reason) } finally { if (alive.current) setChecking(false) }
  }
  async function checkDraft() {
    if (!draft || checking || working.current) return
    const id = draft.id
    setChecking(true); setError('')
    try {
      const result = await request(`${ENDPOINT}?draftId=${encodeURIComponent(id)}`)
      if (!result.ok || !result.draft) throw new PublishingError('unavailable')
      if (draftId.current !== id) return
      if (uncertainDraft.current === id && ['ready', 'uploading', 'processing'].includes(result.draft.status)) {
        setError('The publishing result is still unconfirmed. Check the Wallace Shift Page before starting another post.'); return
      }
      acceptDraft(result.draft); setProcessingPaused(false)
    } catch (reason) { showError(reason) } finally { if (alive.current) setChecking(false) }
  }
  async function review(event: FormEvent) {
    event.preventDefault()
    if (working.current || terminal || !ready || draft?.status === 'ready' || draft?.status === 'processing') return
    if (!text.trim() || count > limits.text) { setError('Enter post text within the 3,000 character limit.'); return }
    if (Array.from(mediaTitle).length > 200 || Array.from(altText).length > 4086) { setError('Shorten the media title or image description before continuing.'); return }
    if (restoredMedia) { setError('Reselect the media file so you can review it before publishing.'); return }
    working.current = true; setOperation('reviewing'); setError(''); setUploadProgress(0); setProcessingPaused(false)
    try {
      const media: PublishingMediaInput | undefined = file ? { name: file.name, mimeType: file.type as PublishingMediaInput['mimeType'], size: file.size, title: mediaTitle.trim(), altText: altText.trim() } : undefined
      let current = draft?.status === 'uploading' && file ? draft : await action({ action: 'prepare', text, ...(media ? { media } : {}) })
      acceptDraft(current); setText(current.text)
      if (current.media && current.status === 'uploading') {
        if (!file) throw new PublishingError('invalid_media')
        setOperation('uploading')
        let uploaded = current.media.parts.filter(part => part.uploaded).reduce((sum, part) => sum + part.lastByte - part.firstByte + 1, 0)
        setUploadProgress(Math.round(uploaded / file.size * 100))
        for (const part of current.media.parts) {
          if (part.uploaded) continue
          const result = await request(`${ENDPOINT}?action=upload&draftId=${encodeURIComponent(current.id)}&part=${part.index}`, { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: file.slice(part.firstByte, part.lastByte + 1) })
          if (!result.ok || !result.draft) throw new PublishingError('upload_failed')
          current = result.draft; acceptDraft(current)
          uploaded += part.lastByte - part.firstByte + 1
          setUploadProgress(Math.min(100, Math.round(uploaded / file.size * 100)))
        }
        current = await action({ action: 'finalize', draftId: current.id }); acceptDraft(current)
      }
      requestAnimationFrame(() => previewHeading.current?.focus({ preventScroll: true }))
    } catch (reason) { showError(reason) }
    finally { working.current = false; if (alive.current) setOperation(null) }
  }
  async function publish() {
    if (working.current || !draft || draft.status !== 'ready' || !ready || restoredMedia) return
    const original = draft
    working.current = true; setOperation('publishing'); setError('')
    acceptDraft({ ...original, status: 'publishing', detail: 'Sending this reviewed post to LinkedIn.' })
    try { acceptDraft(await action({ action: 'publish', draftId: original.id, confirm: true })) }
    catch (reason) {
      uncertainDraft.current = original.id
      acceptDraft({ ...original, status: 'review', detail: 'We could not confirm the publishing result. Check its status and the Wallace Shift Page before starting another post.' })
      showError(reason)
      try {
        const result = await request(`${ENDPOINT}?draftId=${encodeURIComponent(original.id)}`)
        if (result.ok && result.draft && !['ready', 'uploading', 'processing'].includes(result.draft.status)) acceptDraft(result.draft)
      } catch { /* Keep the uncertain result until the owner checks it. */ }
    } finally { working.current = false; if (alive.current) setOperation(null) }
  }
  function newPost() {
    if (working.current || (draft?.status === 'review' || draft?.status === 'publishing') && !checkedPage) return
    removeMedia(); setText('')
  }
  const previewText = draft?.text ?? text
  const previewMedia = draft?.media ?? (file ? { kind: file.type.startsWith('image/') ? 'image' : 'video', name: file.name, size: file.size, title: mediaTitle, altText } : restoredAttachment)
  const canReview = ready && !busy && !terminal && draft?.status !== 'ready' && draft?.status !== 'processing' && Boolean(text.trim()) && count <= limits.text && !restoredMedia
  const needsReview = draft?.status === 'review' || draft?.status === 'publishing'

  return <div className="linkedin-publisher">
    <section className="lp-destination" aria-label="Publishing destination">
      <div className="lp-page-identity"><img src="/brand/wallace-shift-logo-black.svg" alt="" width="42" height="42" /><div><span>Posting as</span><strong>{snapshot?.page.name ?? 'Wallace Shift'}</strong><small>LinkedIn company Page · Public post</small></div></div>
      <div className="lp-connection"><span className={`lp-connection-state${ready ? ' lp-connection-ready' : ''}`}>{loading ? 'Checking Page access…' : ready ? 'Page access confirmed' : 'Connection needs attention'}</span><button type="button" className="bd-text-button" onClick={refreshConnection} disabled={busy || loading || checking}>{checking ? 'Checking connection…' : 'Refresh Page connection'}</button></div>
    </section>
    {snapshot?.connection.detail && <p className="lp-connection-detail">{snapshot.connection.detail}</p>}
    {error && <div className="lp-alert" role="alert"><p>{error}</p>{accessExpired && <a href="/client-portal?view=business">Sign in to the owner account</a>}</div>}
    {loading && <p className="lp-loading" role="status">Loading your LinkedIn workspace.</p>}
    {!loading && <>
      <div className="lp-workspace">
        <form className="lp-composer" onSubmit={review} aria-label="LinkedIn post composer">
          <div className="lp-section-heading"><h2>Create a post</h2><span>Text, image, or video</span></div>
          <label className="lp-field" htmlFor="lp-text">Post text<textarea id="lp-text" value={text} rows={9} placeholder="What would you like to share?" disabled={busy || terminal} aria-describedby="lp-count" aria-invalid={count > limits.text || undefined} onChange={event => { clearPrepared(); setText(event.target.value) }} /></label>
          <div className={`lp-character-count${count > limits.text ? ' lp-over-limit' : ''}`} id="lp-count" aria-live="polite">{count.toLocaleString()} / {limits.text.toLocaleString()} characters</div>
          <div className="lp-media-picker"><label className="lp-field" htmlFor="lp-file">Image or video<input ref={fileInput} id="lp-file" type="file" accept="image/jpeg,image/png,video/mp4,.jpg,.jpeg,.png,.mp4" disabled={busy || terminal} onChange={selectFile} aria-describedby="lp-file-help" /></label><p id="lp-file-help">One JPEG or PNG image up to 4 MB, or an MP4 video from 75 KB to 200 MB. Videos must be 3 seconds to 30 minutes long.</p>{operation === 'validating' && <p role="status">Checking the selected file.</p>}</div>
          {(file || previewMedia) && <div className="lp-media-details"><div className="lp-file-row"><span><strong>{file?.name ?? previewMedia?.name}</strong><small>{bytesLabel(file?.size ?? previewMedia?.size ?? 0)}</small></span><button type="button" className="bd-text-button" disabled={busy || terminal} onClick={removeMedia}>Remove media</button></div>
            <label className="lp-field" htmlFor="lp-media-title">Media title <span className="lp-optional">Optional</span><input id="lp-media-title" value={mediaTitle} maxLength={400} disabled={busy || terminal} onChange={event => { clearPrepared(); setMediaTitle(event.target.value) }} /><small>Up to 200 characters.</small></label>
            {previewMedia?.kind === 'image' && <label className="lp-field" htmlFor="lp-alt">Image description <span className="lp-optional">Optional</span><textarea id="lp-alt" rows={2} value={altText} disabled={busy || terminal} onChange={event => { clearPrepared(); setAltText(event.target.value) }} /><small>Describe the image for people using screen readers. Up to 4,086 characters.</small></label>}
          </div>}
          {restoredMedia && !terminal && <p className="lp-restore-note">This review includes {restoredAttachment?.name}. Reselect the media file to restore its preview before publishing, or choose Remove media.</p>}
          {!terminal && <div className="lp-review-action"><button className="bd-button bd-button-primary" type="submit" disabled={!canReview}>{operation === 'validating' ? 'Checking media…' : operation === 'uploading' ? `Uploading ${uploadProgress}%` : operation === 'reviewing' ? 'Preparing review…' : draft?.status === 'uploading' ? 'Resume upload' : 'Review post'}</button>{draft?.status === 'uploading' && !busy && <button type="button" className="bd-text-button" onClick={clearPrepared}>Restart upload</button>}<p>Reviewing uploads selected media to LinkedIn. Your post stays unpublished until you choose Publish to LinkedIn.</p></div>}
          {operation === 'uploading' && <div className="lp-progress" role="status"><progress value={uploadProgress} max={100} aria-label="Media upload progress" /><span>{uploadProgress}% uploaded. Keep this page open.</span></div>}
        </form>
        <section className="lp-preview-section" aria-labelledby="lp-preview-title">
          <div className="lp-section-heading"><h2 id="lp-preview-title" ref={previewHeading} tabIndex={-1}>Post preview</h2><span>{draft ? statusLabels[draft.status] : 'Draft'}</span></div>
          <article className="lp-preview-card" aria-label="LinkedIn post preview">
            <header><img src="/brand/wallace-shift-logo-black.svg" alt="" width="40" height="40" /><div><strong>{snapshot?.page.name ?? 'Wallace Shift'}</strong><span>Company Page · Public</span></div><span className="lp-linkedin-mark" aria-label="LinkedIn">in</span></header>
            <p className={`lp-preview-text${!previewText.trim() ? ' lp-preview-placeholder' : ''}`}>{previewText.trim() ? previewText : 'Your post will appear here as you write.'}</p>
            {previewMedia && (previewUrl ? <div className="lp-preview-media">{previewMedia.kind === 'image' ? <img src={previewUrl} alt={previewMedia.altText || 'Selected post image'} /> : <video src={previewUrl} controls preload="metadata" aria-label="Selected post video" />}{previewMedia.title && <p>{previewMedia.title}</p>}</div> : <div className="lp-restored-media"><strong>{previewMedia.kind === 'image' ? 'Image attached' : 'Video attached'}</strong><span>{previewMedia.name}</span><small>The local preview is unavailable after reloading.</small></div>)}
          </article>
          <p className="lp-preview-note">Preview is approximate. LinkedIn controls the final layout.</p>
          {draft && <div className={`lp-publish-panel lp-publish-${draft.status}`} aria-live="polite">
            <strong>{statusLabels[draft.status]}</strong>
            {draft.detail && <p>{draft.detail}</p>}
            {draft.status === 'processing' && <><p>{processingPaused ? 'Processing is taking longer than expected. Check again when you are ready.' : 'LinkedIn is preparing your media. Publishing becomes available when it is ready.'}</p><button className="bd-text-button" type="button" onClick={checkDraft} disabled={checking}>{checking ? 'Checking media…' : 'Check media status'}</button></>}
            {draft.status === 'ready' && <><p>Publish this reviewed post publicly as {snapshot?.page.name ?? 'Wallace Shift'}.</p><div className="lp-publish-actions"><button type="button" className="bd-button bd-button-primary" disabled={busy || !ready || restoredMedia} onClick={publish}>Publish to LinkedIn</button><button type="button" className="bd-text-button" disabled={busy} onClick={clearPrepared}>Edit post</button></div></>}
            {draft.status === 'published' && <div className="lp-publish-actions">{linkedInUrl(draft.postUrl) && <a className="bd-button bd-button-primary" href={linkedInUrl(draft.postUrl)} target="_blank" rel="noopener noreferrer">View published post</a>}<button type="button" className="bd-text-button" onClick={newPost}>New post</button></div>}
            {needsReview && <><p>Check LinkedIn before making another publishing attempt. This workspace will not resend the post automatically.</p><div className="lp-publish-actions"><button type="button" className="bd-button" onClick={checkDraft} disabled={busy || checking}>{checking ? 'Checking status…' : 'Check publishing status'}</button>{pageUrl && <a href={pageUrl} target="_blank" rel="noopener noreferrer">Open Wallace Shift Page</a>}</div>{!busy && <><label className="lp-confirm-check"><input type="checkbox" checked={checkedPage} onChange={event => setCheckedPage(event.target.checked)} />I checked the Page for this post.</label><button type="button" className="bd-text-button" onClick={newPost} disabled={!checkedPage}>New post</button></>}</>}
            {draft.status === 'failed' && <button type="button" className="bd-text-button" onClick={clearPrepared}>Edit post and review again</button>}
          </div>}
        </section>
      </div>
      <section className="lp-history" aria-labelledby="lp-history-title"><div className="lp-section-heading"><h2 id="lp-history-title">Recent publishing attempts</h2><span>This workspace only</span></div>{snapshot?.history.length ? <ul>{snapshot.history.map(item => <li key={item.id}><div><strong className={`lp-history-status lp-history-${item.status}`}>{statusLabels[item.status]}</strong><time dateTime={item.updatedAt}>{dateLabel(item.updatedAt)}</time></div><p>{Array.from(item.text).slice(0, 180).join('')}{Array.from(item.text).length > 180 ? '…' : ''}</p>{item.media && <span className="lp-history-media">{item.media.kind === 'image' ? 'Image' : 'Video'} · {item.media.name}</span>}{item.detail && <small>{item.detail}</small>}{linkedInUrl(item.postUrl) && <a href={linkedInUrl(item.postUrl)} target="_blank" rel="noopener noreferrer">View on LinkedIn</a>}</li>)}</ul> : <p className="lp-empty-history">Posts published from this workspace will appear here. Existing LinkedIn posts are not imported.</p>}</section>
    </>}
  </div>
}
