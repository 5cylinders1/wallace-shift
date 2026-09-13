/** Contact-state lifecycle and rendered-form checks; no network requests. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const base = new URL('../src/components/Hero/', import.meta.url)
const asModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const adapter = asModule('export async function submitContactRequest() { throw new Error("Unexpected default submission in offline test") }')
const modules = new Map()
async function compileModule(url) {
  if (modules.has(url.href)) return modules.get(url.href)
  const source = (await readFile(url, 'utf8')).replace(/import ['"][^'"]+\.css['"]\s*;?/g, '')
  let javascript = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText
  for (const match of [...javascript.matchAll(/from (['"])([^'"]+)\1/g)]) {
    const specifier = match[2]
    let target
    if (specifier.endsWith('/contactAdapter')) target = adapter
    else if (!specifier.startsWith('.')) target = import.meta.resolve(specifier)
    else {
      for (const extension of ['.ts', '.tsx']) {
        try { target = await compileModule(new URL(specifier + extension, url)); break } catch (error) {
          if (error.code !== 'ENOENT') throw error
        }
      }
      assert.ok(target, `Unresolved test import: ${specifier}`)
    }
    javascript = javascript.replace(match[0], `from '${target}'`)
  }
  const module = asModule(javascript)
  modules.set(url.href, module)
  return module
}

const { createHeroContactState } = await import(await compileModule(new URL('heroContactState.ts', base)))
const { HeroContactContext, useHeroContactState } = await import(await compileModule(new URL('useHeroContactState.ts', base)))
const { HeroContactProvider } = await import(await compileModule(new URL('HeroContactProvider.tsx', base)))
const { HeroContactCard } = await import(await compileModule(new URL('HeroContactCard.tsx', base)))
const deferred = () => {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}
const renderCard = controller => renderToStaticMarkup(createElement(HeroContactContext.Provider,
  { value: controller }, createElement(HeroContactCard)))

await test('drafts survive presentation subscriptions while separate controllers remain isolated', () => {
  const first = createHeroContactState()
  const second = createHeroContactState()
  assert.equal(first.getSnapshot(), first.getSnapshot(), 'external-store snapshots must be stable')
  const observed = []
  const stop = first.subscribe(() => observed.push(first.getSnapshot()))
  first.setName('Jordan Example')
  first.setEmail('jordan@example.com')
  stop()
  first.setName('Jordan Updated')
  assert.equal(observed.length, 2, 'removed presentation must no longer be notified')
  assert.deepEqual(first.getSnapshot(), { name: 'Jordan Updated', email: 'jordan@example.com', status: 'idle' })
  assert.deepEqual(second.getSnapshot(), { name: '', email: '', status: 'idle' })
  const replacement = []
  const release = first.subscribe(() => replacement.push(first.getSnapshot()))
  first.setEmail('updated@example.com')
  assert.equal(replacement[0].name, 'Jordan Updated')
  release()
})

await test('a pending request survives a presentation swap and cannot send twice', async () => {
  const result = deferred()
  const payloads = []
  const controller = createHeroContactState(payload => { payloads.push(payload); return result.promise })
  controller.setName('Casey Example')
  controller.setEmail('casey@example.com')
  const stop = controller.subscribe(() => {})
  const first = controller.submit()
  stop()
  assert.equal(controller.getSnapshot().status, 'submitting')
  assert.match(renderCard(controller), /disabled=""/)
  assert.match(renderCard(controller), /value="casey@example\.com"/)
  const resumed = controller.submit()
  assert.equal(resumed, first, 'the replacement must share the original in-flight request')
  controller.setEmail('later-edit@example.com')
  await Promise.resolve()
  assert.deepEqual(payloads, [{ name: 'Casey Example', email: 'casey@example.com', message: '' }])
  result.resolve({ ok: true })
  await first
  assert.deepEqual(controller.getSnapshot(), { name: '', email: '', status: 'sent' })
  assert.match(renderCard(controller), /Thanks — we will be in touch\./)
  assert.doesNotMatch(renderCard(controller), /disabled=""/)
})

await test('unsent requests retain the draft and existing feedback, with a working retry', async () => {
  for (const reason of ['not_configured', 'invalid', 'network_error']) {
    const responses = [{ ok: false, reason }, { ok: true }]
    const payloads = []
    const controller = createHeroContactState(async payload => { payloads.push(payload); return responses.shift() })
    controller.setName('Taylor Example')
    controller.setEmail('taylor@example.com')
    await controller.submit()
    assert.equal(controller.getSnapshot().status, reason === 'not_configured' ? 'not_configured' : 'error')
    assert.equal(controller.getSnapshot().name, 'Taylor Example')
    assert.equal(controller.getSnapshot().email, 'taylor@example.com')
    assert.match(renderCard(controller), reason === 'not_configured'
      ? /This form is not connected yet\./ : /Something went wrong\. Please retry\./)
    await controller.submit()
    assert.equal(controller.getSnapshot().status, 'sent')
    assert.equal(payloads.length, 2)
    assert.deepEqual(payloads[1], payloads[0])
  }
})

await test('a rejected adapter does not leave the shared form stuck submitting', async () => {
  let attempts = 0
  const controller = createHeroContactState(async () => {
    if (++attempts === 1) throw new Error('offline mock failure')
    return { ok: true }
  })
  controller.setName('Alex Example')
  await controller.submit()
  assert.equal(controller.getSnapshot().status, 'error')
  assert.equal(controller.getSnapshot().name, 'Alex Example')
  await controller.submit()
  assert.equal(controller.getSnapshot().status, 'sent')
  assert.equal(attempts, 2)
})

await test('the provider shares state only inside its own homepage and standalone forms still work', () => {
  const captured = []
  function Probe() { captured.push(useHeroContactState()); return null }
  renderToStaticMarkup(createElement(HeroContactProvider, null,
    createElement(Probe), createElement(Probe)))
  const [one, sibling] = captured
  one.setName('Shared draft')
  assert.equal(sibling.getSnapshot().name, 'Shared draft')
  renderToStaticMarkup(createElement(HeroContactProvider, null, createElement(Probe)))
  assert.equal(captured[2].getSnapshot().name, '', 'a new homepage owns a fresh form')
  renderToStaticMarkup(createElement(Probe))
  renderToStaticMarkup(createElement(Probe))
  captured[3].setName('Standalone draft')
  assert.equal(captured[4].getSnapshot().name, '', 'standalone forms cannot share drafts')
  const markup = renderToStaticMarkup(createElement(HeroContactCard))
  assert.match(markup, /noValidate=""/)
  assert.match(markup, /id="hero-contact-name"[^>]*required=""[^>]*value=""/)
  assert.match(markup, /id="hero-contact-email"[^>]*type="email"[^>]*required=""/)
  assert.match(markup, /By sending, you&#x27;re okay with us following up about your project\./)
})
