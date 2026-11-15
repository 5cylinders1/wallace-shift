import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { playwright } from '../videos/contractor-previews/runtime.mjs'

// Isolated browser fixtures only. Every API request and external origin is
// intercepted; this script cannot upload media or publish to a real account.
const base = process.env.DASHBOARD_TEST_URL ?? 'http://127.0.0.1:5184'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname))
const output = '/tmp/wallace-linkedin-publishing-review'
await mkdir(output, { recursive: true })
const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } })
const errors = [], calls = [], uploads = []
page.on('pageerror', error => errors.push(error.message))
const time = '2026-11-14T16:00:00.000Z'
const target = { id: '143962288', name: 'Wallace Shift', url: 'https://www.linkedin.com/company/wallace-shift/' }
let drafts = new Map(), activeId, serial = 0, publishMode = 'success', connectionMode = 'ready', reportMode = 'ok'
let processingPolls = 0
let failVideoPart = true
const publishCalls = () => calls.filter(call => call.action === 'publish')
const snapshot = () => ({
  page: target, connection: { status: connectionMode, detail: connectionMode === 'ready' ? 'Page access verified in a browser fixture.' : 'Reconnect LinkedIn to continue.' },
  limits: { text: 3000, imageBytes: 4 * 1024 * 1024, videoBytes: 200 * 1024 * 1024 },
  history: [...drafts.values()].filter(draft => ['published', 'review', 'failed', 'publishing'].includes(draft.status)).reverse(),
})
const reporting = {
  schemaVersion: 1, generatedAt: time, environment: 'development',
  range: { days: 30, startDate: '2026-10-15', endDate: '2026-11-13', timeZone: 'America/Chicago' },
  sources: [], brief: [], agentPolicy: { mode: 'read-only', executionEnabled: false, summaryMethod: 'rules', allowed: [], requiresApproval: [], note: 'Browser fixture only.' },
}
await page.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url())
  if (url.origin !== new URL(base).origin) return route.abort()
  if (url.pathname === '/api/client-portal') return route.fulfill({ json: { ok: true, authenticated: true, admin: true, email: 'fixture@example.test', engagements: [] } })
  if (url.pathname === '/api/business-dashboard') return reportMode === 'error'
    ? route.fulfill({ status: 503, json: { ok: false, error: 'dashboard_unavailable' } })
    : route.fulfill({ json: { ok: true, snapshot: reporting } })
  if (url.pathname === '/api/ai-booking') return route.fulfill({ json: { ok: true, configured: false, connected: false } })
  if (url.pathname === '/api/business-publishing') {
    if (request.method() === 'GET') {
      const id = url.searchParams.get('draftId')
      if (!id) return route.fulfill({ json: { ok: true, snapshot: snapshot() } })
      const draft = drafts.get(id)
      if (!draft) return route.fulfill({ status: 404, json: { ok: false, error: 'draft_not_found' } })
      if (draft.status === 'processing' && ++processingPolls >= 2) draft.status = 'ready'
      return route.fulfill({ json: { ok: true, draft } })
    }
    assert.equal(request.method(), 'POST')
    if (url.searchParams.get('action') === 'upload') {
      const draft = drafts.get(url.searchParams.get('draftId'))
      const index = Number(url.searchParams.get('part'))
      const part = draft.media.parts[index]
      const bytes = request.postDataBuffer()
      assert.equal(bytes.length, part.lastByte - part.firstByte + 1)
      assert.equal(request.headers()['content-type'], 'application/octet-stream')
      if (draft.media.kind === 'video' && index === 1 && failVideoPart) {
        failVideoPart = false
        return route.fulfill({ status: 502, json: { ok: false, error: 'linkedin_upload_failed' } })
      }
      uploads.push({ draftId: draft.id, index, bytes })
      part.uploaded = true
      return route.fulfill({ json: { ok: true, draft } })
    }
    const body = request.postDataJSON()
    calls.push(body)
    if (body.action === 'prepare') {
      activeId = `00000000-0000-4000-8000-${String(++serial).padStart(12, '0')}`
      const media = body.media
      const parts = []
      if (media) {
        // Smaller fixture ranges exercise resumable multipart transfer with the
        // existing local video. The application follows provider ranges exactly.
        const size = media.mimeType === 'video/mp4' ? 256 * 1024 : media.size
        for (let offset = 0; offset < media.size; offset += size) parts.push({ index: parts.length, firstByte: offset, lastByte: Math.min(media.size - 1, offset + size - 1), uploaded: false })
      }
      const draft = {
        id: activeId, pageId: target.id, text: body.text, status: media ? 'uploading' : 'ready', createdAt: time, updatedAt: time,
        ...(media ? { media: { ...media, kind: media.mimeType === 'video/mp4' ? 'video' : 'image', parts } } : {}),
      }
      drafts.set(activeId, draft)
      return route.fulfill({ json: { ok: true, draft } })
    }
    const draft = drafts.get(body.draftId)
    assert.ok(draft, 'Actions must use the reviewed server draft')
    if (body.action === 'finalize') {
      assert.ok(draft.media.parts.every(part => part.uploaded))
      processingPolls = 0
      draft.status = 'processing'
      return route.fulfill({ json: { ok: true, draft } })
    }
    if (body.action === 'publish') {
      assert.equal(body.confirm, true)
      assert.equal(draft.status, 'ready', 'Unprocessed media cannot be published')
      draft.status = publishMode === 'success' ? 'published' : 'review'
      if (publishMode === 'success') draft.postUrl = 'https://www.linkedin.com/feed/update/urn:li:share:123456789/'
      else draft.detail = 'Check the Wallace Shift Page before trying again. LinkedIn did not confirm the outcome.'
      return route.fulfill({ json: { ok: true, draft } })
    }
    throw new Error(`Unexpected publishing action: ${body.action}`)
  }
  if (url.pathname.startsWith('/api/')) throw new Error(`Unexpected API: ${url.pathname}`)
  return route.continue()
})
const review = () => page.getByRole('button', { name: 'Review post', exact: true })
const publish = () => page.getByRole('button', { name: 'Publish to LinkedIn', exact: true })
const newPost = () => page.getByRole('button', { name: 'New post', exact: true })

try {
  await page.goto(`${base}/client-portal?view=business`)
  await page.getByRole('heading', { name: 'Business overview', exact: true }).waitFor()
  assert.equal(calls.length, 0)
  await page.getByRole('button', { name: 'LinkedIn publishing', exact: true }).click()
  await page.getByRole('textbox', { name: 'Post text', exact: true }).waitFor()
  await page.getByRole('textbox', { name: 'Post text', exact: true }).fill('Browser fixture only. Nothing in this test is sent to LinkedIn.')
  assert.equal(publishCalls().length, 0)
  await page.screenshot({ path: `${output}/composer-desktop.png`, fullPage: true })
  await review().click()
  await publish().waitFor()
  assert.equal(publishCalls().length, 0, 'Reviewing a draft must not publish')
  assert.equal(drafts.get(activeId).status, 'ready')
  await page.screenshot({ path: `${output}/review-desktop.png`, fullPage: true })
  await publish().click()
  await page.locator('a[href="https://www.linkedin.com/feed/update/urn:li:share:123456789/"]').first().waitFor()
  assert.equal(publishCalls().length, 1)
  await newPost().click()

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aETkAAAAASUVORK5CYII=', 'base64')
  await page.getByRole('textbox', { name: 'Post text', exact: true }).fill('Image fixture. Uploads are intercepted locally.')
  await page.getByLabel('Image or video', { exact: true }).setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: png })
  await page.getByLabel(/^Image description/).fill('A tiny browser test image.')
  await review().click()
  await page.waitForFunction(() => {
    const buttons = [...document.querySelectorAll('button')]
    return buttons.some(button => button.textContent.trim() === 'Publish to LinkedIn' && !button.disabled)
  })
  assert.deepEqual(uploads.at(-1).bytes, png)
  assert.equal(publishCalls().length, 1)
  await page.getByRole('button', { name: 'Edit post', exact: true }).click()
  await page.getByRole('textbox', { name: 'Post text', exact: true }).fill('Edited image fixture requires a new review.')
  assert.equal(await publish().count(), 0)
  await review().click()
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Publish to LinkedIn' && !button.disabled))
  publishMode = 'review'
  await publish().click()
  await page.getByText('Check the Wallace Shift Page before trying again. LinkedIn did not confirm the outcome.', { exact: true }).first().waitFor()
  assert.equal(publishCalls().length, 2)
  if (await publish().count()) assert.equal(await publish().isEnabled(), false)
  await page.screenshot({ path: `${output}/uncertain-desktop.png`, fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(async () => { window.scrollTo(0, 0); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
  await page.screenshot({ path: `${output}/uncertain-mobile.png`, fullPage: true })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Mobile publishing should not overflow horizontally')
  assert.equal(await newPost().isEnabled(), false)
  await page.getByLabel('I checked the Page for this post.', { exact: true }).check()
  await newPost().click()
  publishMode = 'success'
  const video = await readFile(new URL('../public/media/ai-consultation/wallace-shift-put-ai-to-work-15s.mp4', import.meta.url))
  await page.getByRole('textbox', { name: 'Post text', exact: true }).fill('Video fixture using a local project asset. No external upload.')
  await page.getByLabel('Image or video', { exact: true }).setInputFiles({ name: 'fixture.mp4', mimeType: 'video/mp4', buffer: video })
  await page.getByLabel(/^Media title/).fill('Local test video')
  const beforeUploads = uploads.length
  const beforePrepare = calls.filter(call => call.action === 'prepare').length
  await review().click()
  const resume = page.getByRole('button', { name: 'Resume upload', exact: true })
  await resume.waitFor()
  await resume.click()
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Publish to LinkedIn' && !button.disabled))
  assert.equal(calls.filter(call => call.action === 'prepare').length, beforePrepare + 1, 'Resume must reuse the prepared draft')
  assert.ok(uploads.length - beforeUploads > 1, 'Video fixture must exercise multiple upload parts')
  assert.deepEqual(Buffer.concat(uploads.slice(beforeUploads).map(part => part.bytes)), video)
  assert.equal(publishCalls().length, 2)
  await page.screenshot({ path: `${output}/video-review-mobile.png`, fullPage: true })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))

  // Reporting failures must not make the independent publishing view disappear.
  reportMode = 'error'
  await page.getByRole('button', { name: 'Overview', exact: true }).click()
  await page.getByRole('button', { name: 'Refresh data', exact: true }).click()
  await page.getByRole('button', { name: 'LinkedIn publishing', exact: true }).click()
  await page.getByRole('heading', { name: 'LinkedIn publishing', exact: true }).waitFor()
  assert.equal(publishCalls().length, 2)

  // Reloading must restore the draft but never silently lose its media if the
  // local File is gone. Editing still requires reselecting or removing it.
  page.once('dialog', dialog => dialog.accept())
  await page.reload()
  await page.getByRole('button', { name: 'LinkedIn publishing', exact: true }).click()
  await publish().waitFor()
  assert.equal(await publish().isEnabled(), false)
  await page.getByRole('button', { name: 'Edit post', exact: true }).click()
  await page.getByRole('textbox', { name: 'Post text', exact: true }).fill('Reloaded video still requires a local preview.')
  assert.equal(await review().isEnabled(), false)
  await page.getByRole('button', { name: 'Remove media', exact: true }).click()
  assert.equal(await review().isEnabled(), true)
  await page.getByRole('textbox', { name: 'Post text', exact: true }).fill('A'.repeat(3001))
  assert.equal(await review().isEnabled(), false)
  await page.getByRole('textbox', { name: 'Post text', exact: true }).fill('Connection check fixture.')
  connectionMode = 'needs-sign-in'
  await page.getByRole('button', { name: 'Refresh Page connection', exact: true }).click()
  await page.getByText('Reconnect LinkedIn to continue.', { exact: true }).waitFor()
  assert.equal(await review().isEnabled(), false)
  assert.equal(publishCalls().length, 2)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ passed: true, fixturePublishRequests: publishCalls().length, uploadParts: uploads.length, screenshots: output, realProviderRequests: 0 }, null, 2))
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {})
  console.error(JSON.stringify({ pageErrors: errors, currentUrl: page.url(), recentActions: calls.slice(-5).map(call => call.action) }))
  throw error
} finally {
  await browser.close()
}
