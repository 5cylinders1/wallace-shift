/** Checks the built Deer Creek Plumbing concept (run after `vite build`):
 * every page's metadata and JSON-LD, heading order, image text, internal
 * links, palette contrast, the service-area lookup, the booking prefill, and
 * the Wallace Shift handoff from the demo to /contact (with a mocked send). */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const modules = new Map()
async function compileModule(path) {
  if (modules.has(path)) return modules.get(path)
  const absolute = resolve(root, path)
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
  modules.set(path, url)
  return url
}

const { agency, pages, reviews, SITE } = await import(await compileModule('src/demos/deercreek/content.ts'))
const { prefillFrom } = await import(await compileModule('src/demos/deercreek/booking.ts'))
const { demoHandoffHref, readDemoHandoff } = await import(await compileModule('src/lib/demoHandoff.ts'))
const { lookupArea } = await import(await compileModule('src/demos/deercreek/area.ts'))
const paths = pages.map(page => (page.slug ? `${SITE.base}/${page.slug}` : SITE.base))
const known = new Set(paths)
const titles = new Set()
const descriptions = new Set()

for (const path of paths) {
  await test(`built page ${path}`, async () => {
    const html = await readFile(join(root, 'dist', path.slice(1), 'index.html'), 'utf8')
    const canonical = `${SITE.origin}${path}`
    const title = html.match(/<title>([^<]+)<\/title>/g) ?? []
    assert.equal(title.length, 1, 'one title')
    assert.ok(!titles.has(title[0]), 'unique title'); titles.add(title[0])
    const description = html.match(/<meta name="description" content="([^"]+)"/g) ?? []
    assert.equal(description.length, 1, 'one description')
    assert.ok(!descriptions.has(description[0]), 'unique description'); descriptions.add(description[0])
    assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1, 'one canonical')
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}" />`), 'canonical is the clean public URL')
    assert.ok(html.includes(`property="og:url" content="${canonical}"`))
    assert.equal((html.match(/name="robots"/g) ?? []).length, 1, 'one robots tag')
    assert.ok(html.includes('<meta name="robots" content="noindex, nofollow" />'), 'the concept stays unindexed')
    assert.ok(!html.includes('/demo-assets/'), 'no private demo bundles')

    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    assert.equal(scripts.length, 1, 'one JSON-LD graph')
    const graph = JSON.parse(scripts[0][1])['@graph']
    const ids = graph.map(node => node['@id'])
    assert.equal(new Set(ids).size, ids.length, 'unique @ids')
    const business = graph.find(node => node['@type'] === 'Plumber')
    assert.ok(business, 'Plumber entity')
    assert.equal(business.telephone, '+1-913-440-9102')
    assert.equal(business.address.postalCode, '66062')
    assert.ok(!graph.some(node => node.aggregateRating || node.review), 'no third-party reviews marked up')
    const page = graph.find(node => node['@id'] === `${canonical}#webpage`)
    assert.ok(page, 'page entity')
    assert.equal(page.url, canonical)
    if (path !== SITE.base) assert.ok(graph.some(node => node['@type'] === 'BreadcrumbList'), 'breadcrumb')
    if (path.includes('/services/')) {
      assert.ok(graph.some(node => node['@type'] === 'Service' && node.provider['@id'] === business['@id']), 'Service entity')
      assert.ok(graph.some(node => node['@type'] === 'FAQPage' && node.mainEntity.length > 0), 'FAQPage entity')
    }

    const body = html.slice(html.indexOf('<div id="root"'))
    assert.equal((body.match(/<h1\b/g) ?? []).length, 1, 'exactly one h1')
    const levels = [...body.matchAll(/<h([1-6])\b/g)].map(match => Number(match[1]))
    levels.forEach((level, index) => { if (index) assert.ok(level <= levels[index - 1] + 1, `heading jumps from h${levels[index - 1]} to h${level}`) })
    for (const image of body.match(/<img\b[^>]*>/g) ?? []) assert.match(image, /\balt="/, `image needs alt text: ${image}`)
    assert.ok(body.includes('id="main"'), 'main landmark target')
    assert.ok(body.includes('Skip to main content'), 'skip link')
    for (const [, href] of body.matchAll(/href="(\/demo\/deercreek[^"#?]*)/g)) assert.ok(known.has(href.replace(/\/$/, '')), `internal link resolves: ${href}`)
    assert.doesNotMatch(body, /lorem ipsum|\bTODO\b|\bundefined\b|\bNaN\b/)

    // Wallace Shift's bar sits above the plumbing header on every page and
    // links to the contextual inquiry, not the agency home page.
    const bar = body.indexOf('class="dc-agency"')
    assert.ok(bar > -1 && bar < body.indexOf('class="dc-header"'), 'agency bar above the header')
    assert.ok(body.includes(`href="${demoHandoffHref('deercreek')}"`), 'agency link carries the demo context')
    // The form collects a request for the office to confirm, so no action
    // may promise a booked visit, and no bio may lean on review counts.
    assert.doesNotMatch(body, /Book a visit|>Book<|Named in \d+/)
  })
}

test('home page edits: one review total, two featured quotes, no standards jargon', async () => {
  const html = await readFile(join(root, 'dist', SITE.base.slice(1), 'index.html'), 'utf8')
  const body = html.slice(html.indexOf('<div id="root"'))
  assert.ok(body.includes('Plumbing fixed.') && body.includes('Price agreed first.'))
  assert.ok(body.indexOf('dc-hero-copy') < body.indexOf('dc-hero-figure'), 'copy, action and rating come before the photo')
  assert.equal(body.match(/>286</g)?.length, 1, 'the review total appears once, in the hero rating')
  const marks = [...body.matchAll(/<mark class="dc-voice-key">([^<]+)<\/mark>/g)].map(match => match[1])
  assert.equal(marks.length, 2, 'two featured reviews, each with its key line')
  for (const line of marks) assert.ok(reviews.some(review => review.text.includes(line.replace(/&#x27;/g, "'"))), `quoted word for word: ${line}`)
  assert.doesNotMatch(body, /WCAG/, 'standards detail lives on the accessibility statement')
  assert.match(body, /href="[^"]*\/accessibility"/, 'the home page still links the statement')
})

test('request page: demo notice above the form, request wording, production follow-up', async () => {
  const html = await readFile(join(root, 'dist', SITE.base.slice(1), 'schedule', 'index.html'), 'utf8')
  const body = html.slice(html.indexOf('<div id="root"'))
  const notice = body.indexOf('Interactive demo')
  assert.ok(notice > -1 && notice < body.indexOf('dc-scheduler'), 'the notice sits directly above the form')
  assert.ok(body.includes('Requests entered here are not sent to Deer Creek.'))
  assert.ok(body.includes('Our office will contact you by the next business day to confirm availability.'))
  const accessibility = await readFile(join(root, 'dist', SITE.base.slice(1), 'accessibility', 'index.html'), 'utf8')
  assert.match(accessibility, /WCAG\) 2\.2 at level AA/)
})

test('booking prefill: a valid choice is summarised, anything else opens the catalog', () => {
  const leak = prefillFrom('?issue=leak&service=leak-repair')
  assert.equal(leak.preselected, true)
  assert.equal(leak.draft.service, 'leak-repair')
  assert.equal(leak.draft.issue, 'Water is leaking or spraying')
  assert.equal(leak.draft.urgency, 'emergency')
  assert.equal(leak.draft.details, '', 'the visitor’s own words stay empty')
  assert.equal(prefillFrom('?issue=hot-water').draft.service, 'water-heaters', 'an issue alone implies its service')
  assert.equal(prefillFrom('?service=water-heaters').draft.issue, '')
  const project = prefillFrom('?issue=project')
  assert.equal(project.draft.service, 'other')
  assert.equal(project.draft.urgency, 'flexible')
  assert.equal(project.preselected, true)
  for (const search of ['', '?service=bogus', '?issue=bogus', '?service=__proto__']) {
    const result = prefillFrom(search)
    assert.equal(result.preselected, false, search)
    assert.equal(result.draft.service, '', search)
  }
  assert.equal(prefillFrom('?zip=66062').draft.zip, '66062')
  assert.equal(prefillFrom('?zip=6606').draft.zip, '')
})

test('agency handoff: the demo link opens website copy on /contact and nothing else does', () => {
  assert.equal(agency.inquiry, demoHandoffHref('deercreek'))
  const demo = readDemoHandoff('?demo=deercreek')
  assert.equal(demo?.id, 'deercreek')
  assert.equal(demo?.supporting, 'Tell me what you do and what customers should be able to accomplish online.')
  assert.equal([...demo.headlineLines, demo.headlineAccent].join(' '), 'Let’s plan a website for your business.')
  for (const search of ['', '?demo=', '?demo=other', '?demo=constructor', '?demo=__proto__', '?shift=custom-web-app']) {
    assert.equal(readDemoHandoff(search), null, search)
  }
})

test('the contact endpoint names a known demo source and drops anything else', async () => {
  const { default: handler } = await import(await compileModule('api/contact.ts'))
  const sent = []
  const realFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => { sent.push({ url, body: JSON.parse(init.body) }); return new Response('{}', { status: 200 }) }
  Object.assign(process.env, { RESEND_API_KEY: 'test-key', CONTACT_TO_EMAIL: 'inbox@example.com', CONTACT_FROM_EMAIL: 'site@example.com' })
  const post = body => handler(new Request('https://wallaceshift.com/api/contact', { method: 'POST', body: JSON.stringify(body) }))
  try {
    const base = { name: 'Pat', email: 'pat@example.com', message: 'We fix roofs.' }
    assert.equal((await post({ ...base, source: 'deercreek' })).status, 200)
    assert.equal((await post({ ...base, source: 'constructor' })).status, 200)
    assert.equal((await post({ ...base, source: 'Injected\nSource: forged' })).status, 200)
    assert.equal((await post(base)).status, 200)
    assert.equal(sent.length, 4, 'every enquiry still goes through')
    assert.match(sent[0].body.text, /^Source: Deer Creek Plumbing website demo \(\/demo\/deercreek\)$/m)
    assert.equal(sent[0].body.subject, 'New enquiry from Pat (Deer Creek demo)')
    for (const mail of sent.slice(1)) {
      assert.doesNotMatch(mail.body.text, /Source:/)
      assert.equal(mail.body.subject, 'New enquiry from Pat')
    }
  } finally {
    globalThis.fetch = realFetch
    for (const key of ['RESEND_API_KEY', 'CONTACT_TO_EMAIL', 'CONTACT_FROM_EMAIL']) delete process.env[key]
  }
})

test('palette contrast', () => {
  const luminance = hex => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const ratio = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }
  const pairs = [
    ['#0f1a24', '#f7f4ee', 7], ['#34424f', '#f7f4ee', 7], ['#34424f', '#efe8dc', 7], ['#154c80', '#f7f4ee', 7], ['#154c80', '#ffffff', 7],
    ['#8a3d16', '#f7f4ee', 4.5], ['#ffffff', '#a6481b', 4.5], ['#ffffff', '#8a3a14', 4.5], ['#f4f1ea', '#0b1724', 7],
    ['#dbe3ea', '#0b1724', 7], ['#9ccaf2', '#0b1724', 7], ['#f2b48c', '#0b1724', 7], ['#a3221b', '#fbe5e2', 4.5], ['#1d6b3a', '#ffffff', 4.5],
    // Wallace Shift's bar and notice, and the bar's hover state.
    ['#060708', '#f1efe9', 7], ['#45494e', '#f1efe9', 7], ['#f1efe9', '#060708', 7], ['#c9d3dc', '#0b1724', 7],
  ]
  for (const [fg, bg, min] of pairs) assert.ok(ratio(fg, bg) >= min, `${fg} on ${bg} is ${ratio(fg, bg).toFixed(2)}:1, needs ${min}:1`)
})

test('service area lookup', () => {
  const found = query => { const result = lookupArea(query); assert.equal(result.kind, 'found', query); return result }
  assert.equal(found('66062').band, 'core')
  assert.equal(found("Lee's Summit").band, 'core')
  assert.equal(found('lees summit, mo').label, "Lee's Summit, MO")
  assert.equal(found('Overland Park KS').band, 'core')
  assert.equal(found('Blue Springs').band, 'edge')
  assert.equal(found('Topeka').band, 'outside')
  assert.equal(lookupArea('Kansas City').kind, 'choose')
  assert.equal(lookupArea('90210').kind, 'unknown-zip')
  assert.equal(lookupArea('Springfield, IL').kind, 'not-found')
  assert.equal(lookupArea('  ').kind, 'empty')
})
