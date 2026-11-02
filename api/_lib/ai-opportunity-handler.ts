import type { IncomingMessage, ServerResponse } from 'node:http'
import { DemoError, demoJson, nodeDemoOrigin, nodeHeader } from './demo-access.js'
import { identity } from './portal-auth.js'
import { routeAiOpportunity } from '../../src/content/aiOffer.js'
import { createOpportunity, getOpportunity, listOpportunities, opportunityId, reserveOpportunity } from './ai-opportunity-store.js'
import { notifyOpportunity, ownerOpportunityView } from './ai-opportunity-email.js'
import { isOpportunityHoneypot, readOpportunityBody, validateOpportunity } from './ai-opportunity-validation.js'

export const config = { maxDuration: 60, api: { bodyParser: false } }

async function requireOwner(req: IncomingMessage): Promise<void> {
  if (!(await identity(req))?.admin) throw new DemoError('access_required', 403)
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    if (!['GET', 'POST'].includes(req.method ?? '')) {
      res.setHeader('allow', 'GET, POST'); throw new DemoError('method_not_allowed', 405)
    }
    const origin = nodeDemoOrigin(req)
    if (req.method === 'GET') {
      await requireOwner(req)
      const value = new URL(req.url ?? '/', origin).searchParams.get('offset') ?? '0'
      if (!/^\d{1,6}$/.test(value)) throw new DemoError('invalid', 400)
      const page = await listOpportunities(Number(value))
      demoJson(res, 200, { ok: true, applications: page.applications.map(ownerOpportunityView), nextOffset: page.nextOffset })
      return
    }
    if (nodeHeader(req, 'origin') !== origin || nodeHeader(req, 'sec-fetch-site') === 'cross-site') throw new DemoError('forbidden', 403)
    const body = await readOpportunityBody(req)
    if (body.action !== undefined) {
      await requireOwner(req)
      if (body.action !== 'retry_notification' || Object.keys(body).some(key => !['action', 'applicationId'].includes(key))) throw new DemoError('invalid', 400)
      const id = opportunityId(body.applicationId)
      await notifyOpportunity(id)
      demoJson(res, 200, { ok: true, application: ownerOpportunityView(await getOpportunity(id)) })
      return
    }
    // This offer is a review draft until its economics and delivery terms are ready.
    if (process.env.AI_OPPORTUNITY_ENABLED !== 'true') throw new DemoError('not_configured', 503)
    if (isOpportunityHoneypot(body)) { demoJson(res, 200, { ok: true }); return }
    const { id, application } = validateOpportunity(body)
    const ip = process.env.VERCEL === '1' ? nodeHeader(req, 'x-vercel-forwarded-for') : req.socket?.remoteAddress
    await reserveOpportunity(ip ?? '')
    const saved = await createOpportunity(id, application, routeAiOpportunity(application))
    let notification = saved.record.notification.state
    if (saved.created) {
      // Receipt is based only on durable storage. Email problems remain owner-recoverable.
      try { notification = await notifyOpportunity(id) } catch { /* The saved pending/sending state remains visible to the owner. */ }
    }
    demoJson(res, 200, { ok: true, applicationId: saved.record.id, route: saved.record.route, notification: notification === 'sent' ? 'sent' : 'queued' })
  } catch (error) {
    const failure = error instanceof DemoError ? error : new DemoError('temporarily_unavailable', 503)
    if (failure.status === 429) res.setHeader('retry-after', '3600')
    demoJson(res, failure.status, { ok: false, error: failure.code })
  }
}
