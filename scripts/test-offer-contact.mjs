/** Exercise the offer inquiry pipeline with a fake inbox. No email is sent. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function loadTypeScript(path) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}

const { default: handler } = await loadTypeScript('api/contact.ts')
const { submitContactRequest } = await loadTypeScript('src/lib/contactAdapter.ts')
const base = { name: 'Pat Example', email: 'pat@example.com', message: 'Please explain what is included.' }

async function withInbox(run) {
  const keys = ['RESEND_API_KEY', 'CONTACT_TO_EMAIL', 'CONTACT_FROM_EMAIL']
  const previous = keys.map(key => process.env[key])
  const realFetch = globalThis.fetch
  const sent = []
  Object.assign(process.env, {
    RESEND_API_KEY: 'test-key',
    CONTACT_TO_EMAIL: 'inbox@example.com',
    CONTACT_FROM_EMAIL: 'site@example.com',
  })
  const inbox = { sent, fail: false, throw: false }
  globalThis.fetch = async (url, init) => {
    if (url === '/api/contact') return handler(new Request('https://example.com/api/contact', init))
    assert.equal(url, 'https://api.resend.com/emails', 'No other network destination is allowed')
    if (inbox.throw) throw new Error('Simulated network failure')
    if (inbox.fail) return new Response('{}', { status: 503 })
    sent.push(JSON.parse(init.body))
    return new Response('{}', { status: 200 })
  }
  try {
    await run(inbox)
  } finally {
    globalThis.fetch = realFetch
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key]
      else process.env[key] = previous[index]
    })
  }
}

function request(value, options = {}) {
  return new Request('https://example.com/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value),
    ...options,
  })
}

test('both offers deliver questions, future plans and shared decisions without qualification gates', async () => {
  await withInbox(async ({ sent }) => {
    for (const offer of ['website', 'lead-follow-up']) {
      for (const readiness of ['ready', 'questions', 'planning']) {
        for (const timing of ['soon', 'later', 'exploring']) {
          for (const decisionRole of ['owner', 'shared', 'researching']) {
            const before = sent.length
            assert.deepEqual(await submitContactRequest({ ...base, offer, readiness, timing, decisionRole }), { ok: true })
            assert.equal(sent.length, before + 1, `${offer}/${readiness}/${timing}/${decisionRole} must reach the inbox`)
            assert.equal(sent.at(-1).reply_to, base.email)
            assert.deepEqual(sent.at(-1).to, ['inbox@example.com'])
          }
        }
      }
    }
    assert.equal(sent.length, 54)
    assert.ok(sent.some(email => email.text.includes('Readiness: I need more information')))
    assert.ok(sent.some(email => email.text.includes('Decision role: Deciding with someone else')))
  })
})

test('the server identifies each offer and its advertised price without trusting submitted package text', async () => {
  await withInbox(async ({ sent }) => {
    await submitContactRequest({ ...base, offer: 'website', package: 'Free forever', businessName: 'Example Roofing', noWebsite: true })
    assert.equal(sent[0].subject, 'New enquiry from Pat Example (Website offer)')
    assert.match(sent[0].text, /^Offer: Website with hosting, maintenance and basic SEO$/m)
    assert.match(sent[0].text, /^Advertised price: \$250\/month$/m)
    assert.match(sent[0].text, /^Offer page: https:\/\/wallaceshift.com\/offers\/contractor-websites$/m)
    assert.match(sent[0].text, /^Business: Example Roofing$/m)
    assert.match(sent[0].text, /^Website: No website yet$/m)
    assert.doesNotMatch(sent[0].text, /Free forever/)

    await submitContactRequest({ ...base, offer: 'lead-follow-up', website: 'https://example.com' })
    assert.equal(sent[1].subject, 'New enquiry from Pat Example (Lead page offer)')
    assert.match(sent[1].text, /^Offer: Lead page plus automatic follow up$/m)
    assert.match(sent[1].text, /^Advertised price: \$1,500 one time$/m)
    assert.match(sent[1].text, /^Offer page: https:\/\/wallaceshift.com\/offers\/lead-page-follow-up$/m)
    assert.match(sent[1].text, /^Website: https:\/\/example.com$/m)
  })
})

test('unanswered or invalid optional context never blocks a genuine inquiry or injects labeled lines', async () => {
  await withInbox(async ({ sent }) => {
    await submitContactRequest({ ...base, offer: 'website' })
    assert.doesNotMatch(sent[0].text, /Business:|Readiness:|Timing:|Decision role:/)
    for (const offer of ['unrecognized', 'constructor', '__proto__']) {
      assert.deepEqual(await submitContactRequest({
        ...base, offer, readiness: 'constructor', timing: '__proto__', decisionRole: 'bad\nInjected: value',
        businessName: 'x'.repeat(121), website: 'x'.repeat(301),
      }), { ok: true })
      assert.doesNotMatch(sent.at(-1).text, /Offer:|Advertised price:|Offer page:|Readiness:|Timing:|Decision role:|Business:|Website:|Injected:/)
    }
    await submitContactRequest({ ...base, businessName: 'Example\nInjected: business', website: 'example.com\r\nInjected: url' })
    assert.match(sent.at(-1).text, /^Business: Example Injected: business$/m)
    assert.match(sent.at(-1).text, /^Website: example.com Injected: url$/m)
    assert.doesNotMatch(sent.at(-1).text, /^Injected:/m)
  })
})

test('generic and demo handoffs keep their existing inbox context', async () => {
  await withInbox(async ({ sent }) => {
    assert.deepEqual(await submitContactRequest({ ...base, package: 'Existing package', service: 'Website', budget: '$2,000' }), { ok: true })
    assert.equal(sent[0].subject, 'New enquiry from Pat Example')
    assert.match(sent[0].text, /^Package: Existing package$/m)
    assert.match(sent[0].text, /^Service: Website$/m)
    assert.match(sent[0].text, /^Budget: \$2,000$/m)
    assert.deepEqual(await submitContactRequest({ ...base, source: 'deercreekplumbing', project: 'website' }), { ok: true })
    assert.equal(sent[1].subject, 'New enquiry from Pat Example (Deer Creek Plumbing demo)')
    assert.match(sent[1].text, /^Project: Website project$/m)
    assert.match(sent[1].text, /^Source: Deer Creek Plumbing website demo \(\/demo\/deercreekplumbing\)$/m)
    assert.equal((await handler(request({ ...base, existingWebsite: 'https://existing.example.com' }))).status, 200)
    assert.match(sent[2].text, /^Website: https:\/\/existing.example.com$/m)
  })
})

test('malformed JSON, missing contact details and spam never reach the inbox', async () => {
  await withInbox(async ({ sent }) => {
    for (const value of [null, [], 'text', 42, true, {}, { ...base, email: 'invalid' }, { ...base, name: '' }, { ...base, message: '' }]) {
      const response = await handler(request(value))
      assert.equal(response.status, 400)
      assert.deepEqual(await response.json(), { ok: false, error: 'invalid' })
    }
    assert.equal((await handler(request({}, { body: '{broken' }))).status, 400)
    assert.equal((await handler(new Request('https://example.com/api/contact'))).status, 405)
    assert.deepEqual(await submitContactRequest({ ...base, offer: 'website', company: 'spam' }), { ok: true })
    assert.equal(sent.length, 0)
  })
})

test('delivery failures and missing configuration are honest client failures', async () => {
  await withInbox(async inbox => {
    inbox.fail = true
    assert.deepEqual(await submitContactRequest({ ...base, offer: 'website' }), { ok: false, reason: 'network_error' })
    inbox.fail = false
    inbox.throw = true
    assert.deepEqual(await submitContactRequest({ ...base, offer: 'lead-follow-up' }), { ok: false, reason: 'network_error' })
    inbox.throw = false
    delete process.env.RESEND_API_KEY
    assert.deepEqual(await submitContactRequest({ ...base, offer: 'website' }), { ok: false, reason: 'not_configured' })
    assert.equal(inbox.sent.length, 0)
  })
})
