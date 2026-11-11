/** Website demo handoffs use the existing contact endpoint. All sends are mocked. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, extname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const modules = new Map()
async function compileModule(path) {
  const absolute = resolve(root, path)
  if (modules.has(absolute)) return modules.get(absolute)
  let javascript = ts.transpileModule(await readFile(absolute, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText
  for (const match of [...javascript.matchAll(/from (['"])([^'"]+)\1/g)]) {
    const specifier = match[2]
    const target = specifier.startsWith('.')
      ? await compileModule(resolve(dirname(absolute), specifier + (extname(specifier) ? '' : '.ts')))
      : import.meta.resolve(specifier)
    javascript = javascript.replace(match[0], `from ${JSON.stringify(target)}`)
  }
  const url = `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
  modules.set(absolute, url)
  return url
}

const { demoHandoffHref, readDemoHandoff } = await import(await compileModule('src/lib/demoHandoff.ts'))

test('Site B keeps website context through the established contact URL', () => {
  const href = demoHandoffHref('deercreekplumbing')
  assert.equal(href, '/contact?demo=deercreekplumbing&project=website')
  const demo = readDemoHandoff(new URL(href, 'https://wallaceshift.com').search)
  assert.equal(demo.id, 'deercreekplumbing')
  assert.equal(demo.project, 'website')
  assert.equal(demo.href, '/demo/deercreekplumbing')
  assert.equal(demo.headlineLines.join(' '), 'Let’s discuss your website.')
  assert.equal(demo.headlineAccent, '')
  assert.equal(demo.supporting, 'Tell Matthew about your business and what customers need to understand or accomplish online.')
})

test('ordinary contact visitors and Site A retain their established context', () => {
  assert.equal(demoHandoffHref('deercreek'), '/contact?demo=deercreek')
  const original = readDemoHandoff('?demo=deercreek')
  assert.equal([...original.headlineLines, original.headlineAccent].join(' '), 'Let’s plan a website for your business.')
  assert.equal(original.project, undefined)
  for (const search of ['', '?project=website', '?demo=unknown', '?demo=constructor', '?demo=__proto__']) {
    assert.equal(readDemoHandoff(search), null, search)
  }
})

test('the existing endpoint carries Site B and website context without relaying arbitrary context', async () => {
  const { default: handler } = await import(await compileModule('api/contact.ts'))
  const { submitContactRequest } = await import(await compileModule('src/lib/contactAdapter.ts'))
  const sent = []
  const realFetch = globalThis.fetch
  const keys = ['RESEND_API_KEY', 'CONTACT_TO_EMAIL', 'CONTACT_FROM_EMAIL']
  const previous = keys.map(key => process.env[key])
  Object.assign(process.env, { RESEND_API_KEY: 'test-key', CONTACT_TO_EMAIL: 'inbox@example.com', CONTACT_FROM_EMAIL: 'site@example.com' })
  globalThis.fetch = async (url, init) => {
    if (url === '/api/contact') {
      return handler(new Request('https://example.com/api/contact', init))
    }
    assert.equal(url, 'https://api.resend.com/emails')
    sent.push(JSON.parse(init.body))
    return new Response('{}', { status: 200 })
  }
  try {
    const base = { name: 'Pat', email: 'pat@example.com', message: 'We need a website for our local business.' }
    assert.deepEqual(await submitContactRequest({ ...base, source: 'deercreekplumbing', project: 'website' }), { ok: true })
    assert.match(sent[0].text, /^Source: Deer Creek Plumbing website demo \(\/demo\/deercreekplumbing\)$/m)
    assert.match(sent[0].text, /^Project: Website project$/m)
    assert.equal(sent[0].subject, 'New enquiry from Pat (Deer Creek Plumbing demo)')
    assert.deepEqual(await submitContactRequest(base), { ok: true })
    assert.doesNotMatch(sent[1].text, /Source:|Project:/)
    assert.equal(sent[1].subject, 'New enquiry from Pat')
    assert.deepEqual(await submitContactRequest({ ...base, source: 'unknown', project: 'website\nInjected: text' }), { ok: true })
    assert.doesNotMatch(sent[2].text, /Source:|Project:|Injected:/)
  } finally {
    globalThis.fetch = realFetch
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key]
      else process.env[key] = previous[index]
    })
  }
})
