import { readFile } from 'node:fs/promises'
import { createHmac, randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'

export const root = new URL('../../', import.meta.url).pathname
export const origin = process.env.CAPTURE_ORIGIN || 'http://127.0.0.1:5176'
export async function playwright() {
  try { return await import('playwright') } catch {
    const directory = process.env.WORKSPACE_NODE_MODULES || '/Users/matthewwallace/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
    return createRequire(`${directory}/playwright/package.json`)('playwright')
  }
}
export async function localCookie() {
  const url = new URL(origin)
  if (!['127.0.0.1','localhost'].includes(url.hostname) || url.protocol !== 'http:') throw new Error('Capture grants are restricted to local HTTP origins')
  const env = Object.fromEntries((await readFile(new URL('../../.demo-preview.local',import.meta.url),'utf8')).split('\n').filter(line => line.includes('=') && !line.trim().startsWith('#')).map(line=>{ const at=line.indexOf('='); return [line.slice(0,at).replace(/^export\s+/,'').trim(),line.slice(at+1).trim().replace(/^['"]|['"]$/g,'')] }))
  const secret = env.DEMO_ACCESS_SECRET
  if (!secret || secret.length < 32 || !env.DEMO_ADMIN_EMAIL) throw new Error('Local preview secret and admin email required')
  const now = Math.floor(Date.now()/1000)
  const data=Buffer.from(JSON.stringify({v:2,kind:'admin-session',origin,demo:'roofers',recipientHash:createHmac('sha256',secret).update(`demo-recipient:${env.DEMO_ADMIN_EMAIL.trim().toLowerCase()}`).digest('hex'),iat:now,exp:now+3600,nonce:randomBytes(16).toString('hex')})).toString('base64url')
  return {name:'wallace_demo_admin',value:`${data}.${createHmac('sha256',secret).update(data).digest('base64url')}`,url:origin}
}
