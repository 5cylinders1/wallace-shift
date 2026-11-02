import type { IncomingMessage } from 'node:http'
import { DemoError, nodeHeader, normalizeDemoEmail } from './demo-access.js'
import {
  aiOffer, aiPackages, workflowOptions, weeklyHoursOptions, impactOptions, approverOptions,
  revenueOptions, aiExperienceOptions, aiBarrierOptions, timingOptions, roleOptions,
  budgetOptions, routeAiOpportunity,
} from '../../src/content/aiOffer.js'
import { opportunityId, type OpportunityApplication } from './ai-opportunity-store.js'

const MAX_BODY = 12_000
const fields = new Set(['submissionId', 'offerVersion', 'businessType', 'workflows', 'workflowDetails', 'currentTools', 'weeklyHours', 'impacts', 'timing', 'role', 'approverAvailability', 'revenue', 'aiExperience', 'aiBarriers', 'budget', 'name', 'businessName', 'email', 'website', 'contactMethod', 'nextStep', 'packageId', 'phone', 'offerAcknowledged', 'contactConsent', 'company'])

export async function readOpportunityBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:\s*;|$)/i.test(nodeHeader(req, 'content-type') ?? '')) throw new DemoError('invalid', 400)
  const length = Number(nodeHeader(req, 'content-length') ?? 0)
  if (!Number.isFinite(length) || length < 0 || length > MAX_BODY) throw new DemoError('too_large', 413)
  const parsed = (req as IncomingMessage & { body?: unknown }).body
  let raw: string
  if (parsed !== undefined) {
    try { raw = Buffer.isBuffer(parsed) ? parsed.toString('utf8') : typeof parsed === 'string' ? parsed : JSON.stringify(parsed) }
    catch { throw new DemoError('invalid', 400) }
  } else {
    raw = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = []; let size = 0; let done = false
      const finish = (error?: Error) => {
        if (done) return
        done = true; clearTimeout(timer)
        if (error) reject(error)
        else resolve(Buffer.concat(chunks).toString('utf8'))
      }
      const timer = setTimeout(() => finish(new DemoError('invalid', 408)), 10_000)
      req.on('data', (chunk: Buffer | string) => {
        if (done) return
        const buffer = Buffer.from(chunk); size += buffer.length
        if (size > MAX_BODY) { finish(new DemoError('too_large', 413)); return }
        chunks.push(buffer)
      })
      req.on('end', () => finish())
      req.on('error', () => finish(new DemoError('invalid', 400)))
      req.on('aborted', () => finish(new DemoError('invalid', 400)))
    })
  }
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > MAX_BODY) throw new DemoError('too_large', 413)
  let body: unknown
  try { body = JSON.parse(raw) } catch { throw new DemoError('invalid', 400) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new DemoError('invalid', 400)
  return body as Record<string, unknown>
}

function text(value: unknown, max: number, required = true, multiline = false): string {
  if (value === undefined && !required) return ''
  if (typeof value !== 'string' || value.length > max) throw new DemoError('invalid', 400)
  const normalized = value.trim().replace(/\r\n?/g, '\n')
  if ((required && !normalized) || [...normalized].some(c => (c.charCodeAt(0) < 32 && !(multiline && c === '\n')) || c.charCodeAt(0) === 127)) throw new DemoError('invalid', 400)
  return normalized
}

function choice<T extends string>(value: unknown, options: readonly { value: T }[]): T {
  if (typeof value !== 'string' || !options.some(option => option.value === value)) throw new DemoError('invalid', 400)
  return value as T
}

function choices<T extends string>(value: unknown, options: readonly { value: T }[], min = 1, max = 2): T[] {
  if (!Array.isArray(value) || value.length < min || value.length > max || new Set(value).size !== value.length) throw new DemoError('invalid', 400)
  const selected = value.map(item => choice(item, options))
  if (selected.includes('not_sure' as T) && selected.length > 1) throw new DemoError('invalid', 400)
  // Selection order is not a different application when an unchanged request is retried.
  return options.filter(option => selected.includes(option.value)).map(option => option.value)
}

export function validateOpportunity(body: Record<string, unknown>): { id: string; application: OpportunityApplication } {
  if (Object.keys(body).some(key => !fields.has(key))) throw new DemoError('invalid', 400)
  const id = opportunityId(body.submissionId)
  if (body.offerVersion !== aiOffer.version) throw new DemoError('offer_changed', 409)
  if (typeof body.offerAcknowledged !== 'boolean' || body.contactConsent !== true) throw new DemoError('invalid', 400)
  const workflowDetails = text(body.workflowDetails, 1500, false, true)
  const role = choice(body.role, roleOptions)
  const canApprove = role === 'owner' || role === 'decision_maker'
  if (canApprove) text(body.approverAvailability, 0, false)
  const approverAvailability = canApprove ? '' : choice(body.approverAvailability, approverOptions)
  const aiExperience = choice(body.aiExperience, aiExperienceOptions)
  const aiBarriers = choices(body.aiBarriers, aiBarrierOptions, aiExperience === 'new' ? 0 : 1)
  if (aiExperience === 'new' && aiBarriers.length) throw new DemoError('invalid', 400)
  const nextStep = choice(body.nextStep, [{ value: 'package' }, { value: 'consultation' }] as const)
  const packageId = nextStep === 'package'
    ? choice(body.packageId, Object.values(aiPackages).map(item => ({ value: item.id })))
    : ''
  if (nextStep === 'consultation') text(body.packageId, 0, false)
  const contactMethod = choice(body.contactMethod, [{ value: 'email' }, { value: 'call' }] as const)
  if (nextStep === 'package' && contactMethod !== 'email') throw new DemoError('invalid', 400)
  const rawEmail = text(body.email, 254, nextStep !== 'consultation' || contactMethod !== 'call')
  const email = rawEmail ? normalizeDemoEmail(rawEmail) : ''
  const phone = text(body.phone, 40, contactMethod === 'call')
  if (contactMethod === 'email' && phone) throw new DemoError('invalid', 400)
  if (phone && (!/^[+()\d .-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15)) throw new DemoError('invalid', 400)
  let website = text(body.website, 300, false)
  if (website) {
    if (!/^[a-z][a-z\d+.-]*:/i.test(website)) website = `https://${website}`
    let url: URL
    try { url = new URL(website) } catch { throw new DemoError('invalid', 400) }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) throw new DemoError('invalid', 400)
    website = url.href
  }
  const application: OpportunityApplication = {
    offerVersion: aiOffer.version,
    businessType: text(body.businessType, 120, false),
    workflows: choices(body.workflows, workflowOptions, 1, workflowOptions.length),
    workflowDetails,
    currentTools: text(body.currentTools, 500, false),
    weeklyHours: choice(body.weeklyHours, weeklyHoursOptions),
    impacts: choices(body.impacts, impactOptions),
    timing: choice(body.timing, timingOptions),
    role, approverAvailability,
    revenue: choice(body.revenue, revenueOptions),
    aiExperience, aiBarriers,
    budget: choice(body.budget, budgetOptions),
    name: text(body.name, 120), businessName: text(body.businessName, 160),
    email, website, contactMethod, nextStep, packageId, phone,
    offerAcknowledged: body.offerAcknowledged, contactConsent: true,
  }
  const offerApplies = routeAiOpportunity(application) !== 'resource'
  if (application.offerAcknowledged !== offerApplies) throw new DemoError('invalid', 400)
  return { id, application }
}

export function isOpportunityHoneypot(body: Record<string, unknown>): boolean {
  return text(body.company, 200, false) !== ''
}

