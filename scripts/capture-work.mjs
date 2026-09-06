/**
 * Capture real screenshots of built work into public/work/.
 *
 * Run manually, not at build time — it is slow (~20-70s per site), it
 * spends PageSpeed quota, and the output is committed as static files so
 * a deploy never depends on a third party being up.
 *
 *   PAGESPEED_API_KEY=... node scripts/capture-work.mjs https://example.com
 *
 * Uses the same PageSpeed API the live audit uses, so nothing new is
 * introduced and Google does the fetching (see api/audit.ts for why we
 * never fetch a URL ourselves). `strategy=desktop` because the mobile
 * screenshot comes back 250x498 — fine as a thumbnail, too small for
 * anything else.
 *
 * ONLY capture sites that are cleared for public display: launched, and
 * either ours or with the owner's say-so. See the gating rule on
 * `workSamples` in src/content/approachPage.ts. This script does not know
 * what is cleared and will happily capture anything you point it at.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const PSI = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
const OUT = 'public/work'

const targets = process.argv.slice(2)
if (targets.length === 0) {
  console.error('Usage: PAGESPEED_API_KEY=... node scripts/capture-work.mjs <url> [url...]')
  process.exit(1)
}

const key = process.env.PAGESPEED_API_KEY
if (!key) {
  console.error('PAGESPEED_API_KEY is required — the keyless quota is shared and permanently exhausted.')
  process.exit(1)
}

await mkdir(OUT, { recursive: true })

for (const target of targets) {
  const url = /^https?:\/\//i.test(target) ? target : `https://${target}`
  const slug = new URL(url).hostname.replace(/^www\./, '').replace(/[^a-z0-9]+/gi, '-')
  const params = new URLSearchParams({
    url,
    strategy: 'desktop',
    category: 'performance',
    key,
  })

  process.stdout.write(`${slug.padEnd(30)} `)
  const started = Date.now()

  let res
  try {
    res = await fetch(`${PSI}?${params}`, { headers: { accept: 'application/json' } })
  } catch (error) {
    console.log(`FAILED (${error.message})`)
    continue
  }

  if (!res.ok) {
    console.log(`FAILED (HTTP ${res.status}${res.status === 429 ? ' — quota' : ''})`)
    continue
  }

  const data = await res.json()
  const shot = data?.lighthouseResult?.audits?.['final-screenshot']?.details?.data
  if (typeof shot !== 'string' || !shot.startsWith('data:image')) {
    console.log('FAILED (no screenshot in response)')
    continue
  }

  const base64 = shot.slice(shot.indexOf(',') + 1)
  const bytes = Buffer.from(base64, 'base64')
  const file = join(OUT, `${slug}.jpg`)
  await writeFile(file, bytes)

  const secs = ((Date.now() - started) / 1000).toFixed(1)
  console.log(`${String(bytes.length).padStart(7)} bytes  ${secs}s  -> ${file}`)
}

console.log('\nAdd each captured file to `workSamples` in src/content/approachPage.ts.')
console.log('Entries whose image is missing are skipped at render, so nothing breaks if you stop here.')
