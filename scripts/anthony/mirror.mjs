// Copies the anthonyphc.com home page into public/demo/anthony/ so it can be
// served at https://wallaceshift.com/demo/anthony as a prospect demo.
//
//   node scripts/anthony/mirror.mjs            fetch, rewrite and capture the map
//   node scripts/anthony/mirror.mjs --no-map   keep the existing map capture
//
// What changes from the live page, and why (details in docs/demos/anthony.md):
// - Styles, scripts, fonts and images are copied under /demo/anthony/ with the
//   WordPress folder layout kept, so relative CSS urls still resolve.
// - Every other page link points back to anthonyphc.com; the logo stays here.
// - Trackers and widgets tied to Anthony's own accounts are removed: Google Tag
//   Manager, CallRail number swapping, UserWay, the ServiceTitan scheduler,
//   reCAPTCHA and the Google Maps API key. The map becomes a static capture.
// - The page is noindex, and its SEO and structured data are dropped so search
//   engines never treat this copy as the business.
// Re-running overwrites index.html. Put lasting additions (such as the chat
// widget) in BODY_END below, not straight into the generated file.
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { playwright } from '../../videos/contractor-previews/runtime.mjs'

const ORIGIN = 'https://anthonyphc.com'
const BASE = '/demo/anthony'
const OUT = new URL('../../public/demo/anthony/', import.meta.url).pathname
const MAP_FILE = 'media/service-area-map.webp'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
const captureMap = !process.argv.includes('--no-map')

/** Injected before </body>. The chat widget goes here. */
const BODY_END = `
<!-- Wallace Shift demo additions -->
`

const removedScripts = [
  { id: 'google-maps-api-js' },
  { id: 'tp-map-wplugin-js-extra' },
  { id: 'tp-map-wplugin-js' },
  { id: 'ssp-on-demand-js-before' },
  { id: 'ssp-on-demand-js' },
  { id: 'im-delay-gtm' },
  { id: 'gforms_recaptcha_recaptcha-js-extra' },
  { id: 'exclude-user-interaction' },
  { src: 'callrail.com' },
  { src: 'userway.org' },
  { src: 'googletagmanager.com' },
  { src: 'amazon-adsystem.com' },
  { type: 'speculationrules' },
  { type: 'application/ld+json' },
  // Calls AOS.init() before the deferred aos.js exists, so on the live site it
  // throws on its first line and does nothing. Dropping it keeps that result
  // without the console error.
  { id: 'ct-footer-js' },
]

const headTagsToDrop = [
  /<meta name="robots"[^>]*>\s*/g,
  /<link rel="canonical"[^>]*>\s*/g,
  /<meta (?:property|name)="(?:og|article|twitter):[^"]*"[^>]*>\s*/g,
  /<link rel=["'](?:alternate|https:\/\/api\.w\.org\/|EditURI|shortlink|pingback|wlwmanifest)["'][^>]*>\s*/g,
  /<meta name="generator"[^>]*>\s*/g,
  /<!-- Google Tag Manager[\s\S]*?<!-- End Google Tag Manager[^>]*-->\s*/g,
  /<!-- Start Userway Script -->\s*<!-- End Userway Script -->\s*/g,
]

function decodeDataScript(src) {
  if (!src.startsWith('data:')) return src
  try { return decodeURIComponent(src.slice(src.indexOf(',') + 1)) } catch { return src }
}

function stripScripts(html) {
  const dropped = []
  const next = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>\s*/g, (tag, attrs) => {
    const id = attrs.match(/\bid=["']([^"']+)["']/)?.[1] ?? ''
    const type = attrs.match(/\btype=["']([^"']+)["']/)?.[1] ?? ''
    const src = decodeDataScript(attrs.match(/\b(?:data-)?src=["']([^"']+)["']/)?.[1] ?? '')
    const drop = removedScripts.some(rule => (rule.id && rule.id === id) || (rule.type && rule.type === type) || (rule.src && src.includes(rule.src)))
    if (drop) dropped.push(id || type || src.slice(0, 60))
    return drop ? '' : tag
  })
  return { html: next, dropped }
}

/** Replace the element that opens at `start` (a div) with `replacement`. */
function replaceDiv(html, start, replacement) {
  const tokens = /<div\b|<\/div>/g
  tokens.lastIndex = start
  let depth = 0
  for (let match; (match = tokens.exec(html));) {
    depth += match[0] === '</div>' ? -1 : 1
    if (depth === 0) return html.slice(0, start) + replacement + html.slice(match.index + match[0].length)
  }
  throw new Error('Unbalanced div while replacing the map')
}

// ---- asset queue -----------------------------------------------------------
const ASSET_PATH = /^\/wp-(?:content|includes)\//
const queue = new Map()

function assetUrl(raw, base) {
  const value = raw.replace(/\\\//g, '/').replace(/&#0?38;|&amp;/g, '&').replace(/\\+$/, '').trim()
  if (!value || value.startsWith('data:') || value.startsWith('#')) return null
  let url
  try { url = new URL(value, base) } catch { return null }
  if (url.hostname !== 'anthonyphc.com' || !ASSET_PATH.test(url.pathname)) return null
  if (!queue.has(url.pathname)) queue.set(url.pathname, url.href)
  return url
}

const ABSOLUTE_ASSET = /(?:https?:)?(?:\/\/|\\\/\\\/)anthonyphc\.com((?:\/|\\\/)wp-(?:content|includes)(?:\/|\\\/)[^"'\s()<>,]*)/g
const RELATIVE_ASSET = /(?<=["'(\s,=])\/wp-(?:content|includes)\/[^"'\s()<>,]*/g

function collect(text, base) {
  for (const match of text.matchAll(ABSOLUTE_ASSET)) assetUrl(match[1], base)
  for (const match of text.matchAll(RELATIVE_ASSET)) assetUrl(match[0], base)
}

/** Point every anthonyphc.com asset reference at the local copy. */
function rewriteAssets(text) {
  return text
    .replace(/(?:https?:)?\/\/anthonyphc\.com\/wp-(content|includes)\//g, `${BASE}/wp-$1/`)
    .replace(/(?:https?:)?\\\/\\\/anthonyphc\.com\\\/wp-(content|includes)\\\//g, `${BASE.replace(/\//g, '\\/')}\\/wp-$1\\/`)
    .replace(/(["'(\s,=])\/wp-(content|includes)\//g, `$1${BASE}/wp-$2/`)
}

function rewriteCss(text, cssUrl) {
  const withUrls = text.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (match, quote, ref) => {
    const url = assetUrl(ref, cssUrl)
    if (!url) return match
    // Relative refs keep working because the folder layout is preserved.
    return /^(?:https?:)?\/\//.test(ref) || ref.startsWith('/') ? `url(${quote}${BASE}${url.pathname}${url.search}${quote})` : match
  })
  return withUrls.replace(/@import\s+(['"])([^'"]+)\1/g, (match, quote, ref) => {
    const url = assetUrl(ref, cssUrl)
    return url && (/^(?:https?:)?\/\//.test(ref) || ref.startsWith('/')) ? `@import ${quote}${BASE}${url.pathname}${url.search}${quote}` : match
  })
}

async function fetchAsset(pathname, href) {
  const response = await fetch(href, { headers: { 'user-agent': UA, referer: `${ORIGIN}/` } })
  if (!response.ok) return { pathname, status: response.status }
  const target = join(OUT, decodeURIComponent(pathname))
  await mkdir(dirname(target), { recursive: true })
  if (/\.css$/i.test(pathname)) {
    await writeFile(target, rewriteCss(await response.text(), href))
  } else if (/\.js$/i.test(pathname)) {
    const text = await response.text()
    collect(text, href)
    await writeFile(target, rewriteAssets(text))
  } else {
    await writeFile(target, Buffer.from(await response.arrayBuffer()))
  }
  return { pathname, status: response.status }
}

async function drainQueue() {
  const done = new Set()
  const failed = []
  while (done.size < queue.size) {
    const batch = [...queue].filter(([pathname]) => !done.has(pathname)).slice(0, 8)
    for (const [pathname] of batch) done.add(pathname)
    for (const result of await Promise.all(batch.map(([pathname, href]) => fetchAsset(pathname, href)))) {
      if (result.status >= 400) failed.push(`${result.status} ${result.pathname}`)
    }
  }
  return { count: done.size, failed }
}

// ---- static map ------------------------------------------------------------
async function captureServiceMap() {
  const { chromium } = await playwright()
  const browser = await chromium.launch({ channel: 'chrome' })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, userAgent: UA })
    await page.goto(`${ORIGIN}/`, { waitUntil: 'load', timeout: 90000 })
    // The page only loads Google Maps after a real interaction.
    await page.mouse.move(8, 8)
    await page.waitForTimeout(1500)
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    for (let y = 0; y < height; y += 500) {
      await page.evaluate(top => window.scrollTo(0, top), y)
      await page.waitForTimeout(120)
    }
    const map = page.locator('#tp-map-n-0')
    await map.scrollIntoViewIfNeeded()
    await page.waitForFunction(() => document.querySelector('#tp-map-n-0 .gm-style'), null, { timeout: 45000 })
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(2500)
    // Controls cannot work in a picture; the attribution stays.
    await page.addStyleTag({ content: '#tp-map-n-0 .gm-bundled-control, #tp-map-n-0 .gm-fullscreen-control, #tp-map-n-0 .gm-svpc, #tp-map-n-0 .gm-style-cc button { display: none !important; }' })
    await page.waitForTimeout(300)
    const png = join(OUT, 'media', 'service-area-map.png')
    await mkdir(dirname(png), { recursive: true })
    await map.screenshot({ path: png })
    execFileSync('cwebp', ['-quiet', '-q', '86', png, '-o', join(OUT, MAP_FILE)])
    await rm(png)
  } finally {
    await browser.close()
  }
}

// ---- main ------------------------------------------------------------------
const response = await fetch(`${ORIGIN}/`, { headers: { 'user-agent': UA } })
if (!response.ok) throw new Error(`anthonyphc.com answered ${response.status}`)
const source = await response.text()

if (captureMap) {
  await rm(OUT, { recursive: true, force: true })
} else {
  await rm(join(OUT, 'wp-content'), { recursive: true, force: true })
  await rm(join(OUT, 'wp-includes'), { recursive: true, force: true })
}
await mkdir(OUT, { recursive: true })

let { html, dropped } = stripScripts(source)
for (const pattern of headTagsToDrop) html = html.replace(pattern, '')
html = html.replace(/<noscript><iframe[^>]*googletagmanager[\s\S]*?<\/noscript>\s*/g, '')

const mapStart = html.indexOf('<div class="tp-map"')
if (mapStart < 0) throw new Error('Service-area map not found; the page layout changed')
html = replaceDiv(html, mapStart, `<img class="demo-static-map" src="${BASE}/${MAP_FILE}" width="1161" height="789" alt="Map of the Kansas City area communities Anthony serves" loading="lazy" decoding="async" style="display:block;width:100%;height:auto;border-radius:10px">`)

collect(html, `${ORIGIN}/`)
html = rewriteAssets(html)

// Page links go to the live site; the home page stays in the demo.
html = html
  .replace(/\b(href|action)=(["'])\/(?!\/|demo\/anthony\/)/g, `$1=$2${ORIGIN}/`)
  // The site navigation renders its menu from JSON with escaped slashes.
  .replace(/(['"]url['"]\s*:\s*['"])\\\/(?!\\\/|demo\\\/anthony)/g, `$1${ORIGIN.replace(/\//g, '\\/')}\\/`)
  .replace(/\bhref=(["'])https:\/\/anthonyphc\.com\/?\1/g, `href=$1${BASE}$1`)

const stamp = new Date().toISOString().slice(0, 10)
html = html
  .replace(/<html\b/, `<!-- Wallace Shift demo copy of ${ORIGIN}/ made ${stamp} by scripts/anthony/mirror.mjs. Not the official site. -->\n<html`)
  .replace(/<title>/, '<meta name="robots" content="noindex, nofollow">\n<title>')
  .replace(/<\/body>/, `${BODY_END}</body>`)

// Class names such as `callrail_tracker` are harmless; hosts and keys are not.
const leftover = html.match(/googletagmanager\.com|callrail\.com|userway\.org|SchedulerConfig|AIzaSy[\w-]+|maps\.googleapis\.com/i)
if (leftover) throw new Error(`A removed third-party reference is still in the page: ${leftover[0]}`)

await writeFile(join(OUT, 'index.html'), html)
const assets = await drainQueue()
if (captureMap) await captureServiceMap()

console.log(`index.html written; ${assets.count} assets copied; removed scripts: ${dropped.join(', ')}`)
if (assets.failed.length) console.log(`Not available upstream (left as-is):\n  ${assets.failed.join('\n  ')}`)
