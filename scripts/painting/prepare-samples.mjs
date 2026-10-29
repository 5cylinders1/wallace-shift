// Prepared looks for the color studio's sample house, made through the
// studio's own endpoint so they are exactly what a visitor would get.
//
// Needs the dev server running with OPENAI_API_KEY in .env.local (launch
// config `complete-painting-demo-preview`, port 5183):
//
//   node scripts/painting/prepare-samples.mjs [http://localhost:5183]
//
// Each paid call is logged in output/painting/ledger.json with the image
// script's calls, and none starts that could take the total past the
// approved budget. Existing looks are skipped; delete one to remake it.

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const root = new URL('../../', import.meta.url).pathname
const origin = process.argv[2] ?? 'http://localhost:5183'
const ledgerPath = join(root, 'output/painting/ledger.json')
const studio = join(root, 'public/demos/painting/studio')
const BUDGET = 5
const WORST_CASE = 0.25

// Keep in step with SAMPLE_LOOKS in src/demos/painting/visualizer/looks.ts.
const looks = [
  { body: 'navy', trim: 'bright-white', door: 'red' },
  { body: 'sage', trim: 'warm-white', door: 'wood' },
  { body: 'cream', trim: 'black', door: 'wood' },
  { body: 'charcoal', trim: 'match', door: 'ochre' },
]

const photo = `data:image/jpeg;base64,${(await readFile(join(studio, 'sample.jpg'))).toString('base64')}`
const status = await (await fetch(`${origin}/api/paint-render`)).json()
if (!status.enabled) throw new Error(`The studio is not live at ${origin}: ${status.message}`)

for (const look of looks) {
  const name = `${look.body}-${look.trim}-${look.door}`
  const target = join(studio, `${name}.webp`)
  if (existsSync(target)) { console.log(`${name}: exists, skipped`); continue }
  const ledger = existsSync(ledgerPath) ? JSON.parse(await readFile(ledgerPath, 'utf8')) : []
  const spent = ledger.reduce((sum, entry) => sum + entry.cost, 0)
  if (spent + WORST_CASE > BUDGET) throw new Error(`Budget guard: $${spent.toFixed(2)} spent of $${BUDGET}; not calling.`)
  const started = Date.now()
  const response = await fetch(`${origin}/api/paint-render`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify({ ...look, photo, quality: 'medium', consent: true }),
  })
  const body = await response.json()
  if (!body.ok) throw new Error(`${name}: ${body.error} ${body.message}`)
  const work = await mkdtemp(join(tmpdir(), 'paint-look-'))
  try {
    const jpeg = join(work, 'look.jpg')
    await writeFile(jpeg, Buffer.from(body.image.split(',')[1], 'base64'))
    execFileSync('cwebp', ['-quiet', '-q', '82', '-m', '6', '-sharp_yuv', '-metadata', 'none', jpeg, '-o', target])
  } finally {
    await rm(work, { recursive: true, force: true })
  }
  const cost = body.costUsd ?? WORST_CASE
  ledger.push({ step: `studio-${name}`, version: 1, sources: ['studio/sample.jpg'], endpoint: '/api/paint-render', model: 'gpt-image-2', size: `${body.width}x${body.height}`, quality: 'medium', cost, costEstimated: body.costUsd == null, seconds: Math.round((Date.now() - started) / 100) / 10 })
  await writeFile(ledgerPath, JSON.stringify(ledger, null, 1))
  console.log(`${name}: $${cost.toFixed(3)} (${((Date.now() - started) / 1000).toFixed(1)}s); total $${(spent + cost).toFixed(2)} of $${BUDGET}`)
}
