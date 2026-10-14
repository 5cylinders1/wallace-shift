#!/usr/bin/env node
import { fileURLToPath } from 'node:url'
import { createServer, loadEnv } from 'vite'

const root = fileURLToPath(new URL('../', import.meta.url))
const help = `Create a private demo invitation for a prospect you have approved.

Usage:
  node scripts/create-demo-invite.mjs --email EMAIL [--demo KEY] [--origin ORIGIN]
  node scripts/create-demo-invite.mjs --help

Options:
  --email EMAIL   Approved recipient's email address (required). Only that
                   mailbox can verify and accept the demo agreement.
  --demo KEY       roofers (default), roofers-2, roofers-3, roofers-4,
                   roofers-5, or roofers-dashboard
  --origin ORIGIN  Exact website origin, with no path, query, or credentials.
                   Overrides DEMO_ACCESS_ORIGIN for this invitation only.
  --help          Show this help without creating an invitation.

Configuration:
  DEMO_ACCESS_SECRET must match the destination server's secret.
  DEMO_ACCESS_ORIGIN defaults to https://roofers.wallaceshift.com.
  Missing environment values are read from the repository's development
  environment files. Invitations expire 72 hours after creation. Access opens
  only after email verification and agreement acceptance.

This command prints a private link. It does not send email.`

function readOptions(args) {
  const options = { demo: 'roofers', email: undefined, origin: undefined, help: false }
  const seen = new Set()
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]
    if (argument === '--help') { options.help = true; continue }
    const [flag, ...inline] = argument.split('=')
    if (flag !== '--demo' && flag !== '--origin' && flag !== '--email') {
      throw new Error('Unknown argument. Use --help for the supported options.')
    }
    if (seen.has(flag)) throw new Error(`${flag} may only be supplied once.`)
    seen.add(flag)
    const value = inline.length ? inline.join('=') : args[++index]
    if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value.`)
    options[flag.slice(2)] = value
  }
  return options
}

async function main() {
  const options = readOptions(process.argv.slice(2))
  if (options.help) { console.log(help); return }
  if (!options.email) throw new Error('--email is required. Use the approved recipient’s email address.')

  const localEnv = loadEnv('development', root, '')
  for (const key of ['DEMO_ACCESS_SECRET', 'DEMO_ACCESS_ORIGIN']) {
    if (process.env[key] === undefined && localEnv[key] !== undefined) {
      process.env[key] = localEnv[key]
    }
  }
  if (options.origin !== undefined) process.env.DEMO_ACCESS_ORIGIN = options.origin

  // No config plugins, environment injection, file watcher, HMR socket, or
  // listening HTTP server are needed to load the existing server-side signer.
  const server = await createServer({
    root,
    configFile: false,
    envFile: false,
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { DEMO_PATHS, DEMO_ACCESS_SECONDS, createDemoInvite, demoAccessOrigin, normalizeDemoEmail } =
      await server.ssrLoadModule('/api/_lib/demo-access.ts')
    let email
    try { email = normalizeDemoEmail(options.email) } catch { throw new Error('--email must be a valid email address.') }
    if (!Object.hasOwn(DEMO_PATHS, options.demo)) {
      throw new Error(`Unknown demo key. Choose one of: ${Object.keys(DEMO_PATHS).join(', ')}.`)
    }
    let origin
    try { origin = demoAccessOrigin() } catch {
      throw new Error('Invalid demo origin. Use an HTTPS origin without a path, query, fragment, or credentials. HTTP localhost is allowed only outside production.')
    }
    if ((process.env.DEMO_ACCESS_SECRET ?? '').trim().length < 32) {
      throw new Error('DEMO_ACCESS_SECRET must contain at least 32 characters and match the destination server.')
    }
    const now = Math.floor(Date.now() / 1000)
    const invitation = new URL('/api/demo-access', origin)
    invitation.searchParams.set('token', createDemoInvite(options.demo, email, now))
    console.log(invitation.href)
    console.log(`Expires: ${new Date((now + DEMO_ACCESS_SECONDS) * 1000).toISOString()} (72 hours)`)
  } finally {
    await server.close()
  }
}

try { await main() } catch (error) {
  const known = error instanceof Error && /^(Unknown argument\.|--(?:demo|origin|email) |Unknown demo key\.|Invalid demo origin\.|DEMO_ACCESS_SECRET )/.test(error.message)
  console.error(known ? error.message : 'Unable to create the invitation. Check the project dependencies and demo access configuration.')
  process.exitCode = 1
}
