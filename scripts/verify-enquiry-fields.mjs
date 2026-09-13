/** The structured enquiry questions, from the options a reader sees through
 * to the text the endpoint sends. No network requests are made. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const root = new URL('../', import.meta.url)
const asModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const sent = []
const adapter = asModule(`export async function submitContactRequest(payload) {
  globalThis.__enquiries.push(payload); return { ok: true }
}`)
globalThis.__enquiries = sent
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
    else if (specifier.endsWith('/router')) target = asModule('export const navigate = () => {}')
    else if (!specifier.startsWith('.')) target = import.meta.resolve(specifier)
    else {
      for (const extension of ['.ts', '.tsx']) {
        try { target = await compileModule(new URL(specifier + extension, url)); break } catch (error) {
          if (error.code !== 'ENOENT') throw error
        }
      }
      assert.ok(target, `Unresolved test import: ${specifier}`)
    }
    javascript = javascript.replace(match[0], `from ${JSON.stringify(target)}`)
  }
  const compiled = asModule(javascript)
  modules.set(url.href, compiled)
  return compiled
}
const load = async path => import(await compileModule(new URL(path, root)))

const { enquiryBudgets, enquiryPackages, enquiryServices } = await load('src/content/enquiry.ts')
const { ContactForm } = await load('src/components/ContactForm/ContactForm.tsx')
const { services } = await load('src/content/siteConfig.ts')
const { siteTiers } = await load('src/content/pricing.ts')

await test('every enquiry option names something the site actually publishes', () => {
  for (const item of services.items) {
    assert.ok(enquiryServices.some(option => option.label.includes(item.label)),
      `the service list offers ${item.label}`)
  }
  for (const tier of siteTiers.tiers) {
    assert.ok(enquiryPackages.some(option => option.value === tier.id),
      `the package list offers ${tier.name}`)
  }
  // A reader who does not know yet has to be able to say so, or the answer
  // they give is noise rather than information.
  for (const [name, list] of [['services', enquiryServices],
    ['packages', enquiryPackages], ['budgets', enquiryBudgets]]) {
    assert.ok(list.some(option => option.value === 'unsure'), `${name} allow "not sure yet"`)
    const values = list.map(option => option.value)
    assert.equal(new Set(values).size, values.length, `${name} have no duplicate values`)
    for (const option of list) {
      assert.ok(option.label.trim().length > 0 && option.value.trim().length > 0)
    }
  }
})

const render = (props = {}) => renderToStaticMarkup(
  createElement(ContactForm, { idPrefix: 'test', submitLabel: 'Send', ...props }))

await test('the extra questions appear only where they were asked for', () => {
  const short = render()
  const detailed = render({ detailed: true })
  for (const field of ['test-name', 'test-email', 'test-message']) {
    assert.ok(short.includes(field), `the short form keeps ${field}`)
    assert.ok(detailed.includes(field), `the detailed form keeps ${field}`)
  }
  for (const field of ['test-website', 'test-service', 'test-package', 'test-budget']) {
    assert.ok(!short.includes(field), `the short form is unchanged and has no ${field}`)
    assert.ok(detailed.includes(field), `the detailed form asks ${field}`)
  }
  // None of the new questions may be required, and none may preselect an
  // answer the reader did not give.
  const selects = detailed.match(/<select[^>]*>/g) ?? []
  assert.equal(selects.length, 3, 'three choices')
  for (const select of selects) assert.ok(!/required/.test(select), 'choices are optional')
  assert.equal((detailed.match(/<option value=""/g) ?? []).length, 3,
    'each choice opens on an unanswered state')
  // Every label is bound to its control, or the form is unusable by keyboard
  // and unreadable to a screen reader.
  for (const id of ['test-website', 'test-service', 'test-package', 'test-budget']) {
    assert.ok(detailed.includes(`for="${id}"`), `${id} has a bound label`)
    assert.ok(detailed.includes(`id="${id}"`), `${id} exists to be bound to`)
  }
  assert.ok(detailed.includes('type="checkbox"'), 'the reader can say they have no website yet')
})

await test('the endpoint renders only the answers that were given', async () => {
  const source = await readFile(new URL('api/contact.ts', root), 'utf8')
  // The structured answers are optional, so a missing one must not turn a
  // real enquiry into a validation failure.
  assert.match(source, /if \(!name \|\| !email \|\| !message\)/,
    'only the original three fields are required')
  for (const field of ['website', 'service', 'packageChoice', 'budget']) {
    assert.match(source, new RegExp(`\\.\\.\\.\\(${field} \\? \\[`),
      `${field} is added to the message only when answered`)
  }
  // These are single-line choices rendered into a labelled plain-text body,
  // so a newline inside one would forge another labelled line.
  assert.match(source, /replace\(\/\[\\r\\n\]\+\/g, ' '\)/,
    'line breaks are collapsed out of the structured answers')
  assert.match(source, /noWebsite === true/, 'the no-website answer is carried explicitly')
  assert.match(source, /MAX_CHOICE|MAX_URL/, 'the new fields are length-capped like the old ones')
})
