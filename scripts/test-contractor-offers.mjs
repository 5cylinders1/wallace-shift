/** Render the real app and exercise offer context through a fake inbox.
 * No browser automation, provider calls, or production inquiries are used. */
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

const root = fileURLToPath(new URL('../', import.meta.url))
const server = await createServer({
  root, configFile: false, plugins: [react()], logLevel: 'error',
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
})
const originalFetch = globalThis.fetch
globalThis.fetch = async () => { throw new Error('Network access is forbidden in offer tests') }

try {
  const [{ renderPage }, { contractorOffers, contractorOfferForPath }, { routeMeta, findRoute }, { resolvePath }, { structuredDataForRoute }, { default: contact }] = await Promise.all([
    server.ssrLoadModule('/src/render.tsx'),
    server.ssrLoadModule('/src/content/contractorOffers.ts'),
    server.ssrLoadModule('/src/content/routeMeta.ts'),
    server.ssrLoadModule('/src/lib/router.ts'),
    server.ssrLoadModule('/src/content/structuredData.ts'),
    server.ssrLoadModule('/api/contact.ts'),
  ])
  const expected = [
    { id: 'website', path: '/offers/contractor-websites', price: '$250', priceLabel: '$250/month' },
    { id: 'lead-follow-up', path: '/offers/lead-page-follow-up', price: '$1,500', priceLabel: '$1,500 one time' },
  ]
  const rendered = new Map(expected.map(offer => [offer.id, renderPage(offer.path)]))
  const visibleText = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')

  await test('both separate offers resolve through the real app with distinct public metadata and cross links', () => {
    for (const offer of expected) {
      const content = contractorOffers[offer.id]
      const meta = findRoute(offer.path)
      const html = rendered.get(offer.id)
      assert.equal(resolvePath(`${offer.path}/`), offer.path)
      assert.equal(contractorOfferForPath(offer.path).id, offer.id)
      assert.equal(routeMeta.filter(route => route.path === offer.path).length, 1)
      assert.equal(meta.title, content.title)
      assert.equal(meta.description, content.description)
      assert.equal(Boolean(meta.noindex), false)
      assert.ok(meta.priority > 0, 'public route is eligible for the sitemap')
      assert.ok(meta.title.includes(offer.price), 'search title advertises the same price')
      const graph = structuredDataForRoute(offer.path)['@graph']
      assert.ok(graph.some(node => node['@id'] === `https://wallaceshift.com${offer.path}#webpage`))
      assert.ok(graph.some(node => node['@type'] === 'Service' && node.name === content.name))
      assert.equal((html.match(/<h1\b/g) ?? []).length, 1, 'one main heading after real App routing')
      assert.equal((html.match(/<main\b/g) ?? []).length, 1, 'one main landmark')
      assert.equal((html.match(/<form\b/g) ?? []).length, 1, 'one inquiry form; demo is not a second intake gate')
      assert.ok(html.includes(`href="${expected.find(other => other.id !== offer.id).path}"`), 'visitors can compare the other offer')
    }
    assert.equal(contractorOfferForPath('/offers/unknown'), undefined)
    assert.equal(resolvePath('/offers/unknown'), '/404')
  })

  await test('pricing, open demonstrations, scope and questions precede inquiry qualification in server rendered HTML', () => {
    for (const offer of expected) {
      const html = rendered.get(offer.id)
      const firstForm = html.indexOf('<form')
      const demo = html.indexOf('id="demo"')
      const pricing = html.indexOf('id="pricing"')
      const questions = html.indexOf('id="questions"')
      const inquiry = html.indexOf('id="inquiry"')
      assert.ok(html.indexOf(offer.price) >= 0 && html.indexOf(offer.price) < demo, 'price is present in the opening before a demo or form')
      assert.ok(demo < pricing && pricing < questions && questions < inquiry && inquiry < firstForm, 'demo, full scope, FAQs, then inquiry')
      assert.ok(html.includes(contractorOffers[offer.id].terms), 'commercial limitations are readable before submission')
      assert.ok(html.indexOf('What is separate') < firstForm, 'excluded costs are visible before the form')
      const required = [...html.matchAll(/<(?:input|textarea|select)\b[^>]*\brequired=""[^>]*>/g)].map(match => /\bname="([^"]+)"/.exec(match[0])?.[1])
      assert.deepEqual(required.sort(), ['email', 'message', 'name'], 'qualification answers are never prerequisites for an inquiry')
      assert.match(html, /name="readiness"[^>]*checked=""[^>]*value="questions"/, 'information request is the default path')
      for (const value of ['planning', 'later', 'exploring', 'shared', 'researching']) assert.ok(html.includes(`value="${value}"`), `${value} remains available`)
      assert.match(html, /href="mailto:[^"]+"/, 'a direct email alternative remains available')
      assert.ok(visibleText(html).includes('It does not place an order or commit you to a purchase.'))
      assert.doesNotMatch(visibleText(html), /[-\u2010-\u2015]/u, 'offer copy contains no hyphens or dashes')
    }
  })

  await test('website previews have available video, poster and captions without a contact or playback gate', async () => {
    const html = rendered.get('website')
    const video = /<video\b[^>]*>[\s\S]*?<\/video>/.exec(html)?.[0]
    assert.ok(video)
    assert.match(video, /controls=""/)
    assert.match(video, /preload="none"/)
    assert.match(video, /<track kind="captions"[^>]*srcLang="en"/)
    assert.ok(html.indexOf(video) < html.indexOf('<form'))
    for (const preview of ['northvane', 'tambour', 'stillwater']) {
      for (const extension of ['mp4', 'jpg', 'vtt']) {
        const path = new URL(`../public/media/demo-previews/${preview}.${extension}`, import.meta.url)
        assert.ok((await stat(path)).size > 0, `${preview}.${extension} is available`)
      }
      const captions = await readFile(new URL(`../public/media/demo-previews/${preview}.vtt`, import.meta.url), 'utf8')
      assert.match(captions, /^WEBVTT/)
      assert.match(captions, /\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}/)
    }
    for (const trade of ['Roofing', 'Kitchens', 'Pools']) assert.ok(html.includes(`>${trade}</button>`))
    assert.ok(visibleText(html).includes('Fictional demo brands and illustrative project details.'))
    assert.ok(visibleText(html).includes('advanced features that are quoted separately.'))
  })

  await test('follow up demonstration is visibly illustrative and ready to try before any form', () => {
    const html = rendered.get('lead-follow-up')
    assert.ok(html.indexOf('Try a sample inquiry') < html.indexOf('<form'))
    assert.match(html, /<button type="button"[^>]*>Try a sample inquiry/)
    assert.ok(visibleText(html).includes('No personal details or messages are sent.'))
    for (const stage of ['Request captured', 'Confirmation', 'Follow up', 'Reply received']) assert.ok(visibleText(html).includes(stage))
    assert.match(html, /aria-live="polite" aria-atomic="true"/, 'workflow state can be announced accessibly')
    assert.ok(visibleText(html).includes('Software, hosting and message usage may cost extra.'))
  })

  await test('advertised page prices and URLs match delivered canonical context for information seekers', async () => {
    const keys = ['RESEND_API_KEY', 'CONTACT_TO_EMAIL', 'CONTACT_FROM_EMAIL']
    const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]))
    const blockedFetch = globalThis.fetch
    const delivered = []
    Object.assign(process.env, { RESEND_API_KEY: 'test-key', CONTACT_TO_EMAIL: 'test@example.test', CONTACT_FROM_EMAIL: 'site@example.test' })
    globalThis.fetch = async (url, init) => {
      assert.equal(url, 'https://api.resend.com/emails')
      delivered.push(JSON.parse(init.body))
      return new Response('{}', { status: 200 })
    }
    try {
      for (const offer of expected) {
        const response = await contact(new Request('https://example.test/api/contact', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'Example Visitor', email: 'visitor@example.test', message: 'I would like more information.', offer: offer.id, readiness: 'questions', timing: 'later', decisionRole: 'shared', package: 'Untrusted free package' }),
        }))
        assert.equal(response.status, 200, 'questions, later timing and shared decisions are accepted')
        assert.equal((await response.json()).ok, true)
        const email = delivered.at(-1)
        assert.equal(contractorOffers[offer.id].priceLabel, offer.priceLabel)
        assert.ok(email.text.includes(`Advertised price: ${contractorOffers[offer.id].priceLabel}`))
        assert.ok(email.text.includes(`Offer page: https://wallaceshift.com${contractorOffers[offer.id].path}`))
        assert.doesNotMatch(email.text, /Untrusted free package/)
        assert.ok(email.text.includes('Readiness: I need more information'))
      }
      assert.equal(delivered.length, 2)
    } finally {
      globalThis.fetch = blockedFetch
      for (const key of keys) {
        if (previous[key] === undefined) delete process.env[key]
        else process.env[key] = previous[key]
      }
    }
  })
} finally {
  globalThis.fetch = originalFetch
  await server.close()
}
