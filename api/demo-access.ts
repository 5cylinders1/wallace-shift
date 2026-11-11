import type { IncomingMessage, ServerResponse } from 'node:http'
import { DEMO_ADMIN_COOKIE, DEMO_COOKIE, DEMO_PENDING_COOKIE, DEMO_PROOF_COOKIE, demoCookie, demoJson, DemoError, nodeDemoOrigin, nodeHeader, readDemoCookie, setDemoPrivateHeaders, verifyDemoGrant } from './_lib/demo-access.js'

/** Session checks are read-only; invitations only start verification. */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if (req.method !== 'GET') { res.setHeader('allow', 'GET'); throw new DemoError('method_not_allowed', 405) }
    const origin = nodeDemoOrigin(req)
    const params = new URL(req.url ?? '/', origin).searchParams
    if (params.get('status') === '1' && !params.has('token')) {
      const cookie = nodeHeader(req, 'cookie')
      const authenticated = verifyDemoGrant(readDemoCookie(cookie, DEMO_COOKIE), origin, 'session') !== null
        || verifyDemoGrant(readDemoCookie(cookie, DEMO_ADMIN_COOKIE), origin, 'admin-session') !== null
      demoJson(res, 200, { ok: true, authenticated })
      return
    }
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
