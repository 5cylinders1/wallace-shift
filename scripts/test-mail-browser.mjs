import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { playwright } from '../videos/contractor-previews/runtime.mjs'

// An isolated static Vite server and request interception ensure neither sign-in
// codes nor composed messages can reach the application's real email provider.
const server = process.env.MAIL_TEST_URL ? null : await createServer({ configFile: false, plugins: [react()], logLevel: 'error', server: { host: '127.0.0.1', port: 0, hmr: false, open: false } })
if (server) await server.listen()
const origin = process.env.MAIL_TEST_URL ?? server.resolvedUrls.local[0]
const output = process.env.MAIL_BROWSER_OUTPUT ?? '/tmp/wallace-mail-review'
await mkdir(output, { recursive: true })
const { chromium } = await playwright()
let browser
const signatures = { 'matthew@wallaceshift.com': '', 'bella@wallaceshift.com': '' }
const messages = []
const actions = []
let authenticated = false
let sendMode = 'failed'
let forgetNextRetry = false
let reserveThenRateLimit = false
const session = () => ({ ok: true, authenticated, ...(authenticated ? { email: 'matthew@wallaceshift.com', signatures, messages } : {}) })

async function mock(page) {
  await page.route('**/*', async route => {
    const target = new URL(route.request().url())
    if (target.origin !== new URL(origin).origin) return route.abort()
    if (target.pathname === '/api/mail') {
      if (route.request().method() === 'GET') return route.fulfill({ json: session() })
      const body = route.request().postDataJSON(); actions.push(body)
      if (body.action === 'send-code') return route.fulfill({ json: { ok: true } })
      if (body.action === 'verify-code') { assert.equal(body.code, '123456'); authenticated = true; return route.fulfill({ json: session() }) }
      if (body.action === 'logout') { authenticated = false; return route.fulfill({ json: session() }) }
      if (!authenticated) return route.fulfill({ status: 401, json: { error: 'access_required' } })
      if (body.action === 'save-signature') {
        signatures[body.sender] = body.html.replace(/<script[\s\S]*?<\/script>/gi, '')
        return route.fulfill({ json: session() })
      }
      if (body.action === 'send') {
        const message = { id: body.id, from: body.from, to: body.to, cc: body.cc, bcc: body.bcc, subject: body.subject, html: body.html, attachments: body.attachments.map(file => ({ filename: file.filename, size: Buffer.from(file.content, 'base64').length, contentType: file.contentType })), createdAt: new Date().toISOString(), status: sendMode }
        messages.unshift(message)
        if (reserveThenRateLimit) { reserveThenRateLimit = false; return route.fulfill({ status: 429, json: { error: 'rate_limited' } }) }
        return route.fulfill({ json: { ok: true, message } })
      }
      if (body.action === 'retry-send') {
        if (forgetNextRetry) { forgetNextRetry = false; return route.fulfill({ status: 404, json: { error: 'message_not_found' } }) }
        const message = messages.find(item => item.id === body.id)
        if (!message) return route.fulfill({ status: 404, json: { error: 'message_not_found' } })
        message.status = 'sent'
        return route.fulfill({ json: { ok: true, message } })
      }
      throw new Error(`Unexpected mocked action: ${body.action}`)
    }
    if (target.pathname.startsWith('/api/')) return route.abort()
    return route.continue()
  })
}

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' })
  // Playwright's built-in blocker reads navigator.serviceWorker inside every
  // frame, which throws in our intentionally opaque sandboxed HTML previews.
  // Block registration in the app document without weakening preview isolation.
  await page.addInitScript(() => {
    if (window === window.top && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register = async () => { throw new Error('Service workers are disabled in this isolated test') }
    }
  })
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  page.on('dialog', dialog => dialog.accept())
  await mock(page)
  await page.goto(new URL('/mail', origin).href)
  await page.getByLabel('Work email').fill('outsider@example.test')
  await page.getByRole('button', { name: 'Send sign in code', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'Use your @wallaceshift.com email address' }).waitFor()
  assert.equal(actions.length, 0)
  await page.getByLabel('Work email').fill('matthew@wallaceshift.com')
  await page.getByRole('button', { name: 'Send sign in code', exact: true }).click()
  await page.getByLabel('Sign in code', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: /^Resend in/ }).isDisabled(), true)
  await page.getByLabel('Sign in code', { exact: true }).fill('123456')
  await page.getByRole('button', { name: 'Open mail', exact: true }).click()
  await page.getByRole('heading', { name: 'New message', exact: true }).waitFor()
  assert.deepEqual(actions.slice(0, 2).map(action => action.action), ['send-code', 'verify-code'])

  await page.getByRole('button', { name: 'Signatures', exact: true }).click()
  const signature = '<p><strong>Matthew • Sample signature</strong><br><a href="https://wallaceshift.com">Wallace Shift</a></p>'
  await page.getByLabel('HTML source').fill(`${signature}<script>window.__badSignature = true</script>`)
  assert.equal(await page.locator('iframe[title^="Signature preview"]').evaluate(frame => frame.getAttribute('sandbox')), '')
  await page.getByRole('button', { name: 'Save signature', exact: true }).click()
  await page.getByRole('status').filter({ hasText: 'Signature saved' }).waitFor()
  assert.equal(await page.getByLabel('HTML source').inputValue(), signature)
  await page.getByLabel('Signature for').selectOption('bella@wallaceshift.com')
  await page.getByLabel('HTML source').fill('<p><strong>Bella • Sample signature</strong></p>')
  await page.getByRole('button', { name: 'Save signature', exact: true }).click()
  await page.getByRole('status').filter({ hasText: 'bella@wallaceshift.com' }).waitFor()
  await page.screenshot({ path: `${output}/signatures-desktop.png`, fullPage: true })

  await page.getByRole('button', { name: 'Back to message', exact: true }).click()
  await page.getByLabel('From', { exact: true }).selectOption('bella@wallaceshift.com')
  await page.getByLabel('To', { exact: true }).fill('sample@example.test, another@example.test')
  await page.getByRole('button', { name: 'Cc', exact: true }).click()
  await page.getByLabel('Cc', { exact: true }).fill('copy@example.test')
  await page.getByRole('button', { name: 'Bcc', exact: true }).click()
  await page.getByLabel('Bcc', { exact: true }).fill('hidden@example.test')
  await page.getByLabel('Subject', { exact: true }).fill('Sample browser verification email')
  await page.getByRole('textbox', { name: 'Message body' }).fill('A formatted sample message. No email is sent by this test.')
  await page.getByRole('textbox', { name: 'Message body' }).press('ControlOrMeta+A')
  await page.getByRole('button', { name: 'Bold', exact: true }).click()
  assert.match(await page.getByRole('textbox', { name: 'Message body' }).innerHTML(), /<strong>/)
  await page.getByLabel('Choose attachments').setInputFiles([{ name: 'sample-note.txt', mimeType: 'text/plain', buffer: Buffer.from('Sample attachment, browser test only.') }, { name: 'remove-me.txt', mimeType: 'text/plain', buffer: Buffer.from('Remove this sample.') }])
  await page.getByRole('button', { name: 'Remove remove-me.txt', exact: true }).click()
  assert.equal(await page.locator('.mail-file-list li').count(), 1)
  await page.screenshot({ path: `${output}/compose-desktop.png`, fullPage: true })
  await page.getByRole('button', { name: 'Send email', exact: true }).click()
  await page.getByRole('button', { name: 'Retry sending', exact: true }).waitFor()
  assert.equal(await page.getByLabel('Subject', { exact: true }).isDisabled(), true)
  assert.equal(actions.filter(action => action.action === 'send').length, 1)
  const sent = actions.find(action => action.action === 'send')
  assert.equal(sent.from, 'bella@wallaceshift.com')
  assert.deepEqual(sent.to, ['sample@example.test', 'another@example.test'])
  assert.deepEqual(sent.cc, ['copy@example.test'])
  assert.deepEqual(sent.bcc, ['hidden@example.test'])
  assert.match(sent.html, /<strong>A formatted sample message/)
  assert.match(sent.html, /Bella • Sample signature/)
  assert.equal(sent.attachments.length, 1)
  assert.equal(Buffer.from(sent.attachments[0].content, 'base64').toString(), 'Sample attachment, browser test only.')
  await page.getByRole('button', { name: 'Retry sending', exact: true }).click()
  await page.getByRole('status').filter({ hasText: 'accepted for sending' }).waitFor()
  assert.equal(actions.find(action => action.action === 'retry-send').id, sent.id)
  assert.equal(await page.getByLabel('Subject', { exact: true }).inputValue(), '')
  assert.equal(await page.locator('.mail-file-list li').count(), 0)

  await page.getByRole('button', { name: /^Sent activity/ }).click()
  await page.getByRole('button').filter({ hasText: 'Sample browser verification email' }).click()
  await page.getByRole('heading', { name: 'Sample browser verification email', exact: true }).waitFor()
  await page.getByText('Delivery to the recipient is not confirmed here.', { exact: false }).waitFor()
  assert.equal(await page.locator('iframe[title^="Message:"]').evaluate(frame => frame.getAttribute('sandbox')), '')
  await page.screenshot({ path: `${output}/sent-desktop.png`, fullPage: true })

  await page.getByRole('button', { name: 'Compose', exact: true }).click()
  await page.getByLabel('Subject', { exact: true }).fill('Saved sample draft')
  await page.getByLabel('Choose attachments').setInputFiles({ name: 'reattach.txt', mimeType: 'text/plain', buffer: Buffer.from('Must not persist attachment bytes.') })
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('wallace-mail-draft:matthew@wallaceshift.com')).hadAttachments === true)
  await page.reload()
  await page.getByLabel('Subject', { exact: true }).waitFor()
  assert.equal(await page.getByLabel('Subject', { exact: true }).inputValue(), 'Saved sample draft')
  await page.getByText('Files are not saved with drafts.', { exact: false }).waitFor()
  assert.equal(await page.locator('.mail-file-list li').count(), 0)
  await page.getByRole('button', { name: 'Send without those files', exact: true }).click()

  // A reload preserves an uncertain message ID. An explicit missing-record
  // response unlocks reattachment but must preserve the original sending ID.
  await page.evaluate(() => { const key = 'wallace-mail-draft:matthew@wallaceshift.com'; const draft = JSON.parse(localStorage.getItem(key)); draft.pendingId = '00000000-0000-4000-8000-000000000000'; localStorage.setItem(key, JSON.stringify(draft)) })
  await page.reload()
  await page.getByRole('button', { name: 'Retry sending', exact: true }).waitFor()
  forgetNextRetry = true
  await page.getByRole('button', { name: 'Retry sending', exact: true }).click()
  await page.getByRole('status').filter({ hasText: 'keep the same sending identifier' }).waitFor()
  assert.equal(await page.getByLabel('Subject', { exact: true }).isDisabled(), false)
  assert.equal(actions.filter(action => action.action === 'send').length, 1)
  await page.getByLabel('To', { exact: true }).fill('sample@example.test')
  await page.getByRole('textbox', { name: 'Message body' }).fill('Same identifier recovery sample.')
  reserveThenRateLimit = true
  await page.getByRole('button', { name: 'Retry original email', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'Too many attempts' }).waitFor()
  assert.equal(actions.filter(action => action.action === 'send').at(-1).id, '00000000-0000-4000-8000-000000000000')
  assert.equal(await page.getByLabel('Subject', { exact: true }).isDisabled(), true, 'Rate limiting after reservation must keep the message held')
  await page.getByRole('button', { name: 'Write a separate email', exact: true }).click()
  await page.getByRole('button', { name: 'Keep original and start new', exact: true }).click()
  await page.getByRole('status').filter({ hasText: 'original message remains in Sent activity' }).waitFor()
  assert.equal(await page.getByLabel('Subject', { exact: true }).inputValue(), '')
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('wallace-mail-held:matthew@wallaceshift.com'))[0].id), '00000000-0000-4000-8000-000000000000')
  await page.getByRole('button', { name: /^Sent activity/ }).click()
  await page.getByRole('heading', { name: 'Unresolved sending attempts', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Reopen original', exact: true }).click()
  await page.getByRole('button', { name: 'Retry sending', exact: true }).click()
  await page.getByRole('status').filter({ hasText: 'accepted for sending' }).waitFor()
  assert.equal(actions.filter(action => action.action === 'retry-send').at(-1).id, '00000000-0000-4000-8000-000000000000')
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('wallace-mail-held:matthew@wallaceshift.com')).length), 0)

  // Review status must not permanently trap the sole composer.
  sendMode = 'review'
  await page.getByLabel('To', { exact: true }).fill('sample@example.test')
  await page.getByLabel('Subject', { exact: true }).fill('Sample review status')
  await page.getByRole('textbox', { name: 'Message body' }).fill('Review recovery sample.')
  await page.getByRole('button', { name: 'Send email', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'needs review' }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Retry sending', exact: true }).isDisabled(), true)
  await page.getByRole('button', { name: 'Write a separate email', exact: true }).click()
  await page.getByRole('button', { name: 'Keep original and start new', exact: true }).click()
  assert.equal(await page.getByLabel('Subject', { exact: true }).inputValue(), '')
  await page.getByRole('button', { name: /^Sent activity/ }).click()
  await page.getByRole('button').filter({ hasText: 'Sample review status' }).click()
  await page.getByText('This sending attempt needs review.', { exact: false }).waitFor()
  await page.getByRole('button', { name: 'Compose', exact: true }).click()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByLabel('Subject', { exact: true }).fill('Sample mobile draft')
  await page.getByLabel('To', { exact: true }).fill('sample@example.test')
  await page.getByRole('textbox', { name: 'Message body' }).fill('Sample mobile composition, saved only on this test device.')
  await page.screenshot({ path: `${output}/compose-mobile.png`, fullPage: true })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Mobile composer should not overflow horizontally')
  await page.getByRole('button', { name: 'Signatures', exact: true }).click()
  await page.screenshot({ path: `${output}/signatures-mobile.png`, fullPage: true })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Mobile signature settings should not overflow horizontally')
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await page.getByRole('button', { name: 'Send sign in code', exact: true }).waitFor()
  await page.screenshot({ path: `${output}/signin-mobile.png`, fullPage: true })
  assert.equal(await page.evaluate(() => window.__badSignature), undefined)
  assert.deepEqual(errors, [])
  console.log(`Mail browser checks passed. Screenshots: ${output}`)
} finally {
  if (browser) await browser.close()
  if (server) await server.close()
}
