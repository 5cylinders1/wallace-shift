// Browser walkthrough of the package cards and checkout, with the purchase API mocked so nothing is sent or saved.
// Usage: AXE_PATH=/path/to/axe.min.js node prototypes/home-hero/checkout-check.mjs   (dev server on HERO_PREVIEW_URL)
import { playwright } from '../../videos/contractor-previews/runtime.mjs'

const base = process.env.HERO_PREVIEW_URL ?? 'http://localhost:5173'
const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = []
const expect = (value, message) => { if (!value) throw new Error(message) }
async function check(name, viewport, kind, steps) {
  const phone = viewport.width < 760
  const page = await browser.newPage({ viewport, isMobile: phone, hasTouch: phone })
  const posts = []
  let sendResult = { ok: true }
  await page.route('**/api/package-checkout', async route => {
    if (route.request().method() !== 'POST') return route.fulfill({ json: { ok: true, ready: true } })
    const body = route.request().postDataJSON(); posts.push(body)
    if (body.action === 'send-code') return route.fulfill({ status: sendResult.ok ? 200 : 429, json: sendResult })
    return route.fulfill({ json: body.code === '123456' ? { ok: true, url: '/client-portal?engagement=checkout-test' } : { ok: false, error: 'code_invalid' } })
  })
  await page.route('**/api/client-portal**', route => route.fulfill({ json: { ok: true, authenticated: false } }))
  try {
    await page.goto(`${base}/#${kind}-package`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.evaluate(() => document.querySelectorAll('iframe[src*="reply365"]').forEach(frame => (frame.closest('body > *') ?? frame).remove()))
    await steps(page, posts, value => { sendResult = value })
    results.push(['pass', name, ''])
  } catch (error) { results.push(['FAIL', name, error.message.split('\n')[0]]) }
  await page.close()
}
const desktop = { width: 1440, height: 900 }, iphone = { width: 390, height: 664 }
const fill = async page => {
  await page.getByLabel('Your full legal name').fill('Sample Buyer')
  await page.getByLabel('Legal business name').fill('Sample Roofing LLC')
  await page.getByLabel('Email address').fill('buyer@example.test')
  await page.getByLabel('I am authorized to buy this for the business.').check()
}

for (const [kind, title] of [['website', 'Business website & care.'], ['lead', 'Lead page & automatic follow up.']]) {
  await check(`${kind}: keyboard Buy now opens the matching checkout, Escape returns focus`, desktop, kind, async page => {
    const buy = page.locator(`#${kind}-package .pc-buy`)
    await buy.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(400)
    const heading = (await page.locator('#package-checkout-heading').innerText()).replace(/\s+/g, ' ').trim()
    expect(heading === title, `heading is "${heading}"`)
    expect(await page.evaluate(() => document.activeElement?.id === 'package-checkout-heading'), 'focus did not move to the checkout heading')
    await page.keyboard.press('Escape'); await page.waitForTimeout(400)
    expect(await page.locator('dialog[open]').count() === 0, 'Escape did not close the checkout')
    expect(await page.evaluate(() => document.activeElement?.classList.contains('pc-buy')), 'focus did not return to Buy now')
  })
}
await check('website: details, code, then straight to the client portal with only the expected fields sent', desktop, 'website', async (page, posts) => {
  await page.locator('#website-package .pc-buy').click(); await page.waitForTimeout(400)
  await fill(page)
  await page.getByRole('button', { name: 'Email me a code' }).click(); await page.waitForTimeout(300)
  const sent = posts[0]
  expect(sent.action === 'send-code' && sent.packageId === 'website' && /^[0-9a-f-]{36}$/.test(sent.submissionId) && sent.authorityConfirmed === true && sent.company === '', `unexpected send body ${JSON.stringify(sent)}`)
  expect(Object.keys(sent).sort().join() === 'action,authorityConfirmed,businessName,company,email,name,packageId,submissionId,termsVersion', `extra fields: ${Object.keys(sent)}`)
  expect(await page.evaluate(() => document.activeElement?.id === 'package-checkout-code'), 'focus did not move to the code field')
  await page.getByLabel(/Six digit code/).fill('000000')
  await page.getByRole('button', { name: 'Continue to your agreement' }).click(); await page.waitForTimeout(300)
  expect((await page.locator('.call-request-error').innerText()).includes('not right'), 'wrong code did not explain itself')
  await page.getByLabel(/Six digit code/).fill('123456')
  await Promise.all([page.waitForURL('**/client-portal?engagement=checkout-test', { timeout: 5000 }), page.getByRole('button', { name: 'Continue to your agreement' }).click()])
})
await check('lead: a refused code request explains itself and keeps the details', iphone, 'lead', async (page, posts, respond) => {
  respond({ ok: false, error: 'rate_limited' })
  await page.locator('#lead-package .pc-buy').tap(); await page.waitForTimeout(400)
  await fill(page)
  await page.getByRole('button', { name: 'Email me a code' }).tap(); await page.waitForTimeout(300)
  expect(posts[0]?.packageId === 'lead', 'lead package not sent')
  expect((await page.locator('.call-request-error').innerText()).includes('wait a minute'), 'rate limit message missing')
  expect(await page.getByLabel('Email address').inputValue() === 'buyer@example.test', 'details were lost')
})
if (process.env.AXE_PATH) {
  for (const [label, viewport, open] of [['card desktop', desktop, false], ['card iPhone', iphone, false], ['checkout desktop', desktop, true], ['checkout iPhone', iphone, true]]) {
    await check(`axe: no serious or critical issues, ${label}`, viewport, 'website', async page => {
      if (open) { await page.locator('#website-package .pc-buy').click(); await page.waitForTimeout(400) }
      await page.addScriptTag({ path: process.env.AXE_PATH })
      const issues = await page.evaluate(async open => {
        const report = await window.axe.run(open ? document.querySelector('dialog[open]') : document.querySelector('#website-package'), { resultTypes: ['violations'] })
        return report.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${v.id} (${v.nodes.length})`)
      }, open)
      expect(!issues.length, issues.join(', '))
    })
  }
}
await browser.close()
for (const [outcome, name, detail] of results) console.log(`${outcome.padEnd(4)} ${name}${detail ? ` — ${detail}` : ''}`)
process.exitCode = results.some(([outcome]) => outcome !== 'pass') ? 1 : 0
