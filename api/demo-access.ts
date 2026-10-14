import type { IncomingMessage, ServerResponse } from 'node:http'
import { DEMO_COOKIE, DEMO_PENDING_COOKIE, DEMO_PROOF_COOKIE, demoCookie, demoJson, DemoError, nodeDemoOrigin, setDemoPrivateHeaders, verifyDemoGrant } from './_lib/demo-access.js'

/** An approved invitation only starts verification; it never grants demo access. */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if (req.method !== 'GET') { res.setHeader('allow', 'GET'); throw new DemoError('method_not_allowed', 405) }
    const origin = nodeDemoOrigin(req)
    const params = new URL(req.url ?? '/', origin).searchParams
    const token = params.get('token') ?? ''
    const grant = params.getAll('token').length === 1 ? verifyDemoGrant(token, origin, 'invite') : null
    setDemoPrivateHeaders(res)
    res.setHeader('set-cookie', [
      demoCookie(DEMO_COOKIE, '', origin, 0),
      demoCookie(DEMO_PROOF_COOKIE, '', origin, 0),
      demoCookie(DEMO_PENDING_COOKIE, grant ? token : '', origin, grant ? grant.exp - Math.floor(Date.now() / 1000) : 0),
    ])
    res.statusCode = 303
    res.setHeader('location', grant ? '/demo-agreement/' : '/request-demo/?access=expired')
    res.end()
  } catch (error) {
    const failure = error instanceof DemoError ? error : new DemoError('unavailable', 503)
    demoJson(res, failure.status, { ok: false, error: failure.code })
  }
}
