#!/usr/bin/env node
/**
 * Prints a browser-console line that signs you in as the demo admin on the
 * local preview server, so gated demos (/datum, /stratum, …) open locally.
 *
 *   node scripts/demo-preview-cookie.mjs [origin]
 *
 * Reads DEMO_ACCESS_SECRET and DEMO_ADMIN_EMAIL from the gitignored
 * .demo-preview.local, the same file the `wallace-shift-demo-preview` launch
 * config loads. The origin defaults to http://localhost:5176 and must be the
 * exact local origin you browse (localhost and 127.0.0.1 are different).
 * Local origins only: production uses its own secret and the real sign-in.
 */
import { readFileSync } from 'node:fs'
import { createHmac, randomBytes } from 'node:crypto'

const origin = new URL(process.argv[2] ?? 'http://localhost:5176').origin
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
  console.error('Local origins only, for example http://localhost:5176')
  process.exit(1)
}

const env = Object.fromEntries(readFileSync(new URL('../.demo-preview.local', import.meta.url), 'utf8')
  .split('\n')
  .filter(line => line.includes('=') && !line.trim().startsWith('#'))
  .map(line => [line.slice(0, line.indexOf('=')).replace(/^export\s+/, '').trim(), line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '')]))
const secret = env.DEMO_ACCESS_SECRET ?? ''
const email = (env.DEMO_ADMIN_EMAIL ?? '').trim().toLowerCase()
if (secret.length < 32 || !email) {
  console.error('.demo-preview.local needs DEMO_ACCESS_SECRET (32+ characters) and DEMO_ADMIN_EMAIL')
  process.exit(1)
}

// Same shape and signature as createDemoAdminGrant in api/_lib/demo-access.ts.
const now = Math.floor(Date.now() / 1000)
const grant = {
  v: 2, kind: 'admin-session', origin, demo: 'roofers',
  recipientHash: createHmac('sha256', secret).update(`demo-recipient:${email}`).digest('hex'),
  iat: now, exp: now + 29 * 86_400, nonce: randomBytes(16).toString('hex'),
}
const data = Buffer.from(JSON.stringify(grant)).toString('base64url')
const token = `${data}.${createHmac('sha256', secret).update(data).digest('base64url')}`

console.log(`Paste into the browser console on ${origin}, then reload:\n`)
console.log(`document.cookie = 'wallace_demo_admin=${token}; path=/; max-age=2500000'`)
