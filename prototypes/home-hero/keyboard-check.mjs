// Keyboard path and accessibility checks for the homepage hero.
// Usage: AXE_PATH=/path/to/axe.min.js node prototypes/home-hero/keyboard-check.mjs   (dev server on HERO_PREVIEW_URL)
import { mkdir } from 'node:fs/promises'
import { playwright } from '../../videos/contractor-previews/runtime.mjs'

const base = process.env.HERO_PREVIEW_URL ?? 'http://localhost:5173'
const out = new URL('./review/after/', import.meta.url).pathname
await mkdir(out, { recursive: true })
const { chromium } = await playwright()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = []
const describe = page => page.evaluate(() => { const el = document.activeElement; return `${el?.tagName.toLowerCase()}|${el?.id}|${(el?.getAttribute('aria-label') ?? el?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 70)}` })
async function tabTo(page, match, limit = 60) {
  for (let index = 0; index < limit; index++) { await page.keyboard.press('Tab'); if (match.test(await describe(page))) return }
  throw new Error(`Tab never reached ${match}`)
}
const expect = (value, message) => { if (!value) throw new Error(message) }
async function check(name, viewport, steps) {
  const phone = viewport.width < 760
  const page = await browser.newPage({ viewport, isMobile: phone, hasTouch: phone })
  try {
    await page.goto(`${base}/`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(700)
    await page.evaluate(() => document.querySelectorAll('iframe[src*="reply365"]').forEach(frame => (frame.closest('body > *') ?? frame).remove()))
    await steps(page)
    results.push(['pass', name, ''])
  } catch (error) { results.push(['FAIL', name, error.message.split('\n')[0]]) }
  await page.close()
}
const desktop = { width: 1440, height: 900 }, iphone = { width: 390, height: 664 }

await check('One action in the hero, named "Discuss your project", and no Google Meet link', desktop, async page => {
  const buttons = await page.locator('.r-hero button, .r-hero a').evaluateAll(nodes => nodes.filter(node => !node.closest('.r-website-demo')).map(node => node.textContent.replace(/\s+/g, ' ').trim()))
  expect(buttons.filter(text => /Discuss your project/.test(text)).length === 1, `expected one Discuss button, found ${JSON.stringify(buttons)}`)
  expect(!buttons.some(text => /Google Meet|Request a call/.test(text)), `old actions still in the hero: ${JSON.stringify(buttons)}`)
  const name = await page.getByRole('button', { name: 'Discuss your project' }).getAttribute('aria-haspopup')
  expect(name === 'dialog', 'button does not announce that it opens a dialog')
})
await check('Keyboard: Discuss your project opens the form titled to match, Meet is inside, Escape returns focus', desktop, async page => {
  await tabTo(page, /Discuss your project/)
  await page.keyboard.press('Enter'); await page.waitForTimeout(500)
  const heading = (await page.locator('#call-request-heading').innerText()).replace(/\s+/g, ' ').trim()
  expect(heading === 'Discuss your project.', `form heading is "${heading}"`)
  expect(/call-request-heading/.test(await describe(page)), `focus did not move to the form heading: ${await describe(page)}`)
  expect(await page.locator('.call-request-dialog .contact-choice--callback[aria-pressed="true"]').count() === 1, 'callback option is not the selected default')
  await page.screenshot({ path: `${out}form-desktop.jpg`, type: 'jpeg', quality: 80 })
  await tabTo(page, /Book a Google Meet/, 12)
  await page.keyboard.press('Enter'); await page.waitForTimeout(300)
  expect(await page.locator('.call-request-dialog .contact-choice--meeting[aria-pressed="true"]').count() === 1, 'Meet option did not switch the form')
  expect((await page.locator('#call-request-heading').innerText()).includes('Discuss'), 'heading changed when switching to Meet')
  await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  expect(/Discuss your project/.test(await describe(page)), `focus did not return to the button: ${await describe(page)}`)
})
await check('Keyboard: a price row brings its card forward and lands focus on it, twice in a row', desktop, async page => {
  for (const [kind, label] of [['lead', /Lead page/], ['website', /Business website/], ['website', /Business website/]]) {
    await page.evaluate(() => window.scrollTo(0, 0)); await page.locator('.r-hero h1').click()
    await tabTo(page, label)
    await page.keyboard.press('Enter'); await page.waitForTimeout(900)
    const active = await describe(page)
    expect(active.includes(`${kind}-package-heading`), `focus is on ${active}, not the ${kind} card heading`)
    expect(await page.locator(`#${kind}-package`).evaluate(node => node.classList.contains('is-selected')), `${kind} card did not come to the front`)
    const top = await page.locator(`#${kind}-package-heading`).evaluate(node => node.getBoundingClientRect().top)
    expect(top > 0 && top < desktop.height, `${kind} card heading is off screen at ${Math.round(top)}px`)
  }
})
await check('Phone: headline, line, demo, packages, button stack in that order and the button is a short scroll away', iphone, async page => {
  const boxes = await page.evaluate(() => Object.fromEntries(['.r-hero h1', '.r-hero-copy > p', '.r-website-demo', '.r-hero-package', '.r-hero-cta'].map(selector => { const nodes = [...document.querySelectorAll(selector)]; const last = nodes.at(-1).getBoundingClientRect(); return [selector, { top: Math.round(nodes[0].getBoundingClientRect().top), bottom: Math.round(last.bottom) }] })))
  const order = Object.values(boxes).map(box => box.top)
  expect(order.every((top, index) => index === 0 || top > order[index - 1]), `order is wrong: ${JSON.stringify(boxes)}`)
  // The demo now sits above the prices, so the button lands just below the first screen; keep it within one more screen.
  expect(boxes['.r-hero-cta'].bottom <= 664 * 1.6, `button ends at ${boxes['.r-hero-cta'].bottom}px, more than half a screen below the first`)
  console.log(`  iPhone 390×664: demo ${boxes['.r-website-demo'].top}-${boxes['.r-website-demo'].bottom}px, packages ${boxes['.r-hero-package'].top}-${boxes['.r-hero-package'].bottom}px, button ${boxes['.r-hero-cta'].top}-${boxes['.r-hero-cta'].bottom}px`)
  await page.locator('.r-hero-cta').tap(); await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}form-iphone.jpg`, type: 'jpeg', quality: 80 })
  expect(await page.locator('dialog.call-request-dialog[open]').count() === 1, 'tap did not open the form')
})
// The closing question and the packages' "not sure?" link open the same form, titled to match, with their own analytics label.
const listen = page => page.evaluate(() => { window.__events = []; window.addEventListener('ws:analytics', event => window.__events.push(event.detail)) })
const events = page => page.evaluate(() => window.__events)
await check('Keyboard: Ask Matthew a question opens the form titled to match, with all three options, and Escape returns focus', desktop, async page => {
  await listen(page)
  const ask = page.locator('#questions').getByRole('button', { name: 'Ask Matthew a question' })
  expect(await ask.getAttribute('aria-haspopup') === 'dialog', 'question button does not announce that it opens a dialog')
  await ask.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(500)
  const heading = (await page.locator('#call-request-heading').innerText()).replace(/\s+/g, ' ').trim()
  expect(heading === 'Ask Matthew a question.', `form heading is "${heading}"`)
  const options = await page.locator('dialog[open] .contact-choice .contact-choice__title').allInnerTexts()
  expect(options.join('|') === 'Request a call|Book a Google Meet|Call directly', `options are ${options.join(', ')}`)
  await page.screenshot({ path: `${out}form-question-desktop.jpg`, type: 'jpeg', quality: 80 })
  await page.locator('dialog[open] .contact-choice--meeting').click(); await page.waitForTimeout(300)
  const sent = await events(page)
  expect(JSON.stringify(sent) === JSON.stringify([{ name: 'contact_open', value: 'home_questions' }, { name: 'contact_choice', value: 'meeting', surface: 'home_questions' }]), `analytics sent ${JSON.stringify(sent)}`)
  await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  expect(/Ask Matthew a question/.test(await describe(page)), `focus did not return to the button: ${await describe(page)}`)
})
await check('Phone: the packages\' "Need both, or not sure?" link opens the same form', iphone, async page => {
  await listen(page)
  await page.locator('.p-starting-help button').tap(); await page.waitForTimeout(500)
  expect(await page.locator('dialog.call-request-dialog[open]').count() === 1, 'tap did not open the form')
  expect((await page.locator('#call-request-heading').innerText()).replace(/\s+/g, ' ').trim() === 'Ask Matthew a question.', 'form heading does not match the link')
  expect(JSON.stringify(await events(page)) === JSON.stringify([{ name: 'contact_open', value: 'home_packages' }]), `analytics sent ${JSON.stringify(await events(page))}`)
})
// The add-on buttons and the comparison's "Talk through the fit" open the same form, titled to match, and name their subject in the request.
// The contact endpoint is intercepted, so nothing is sent.
for (const [section, button, heading, topic, about, surface] of [
  ['#upgrades', 'Discuss the agents', 'Discuss the agents.', 'Chatbot + phone agent', 'Chatbot + phone agent', 'home_addon_agents'],
  ['#upgrades', 'Discuss follow up', 'Discuss follow up.', 'Managed follow up', 'Managed follow up', 'home_addon_follow_up'],
  ['#upgrades', 'Discuss your workspace', 'Discuss your workspace.', 'Business workspace + AI', 'Business workspace + AI', 'home_addon_workspace'],
  ['#compare', 'Talk through the fit', 'Talk through the fit.', 'Both packages', 'scoping both packages together', 'home_comparison'],
]) {
  await check(`"${button}" opens the form titled to match and names its subject in the request`, desktop, async page => {
    const sent = []
    await page.route('**/api/contact', route => { sent.push(route.request().postDataJSON()); return route.fulfill({ json: { ok: true } }) })
    await listen(page)
    const open = page.locator(section).getByRole('button', { name: button })
    expect(await open.getAttribute('aria-haspopup') === 'dialog', `${button} does not announce that it opens a dialog`)
    await open.click(); await page.waitForTimeout(500)
    const title = (await page.locator('#call-request-heading').innerText()).replace(/\s+/g, ' ').trim()
    expect(title === heading, `form heading is "${title}"`)
    await page.getByLabel('Your name').fill('Sample Owner')
    await page.getByLabel('Phone number').fill('913 555 0100')
    await page.getByRole('button', { name: /Send call request/ }).click(); await page.waitForTimeout(600)
    expect(sent.length === 1 && sent[0].service === `Call request: ${topic}` && sent[0].message.startsWith(`Please call me about ${about}.`), `request sent ${JSON.stringify(sent.map(body => [body.service, body.message]))}`)
    const tracked = (await events(page)).map(event => `${event.name}:${event.value}`)
    expect(JSON.stringify(tracked) === JSON.stringify([`contact_open:${surface}`, `enquiry_submitted:${surface}`]), `analytics sent ${tracked.join(', ')}`)
  })
}
for (const [label, viewport] of [['desktop', desktop], ['tablet', { width: 1024, height: 768 }], ['iPhone', iphone]]) {
  await check(`Showcase and question read as two sections, with the showcase copy clear of the WS, ${label}`, viewport, async page => {
    const layout = await page.evaluate(() => {
      const showcase = document.querySelector('.r-showcase'), question = document.getElementById('questions')
      const copy = [...document.querySelectorAll('.r-showcase-copy > *')].map(node => node.getBoundingClientRect())
      const media = document.querySelector('.r-showcase-media').getBoundingClientRect()
      return { showcase: getComputedStyle(showcase).backgroundColor, question: getComputedStyle(question).backgroundColor, copyRight: Math.max(...copy.map(box => box.right)), copyTop: Math.min(...copy.map(box => box.top)), media: { left: media.left, width: media.width, bottom: media.bottom } }
    })
    expect(layout.showcase !== layout.question, `both sections are ${layout.showcase}`)
    // In the poster the WS starts 37.4% across. Beside the picture, the copy must stop before it; stacked, it must sit below it.
    const besideTheWs = layout.copyTop < layout.media.bottom
    if (besideTheWs) expect(layout.copyRight <= layout.media.left + layout.media.width * .374 - 16, `showcase copy ends at ${Math.round(layout.copyRight)}px, into the WS`)
  })
}
if (process.env.AXE_PATH) {
  for (const [label, viewport, open] of [['hero desktop', desktop, false], ['hero iPhone', iphone, false], ['form desktop', desktop, true], ['form iPhone', iphone, true], ['closing desktop', desktop, 'closing'], ['closing iPhone', iphone, 'closing']]) {
    await check(`axe: no serious or critical issues, ${label}`, viewport, async page => {
      if (open === true) { await page.getByRole('button', { name: 'Discuss your project' }).click(); await page.waitForTimeout(500) }
      if (open === 'closing') { await page.locator('#questions').scrollIntoViewIfNeeded(); await page.waitForTimeout(400) }
      await page.addScriptTag({ path: process.env.AXE_PATH })
      const issues = await page.evaluate(async open => {
        const context = open === 'closing' ? { include: [['.r-showcase'], ['#questions']] } : open ? document.querySelector('dialog.call-request-dialog') : document.querySelector('.r-hero')
        const report = await window.axe.run(context, { resultTypes: ['violations'] })
        return report.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${v.id} (${v.nodes.length})`)
      }, open)
      expect(!issues.length, issues.join(', '))
    })
  }
}
await browser.close()
for (const [outcome, name, detail] of results) console.log(`${outcome.padEnd(4)} ${name}${detail ? ` — ${detail}` : ''}`)
process.exitCode = results.some(([outcome]) => outcome !== 'pass') ? 1 : 0
