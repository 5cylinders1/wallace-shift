import type { IncomingMessage, ServerResponse } from 'node:http'
import { DEMO_COOKIE, DEMO_PATHS, demoJson, DemoError, nodeDemoOrigin, setDemoPrivateHeaders, signDemoGrant, verifyDemoGrant } from './_lib/demo-access.js'

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if (req.method !== 'GET') { res.setHeader('allow', 'GET'); throw new DemoError('method_not_allowed', 405) }
    const origin = nodeDemoOrigin(req)
    const params = new URL(req.url ?? '/', origin).searchParams
    const grant = params.getAll('token').length === 1 ? verifyDemoGrant(params.get('token') ?? '', origin, 'invite') : null
    if (!grant) {
      setDemoPrivateHeaders(res)
      res.statusCode = 303
      res.setHeader('location', '/request-demo/?access=expired')
      res.end()
      return
    }
    const token = signDemoGrant({ ...grant, kind: 'session' })
    const remaining = Math.max(0, grant.exp - Math.floor(Date.now() / 1000))
    setDemoPrivateHeaders(res)
    res.setHeader('set-cookie', `${DEMO_COOKIE}=${token}; Path=/; Max-Age=${remaining}; HttpOnly; SameSite=Lax${origin.startsWith('https:') ? '; Secure' : ''}`)
    res.statusCode = 303
    res.setHeader('location', DEMO_PATHS[grant.demo])
    res.end()
  } catch (error) {
    const failure = error instanceof DemoError ? error : new DemoError('temporarily_unavailable', 503)
    demoJson(res, failure.status, { ok: false, error: failure.code })
  }
}
