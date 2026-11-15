import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'wallace-linkedin-publishing-test-'))
await symlink(join(root, 'node_modules'), join(temporary, 'node_modules'), 'dir')
const compiled = new Map()
async function compile(relative) {
  if (compiled.has(relative)) return compiled.get(relative)
  const target = join(temporary, `${relative}.mjs`); compiled.set(relative, target)
  let source = ts.transpileModule(await readFile(join(root, relative), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, esModuleInterop: true } }).outputText
  for (const match of [...source.matchAll(/(from\s+|import\(\s*)(['"])(\.[^'"]+)\2/g)]) {
    const path = await compile(join(dirname(relative), match[3].replace(/\.js$/, '.ts')))
    source = source.replace(match[0], `${match[1]}${JSON.stringify(pathToFileURL(path).href)}`)
  }
  await mkdir(dirname(target), { recursive: true }); await writeFile(target, source); return target
}
const load = async path => import(pathToFileURL(await compile(path)).href)
const { default: handler } = await load('api/_lib/linkedin-publishing-handler.ts')
const { default: deployedHandler } = await load('api/demo-admin.ts')
const { hash } = await load('api/_lib/portal-auth.ts')
const { trustedUploadUrl, linkedinPlainText } = await load('api/_lib/linkedin-publishing-provider.ts')
const savedEnv = { ...process.env }, savedFetch = globalThis.fetch
const ownerToken = 'a'.repeat(64), clientToken = 'b'.repeat(64), purchaseToken = 'c'.repeat(64)
const ownerEmail = 'owner@example.test', origin = 'http://localhost:5176', author = 'urn:li:organization:143962288'
const redisUrl = 'https://publishing-redis.example.test'
const uploadUrl = 'https://www.linkedin.com/dms-uploads/image?secret=signed-private-url'
let values, lists, calls, mode, mediaStatus, initializeOverride, failSave, postGate, mediaGate, roleRows
const json = value => Response.json(value)
const providerCalls = () => calls.filter(call => call.url !== redisUrl)
const posts = () => providerCalls().filter(call => call.url === 'https://api.linkedin.com/rest/posts')
const writes = () => providerCalls().filter(call => call.init.method !== 'GET')
function draftRecord(id) { return [...values].find(([key]) => key.endsWith(`:draft:${id}`)) }
function setDraft(id, change) { const [key, raw] = draftRecord(id); values.set(key, JSON.stringify({ ...JSON.parse(raw), ...change })) }
beforeEach(() => {
  Object.assign(process.env, { NODE_ENV: 'test', VERCEL_ENV: 'development', DEMO_AUDIT_REDIS_URL: redisUrl, DEMO_AUDIT_REDIS_TOKEN: 'secret-store-token', PORTAL_ADMIN_EMAIL: ownerEmail, DASHBOARD_LINKEDIN_ACCESS_TOKEN: 'secret-linkedin-token', DASHBOARD_LINKEDIN_API_VERSION: '202610' })
  delete process.env.VERCEL
  values = new Map(); lists = new Map(); calls = []; mode = 'okay'; mediaStatus = 'AVAILABLE'; initializeOverride = undefined; failSave = false; postGate = undefined; mediaGate = undefined
  roleRows = [{ organization: author, role: 'ADMINISTRATOR', state: 'APPROVED' }]
  for (const [token, session] of [[ownerToken, { email: ownerEmail }], [clientToken, { email: 'client@example.test' }], [purchaseToken, { email: ownerEmail, engagementId: 'purchase' }]]) values.set(`portal:session:${hash(token)}`, JSON.stringify(session))
  globalThis.fetch = async (url, init = {}) => {
    url = String(url); calls.push({ url, init })
    if (url === redisUrl) {
      const command = JSON.parse(init.body), [operation] = command
      if (operation === 'GET') return json({ result: values.get(command[1]) ?? null })
      if (operation === 'LRANGE') return json({ result: (lists.get(command[1]) ?? []).slice(command[2], command[3] + 1) })
      if (operation === 'EVAL') {
        const [, script, count, ...rest] = command, keys = rest.slice(0, count), args = rest.slice(count)
        if (script.includes('linkedin-publishing-rate')) { const n = Number(values.get(keys[0]) ?? 0) + 1; values.set(keys[0], n); return json({ result: n }) }
        if (script.includes('linkedin-publishing-create')) { if (values.has(keys[0])) return json({ result: 0 }); values.set(keys[0], args[0]); lists.set(keys[1], [args[1], ...lists.get(keys[1]) ?? []].slice(0, 50)); return json({ result: 1 }) }
        if (script.includes('linkedin-publishing-cas')) {
          if (failSave && JSON.parse(args[1]).status === 'published') return json({ error: 'private storage details' })
          if (values.get(keys[0]) !== args[0]) return json({ result: 0 })
          values.set(keys[0], args[1]); return json({ result: 1 })
        }
      }
      throw new Error(`Unexpected Redis operation ${operation}`)
    }
    assert.equal(init.redirect, 'error')
    if (url.startsWith('https://www.linkedin.com/dms-uploads/')) {
      assert.equal(init.method, 'PUT')
      if (url.includes('/image')) assert.equal(init.headers.authorization, 'Bearer secret-linkedin-token')
      else assert.equal(init.headers.authorization, undefined)
      return new Response(null, { status: 201, headers: { etag: `"/ambry-video/signedId/part-${url.includes('part=1') ? 1 : 0}.bin"` } })
    }
    assert.ok(url.startsWith('https://api.linkedin.com/rest/'), `Unexpected provider ${url}`)
    assert.equal(init.headers.authorization, 'Bearer secret-linkedin-token')
    assert.equal(init.headers['LinkedIn-Version'], '202610')
    if (url.includes('organizationAcls')) {
      assert.ok(url.includes('q=roleAssignee'))
      if (mode === 'role-denied') return new Response('secret-linkedin-token', { status: 403 })
      return json({ elements: roleRows })
    }
    if (url.includes('action=initializeUpload')) {
      if (initializeOverride) return json(initializeOverride)
      const body = JSON.parse(init.body), size = body.initializeUploadRequest.fileSizeBytes
      assert.equal(body.initializeUploadRequest.owner, author)
      if (url.includes('/images?')) return json({ value: { image: 'urn:li:image:testimage', uploadUrl, uploadUrlExpiresAt: Date.now() + 3600000 } })
      const uploadInstructions = []
      for (let firstByte = 0, part = 0; firstByte < size; firstByte += 4194304, part++) uploadInstructions.push({ firstByte, lastByte: Math.min(size - 1, firstByte + 4194303), uploadUrl: `https://www.linkedin.com/dms-uploads/video?part=${part}&secret=private-upload` })
      return json({ value: { video: 'urn:li:video:testvideo', uploadToken: '', uploadUrlsExpireAt: Date.now() + 3600000, uploadInstructions } })
    }
    if (url.includes('action=finalizeUpload')) return new Response(null, { status: 200 })
    if (init.method === 'GET' && /\/(images|videos)\//.test(url)) {
      if (mediaGate) await mediaGate()
      return json({ owner: author, id: url.includes('/images/') ? 'urn:li:image:testimage' : 'urn:li:video:testvideo', status: mediaStatus })
    }
    if (url.endsWith('/posts')) {
      if (postGate) await postGate()
      if (mode === 'network') throw new Error('secret-linkedin-token private upstream')
      if (mode === 'server') return new Response('secret-linkedin-token private body', { status: 503 })
      if (mode === 'permission') return new Response('secret-linkedin-token private body', { status: 403 })
      if (mode === 'missing-id') return new Response(null, { status: 201 })
      return new Response(null, { status: 201, headers: { 'x-restli-id': 'urn:li:share:12345' } })
    }
    throw new Error(`Unexpected LinkedIn request ${url}`)
  }
})
after(async () => { globalThis.fetch = savedFetch; for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key]; Object.assign(process.env, savedEnv); await rm(temporary, { recursive: true, force: true }) })
async function call({ token = ownerToken, method = 'GET', url = '/api/business-publishing', headers = {}, query, body, dispatch = handler } = {}) {
  const req = { url, method, socket: { remoteAddress: '127.0.0.1' }, headers: { host: 'localhost:5176', cookie: `wallace_client_session=${token}`, ...(method === 'POST' ? { origin, 'content-type': Buffer.isBuffer(body) ? 'application/octet-stream' : 'application/json' } : {}), ...headers }, query, body }
  const response = { headers: {}, statusCode: 200, setHeader(key, value) { this.headers[key.toLowerCase()] = value }, end(value) { this.body = JSON.parse(value) } }
  await dispatch(req, response); return response
}
const post = body => call({ method: 'POST', body })
async function prepare(text = 'A practical workflow.', media) { const response = await post({ action: 'prepare', text, ...(media ? { media } : {}) }); assert.equal(response.statusCode, 200, JSON.stringify(response.body)); return response.body.draft }
const publish = id => post({ action: 'publish', draftId: id, confirm: true })
function png() { const body = Buffer.alloc(32); Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(body); body.write('IHDR', 12); body.writeUInt32BE(1, 16); body.writeUInt32BE(1, 20); return body }
const image = bytes => ({ name: 'workflow.png', mimeType: 'image/png', size: bytes.length, title: 'Workflow', altText: 'A workflow diagram.' })
const partUpload = (id, part, body) => call({ method: 'POST', query: { action: 'upload', draftId: id, part: String(part) }, body })

test('owner, purchase grant and strict Origin guards precede every provider request', async () => {
  for (const [token, code] of [['', 401], [clientToken, 403], [purchaseToken, 403]]) {
    assert.equal((await call({ token })).statusCode, code)
    assert.equal((await call({ token, method: 'POST', body: { action: 'prepare', text: 'private' } })).statusCode, code)
  }
  calls.length = 0
  for (const headers of [{ origin: undefined }, { origin: 'https://attacker.test' }, { 'sec-fetch-site': 'cross-site' }, { host: 'attacker.test' }]) assert.equal((await call({ method: 'POST', body: { action: 'prepare', text: 'hello' }, headers })).statusCode, 403)
  assert.equal((await call({ headers: { 'sec-fetch-site': 'cross-site' } })).statusCode, 403)
  assert.equal((await call({ method: 'DELETE' })).statusCode, 405)
  assert.equal(calls.length, 0)
})
test('snapshot uses member role on the fixed Page and never writes to LinkedIn', async () => {
  const response = await call()
  assert.equal(response.body.snapshot.connection.status, 'ready')
  assert.match(response.body.snapshot.connection.detail, /posting permission when you publish/)
  assert.equal(response.body.snapshot.page.id, '143962288')
  assert.deepEqual(response.body.snapshot.history, [])
  assert.match(response.headers['cache-control'], /no-store/)
  assert.equal(response.headers['vercel-cdn-cache-control'], 'no-store')
  roleRows = [{ organization: 'urn:li:organization:999', role: 'ADMINISTRATOR', state: 'APPROVED' }]
  assert.equal((await call()).body.snapshot.connection.status, 'needs-sign-in')
  delete process.env.DASHBOARD_LINKEDIN_ACCESS_TOKEN
  assert.equal((await call()).body.snapshot.connection.status, 'needs-setup')
  assert.equal(writes().length, 0)
})
test('deployed alias and rewrite route support req.query without granting customers access', async () => {
  for (const url of ['/api/business-publishing', '/api/demo-admin?publishing=linkedin']) assert.equal((await call({ url, dispatch: deployedHandler })).body.snapshot.page.id, '143962288')
  const draft = await prepare()
  assert.equal((await call({ url: '/api/demo-admin', query: { publishing: 'linkedin', draftId: draft.id }, dispatch: deployedHandler })).body.draft.id, draft.id)
  assert.equal((await call({ url: '/api/demo-admin', query: { publishing: 'linkedin' }, dispatch: deployedHandler, token: clientToken })).statusCode, 403)
  assert.equal((await call({ query: { draftId: ['one', 'two'] } })).statusCode, 400)
  assert.equal((await call({ url: `/?draftId=${draft.id}&draftId=${draft.id}` })).statusCode, 400)
})
test('prepare validates all input before upload initialization and counts Unicode characters', async () => {
  const invalid = [
    { text: 'a'.repeat(3001) }, { text: '' }, { text: 'x', author: 'urn:li:organization:999' },
    { text: 'x', media: { ...image(png()), size: 4194305 } },
    { text: 'x', media: { ...image(png()), mimeType: 'image/svg+xml' } },
    { text: 'x', media: { ...image(png()), title: 'x'.repeat(201) } },
    { text: 'x', media: { ...image(png()), altText: 'x'.repeat(4087) } },
    { text: 'x', media: { ...image(png()), url: 'https://attacker.test' } },
    { text: 'x', media: { name: 'x.mp4', mimeType: 'video/mp4', size: 2048, title: '', altText: '' } },
  ]
  for (const value of invalid) assert.equal((await post({ action: 'prepare', ...value })).statusCode, 400)
  assert.equal(writes().length, 0)
  const draft = await prepare('😀'.repeat(3000))
  assert.equal(draft.status, 'ready')
  assert.equal((await call({ query: { draftId: draft.id } })).body.draft.text, draft.text)
  assert.equal(posts().length, 0)
})
test('text publish requires explicit confirmation, locks fixed author and returns durable idempotent result', async () => {
  const text = 'Hello @team #work [a](b) {c} | <d> \\ *_~'
  const draft = await prepare(text)
  assert.equal((await post({ action: 'publish', draftId: draft.id })).statusCode, 400)
  assert.equal((await post({ action: 'publish', draftId: draft.id, confirm: true, text: 'changed' })).statusCode, 400)
  assert.equal(posts().length, 0)
  const result = await publish(draft.id)
  assert.equal(result.body.draft.status, 'published')
  assert.equal(result.body.draft.postUrl, 'https://www.linkedin.com/feed/update/urn:li:share:12345/')
  const body = JSON.parse(posts()[0].init.body)
  assert.equal(body.author, author); assert.equal(body.commentary, linkedinPlainText(text)); assert.equal(body.visibility, 'PUBLIC'); assert.equal(body.distribution.feedDistribution, 'MAIN_FEED')
  assert.match(body.commentary, /\\@team/)
  assert.equal(body.content, undefined)
  assert.equal((await publish(draft.id)).body.draft.status, 'published')
  assert.equal(posts().length, 1)
  const snapshot = (await call()).body.snapshot
  assert.equal(snapshot.history[0].postUrl, result.body.draft.postUrl)
  assert.ok(!JSON.stringify(snapshot).includes('secret-'))
  assert.deepEqual(JSON.parse(draftRecord(draft.id)[1]).audit.map(entry => entry.action), ['prepared', 'publish_reserved', 'published'])
})
test('concurrent confirmations reserve once and cannot duplicate an in-flight post', async () => {
  const draft = await prepare()
  let release, reached
  const entered = new Promise(resolve => { reached = resolve })
  postGate = () => new Promise(resolve => { release = resolve; reached() })
  const first = publish(draft.id); await entered
  const second = await publish(draft.id)
  assert.equal(second.body.draft.status, 'publishing'); assert.equal(posts().length, 1)
  release(); assert.equal((await first).body.draft.status, 'published')
  assert.equal((await publish(draft.id)).body.draft.status, 'published'); assert.equal(posts().length, 1)
})
test('ambiguous provider outcomes remain blocked for replay, while known rejection is actionable', async () => {
  for (const outcome of ['network', 'server', 'missing-id', 'permission']) {
    mode = outcome
    const draft = await prepare(), result = await publish(draft.id)
    assert.equal(result.body.draft.status, outcome === 'permission' ? 'failed' : 'review')
    assert.ok(!JSON.stringify(result.body).includes('secret-'))
    const count = posts().length
    assert.equal((await publish(draft.id)).body.draft.status, result.body.draft.status)
    assert.equal(posts().length, count)
    if (outcome !== 'permission') assert.match(result.body.draft.detail, /Check the Wallace Shift Page/)
  }
})
test('failed persistence after upstream acceptance leaves a permanent reservation', async () => {
  const draft = await prepare(); failSave = true
  assert.equal((await publish(draft.id)).body.error, 'storage_unavailable')
  failSave = false
  assert.equal((await publish(draft.id)).body.draft.status, 'publishing')
  assert.equal(posts().length, 1)
  setDraft(draft.id, { updatedAt: new Date(Date.now() - 180000).toISOString() })
  assert.equal((await call({ query: { draftId: draft.id } })).body.draft.status, 'review')
  assert.equal((await publish(draft.id)).body.draft.status, 'review'); assert.equal(posts().length, 1)
})
test('image upload validates bytes, keeps upload credentials private and publishes only AVAILABLE media', async () => {
  const buffer = png(), draft = await prepare('Image post', image(buffer))
  assert.equal(draft.status, 'uploading'); assert.equal(draft.media.parts.length, 1)
  assert.ok(!JSON.stringify(draft).includes('dms-uploads')); assert.ok(!JSON.stringify(draft).includes('urn:li:image'))
  assert.equal((await partUpload(draft.id, 0, Buffer.alloc(buffer.length))).body.error, 'media_signature')
  assert.equal((await partUpload(draft.id, 0, Buffer.alloc(buffer.length + 1))).statusCode, 413)
  assert.equal(providerCalls().filter(call => call.init.method === 'PUT').length, 0)
  assert.equal((await partUpload(draft.id, 0, buffer)).body.draft.media.parts[0].uploaded, true)
  assert.equal((await partUpload(draft.id, 0, buffer)).statusCode, 200)
  const changed = Buffer.from(buffer); changed[30] = 1
  assert.equal((await partUpload(draft.id, 0, changed)).body.error, 'media_changed')
  assert.equal(providerCalls().filter(call => call.init.method === 'PUT').length, 1)
  const finalized = await post({ action: 'finalize', draftId: draft.id }); assert.equal(finalized.body.draft.status, 'processing')
  assert.equal((await partUpload(draft.id, 0, buffer)).statusCode, 409)
  mediaStatus = 'PROCESSING'; assert.equal((await call({ query: { draftId: draft.id } })).body.draft.status, 'processing')
  assert.equal((await publish(draft.id)).body.error, 'draft_not_ready')
  mediaStatus = 'AVAILABLE'; assert.equal((await call({ query: { draftId: draft.id } })).body.draft.status, 'ready')
  assert.equal(posts().length, 0)
  const published = await publish(draft.id); assert.equal(published.body.draft.status, 'published')
  assert.deepEqual(JSON.parse(posts()[0].init.body).content.media, { id: 'urn:li:image:testimage', title: 'Workflow', altText: 'A workflow diagram.' })
})
test('video respects provider chunk ranges, ordered ETags, no upload bearer and explicit finalization', async () => {
  const buffer = Buffer.alloc(4194304 + 80000); buffer.writeUInt32BE(24); buffer.write('ftyp', 4); buffer.write('isom', 8)
  const draft = await prepare('Video post', { name: 'demo.mp4', mimeType: 'video/mp4', size: buffer.length, title: 'Demo', altText: '' })
  assert.deepEqual(draft.media.parts.map(part => [part.firstByte, part.lastByte]), [[0, 4194303], [4194304, buffer.length - 1]])
  assert.equal((await post({ action: 'finalize', draftId: draft.id })).body.error, 'media_incomplete')
  assert.equal((await partUpload(draft.id, 1, buffer.subarray(4194304))).body.error, 'invalid_part')
  assert.equal((await partUpload(draft.id, 0, buffer.subarray(0, 4194304))).statusCode, 200)
  assert.equal((await partUpload(draft.id, 1, buffer.subarray(4194304))).statusCode, 200)
  assert.equal((await post({ action: 'finalize', draftId: draft.id })).body.draft.status, 'processing')
  const finalizeCalls = providerCalls().filter(call => call.url.includes('action=finalizeUpload'))
  assert.equal(finalizeCalls.length, 1)
  assert.deepEqual(JSON.parse(finalizeCalls[0].init.body).finalizeUploadRequest, { video: 'urn:li:video:testvideo', uploadToken: '', uploadedPartIds: ['/ambry-video/signedId/part-0.bin', '/ambry-video/signedId/part-1.bin'] })
  assert.equal((await post({ action: 'finalize', draftId: draft.id })).body.draft.status, 'processing')
  assert.equal(providerCalls().filter(call => call.url.includes('action=finalizeUpload')).length, 1)
  assert.equal(posts().length, 0)
})
test('SSRF and provider malformed range defenses fail closed before uploading', async () => {
  for (const value of ['http://www.linkedin.com/dms-uploads/a', 'https://www.linkedin.com.attacker.test/dms-uploads/a', 'https://127.0.0.1/dms-uploads/a', 'https://user:password@www.linkedin.com/dms-uploads/a', 'https://www.linkedin.com/other', 'https://www.linkedin.com:444/dms-uploads/a']) assert.throws(() => trustedUploadUrl(value))
  initializeOverride = { value: { image: 'urn:li:image:x', uploadUrl: 'https://attacker.test/x', uploadUrlExpiresAt: Date.now() + 3600000 } }
  const response = await post({ action: 'prepare', text: 'hello', media: image(png()) })
  assert.equal(response.body.error, 'linkedin_invalid_upload')
  assert.equal(providerCalls().some(call => call.url.includes('attacker.test')), false)
  initializeOverride = { value: { video: 'urn:li:video:x', uploadToken: '', uploadUrlsExpireAt: Date.now() + 3600000, uploadInstructions: [{ firstByte: 1, lastByte: 79999, uploadUrl }] } }
  assert.equal((await post({ action: 'prepare', text: 'hello', media: { name: 'x.mp4', mimeType: 'video/mp4', size: 80000, title: '', altText: '' } })).body.error, 'linkedin_invalid_upload')
})
test('stale media poll cannot overwrite a newer publishing reservation', async () => {
  const buffer = png(), draft = await prepare('Poll race', image(buffer))
  await partUpload(draft.id, 0, buffer); await post({ action: 'finalize', draftId: draft.id })
  mediaGate = async () => { setDraft(draft.id, { status: 'publishing', detail: 'A newer request reserved publishing.' }) }
  assert.equal((await call({ query: { draftId: draft.id } })).body.draft.status, 'publishing')
  assert.equal(JSON.parse(draftRecord(draft.id)[1]).status, 'publishing')
  assert.equal(posts().length, 0)
})
test('draft ownership and environment namespace prevent sharing drafts', async () => {
  const draft = await prepare()
  process.env.PORTAL_ADMIN_EMAIL = 'other@example.test'
  values.set(`portal:session:${hash(ownerToken)}`, JSON.stringify({ email: 'other@example.test' }))
  assert.equal((await call({ query: { draftId: draft.id } })).statusCode, 404)
  process.env.PORTAL_ADMIN_EMAIL = ownerEmail; process.env.VERCEL_ENV = 'production'
  values.set(`portal:live:session:${hash(ownerToken)}`, JSON.stringify({ email: ownerEmail }))
  assert.equal((await call({ query: { draftId: draft.id } })).statusCode, 404)
})
