import { spawn } from 'node:child_process'
import { chmod, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'

// Local sandbox only. Never put API credentials in command arguments or output.
const root = fileURLToPath(new URL('../', import.meta.url))
const envPath = new URL('../.env.local', import.meta.url)
const env = loadEnv('development', root, '')
if (!env.STRIPE_SECRET_KEY?.startsWith('sk_test_') || !env.STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_')) {
  console.error('Add matching Stripe sandbox keys to .env.local first. Live keys are not accepted.')
  process.exit(1)
}
try {
  const response = await fetch('https://api.stripe.com/v1/balance', {
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }, signal: AbortSignal.timeout(15000),
  })
  if (!response.ok || (await response.json()).livemode !== false) throw new Error('validation failed')
} catch {
  console.error('Could not verify sandbox API access. Check the test secret key and network connection.')
  process.exit(1)
}
console.log('Stripe sandbox API access verified. Starting local webhook forwarding.')
const events = [
  'payment_intent.succeeded', 'payment_intent.processing', 'payment_intent.payment_failed',
  'payment_intent.canceled', 'payment_intent.requires_action', 'charge.refunded',
  'charge.dispute.created', 'charge.dispute.updated', 'charge.dispute.closed',
  'charge.dispute.funds_withdrawn', 'charge.dispute.funds_reinstated',
]
const child = spawn('stripe', ['listen', '--skip-update', '--color', 'off', '--events', events.join(','),
  '--forward-to', 'http://127.0.0.1:5182/api/client-portal?action=webhook'], {
  cwd: root, env: { ...process.env, STRIPE_API_KEY: env.STRIPE_SECRET_KEY }, stdio: ['ignore', 'pipe', 'pipe'],
})
let saving = false
async function lineReceived(line) {
  const secret = line.match(/whsec_[A-Za-z0-9]+/)?.[0]
  if (secret && !saving) {
    saving = true
    try {
      // Read at write time so other local environment edits are retained.
      const original = await readFile(envPath, 'utf8')
      const definition = `STRIPE_WEBHOOK_SECRET=${secret}`
      const pattern = /^(?:export\s+)?STRIPE_WEBHOOK_SECRET\s*=.*$/gm
      const next = pattern.test(original) ? original.replace(pattern, definition) : `${original}${original.endsWith('\n') ? '' : '\n'}${definition}\n`
      await writeFile(envPath, next, { mode: 0o600 })
      await chmod(envPath, 0o600)
      console.log('Webhook signing secret saved to ignored .env.local (value hidden).')
      console.log('Listener ready at port 5182. Start or restart Vite to load the signing secret. Keep this process running while testing.')
    } catch {
      console.error('Unable to save the local webhook secret. Listener stopped.')
      process.exitCode = 1; child.kill('SIGTERM')
    }
    return
  }
  // Only print delivery summaries, never raw CLI output or event payloads.
  const delivered = line.match(/<--\s+\[(\d{3})\]/)
  const incoming = line.match(/-->\s+([a-z_]+(?:\.[a-z_]+)+)/)
  if (delivered) console.log(`Local webhook response: HTTP ${delivered[1]}`)
  else if (incoming) console.log(`Received sandbox event: ${incoming[1]}`)
  else if (/error|failed|fatal/i.test(line)) console.error('Stripe listener reported a connection or forwarding error. Check local server availability and sandbox credentials.')
}
for (const stream of [child.stdout, child.stderr]) {
  let pending = ''
  stream.on('data', chunk => {
    pending += chunk.toString()
    const lines = pending.split(/[\r\n]+/); pending = lines.pop() ?? ''
    for (const line of lines) void lineReceived(line)
  })
  stream.on('end', () => { if (pending) void lineReceived(pending) })
}
child.on('error', () => { console.error('Could not start Stripe CLI. Install it and retry.'); process.exitCode = 1 })
child.on('exit', code => { if (code) process.exitCode = code })
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
