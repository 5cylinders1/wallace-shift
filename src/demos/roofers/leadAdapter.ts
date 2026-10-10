import type { LeadAnswers, LeadContext, LeadScore } from './lead'

/**
 * Where a lead goes. Isolated so a live build changes one constant.
 *
 * The demo has no destination on purpose: it belongs to a sample brand,
 * and a real homeowner who found it should never believe a roofer has
 * their request. With `LEAD_ENDPOINT` null, submitting resolves to
 * `{ ok: false, reason: 'demo' }` and the page shows the lead it would
 * have delivered, clearly marked as not sent.
 *
 * A live site points this at the contractor's CRM webhook or a serverless
 * function (see `api/contact.ts` for the pattern) that expects this JSON.
 */
export const LEAD_ENDPOINT: string | null = null

export interface LeadSubmission {
  answers: LeadAnswers
  context: LeadContext
  score: LeadScore
  submittedAt: string
}

export type LeadResult = { ok: true } | { ok: false; reason: 'demo' | 'invalid' | 'network_error' }

export async function submitLead(lead: LeadSubmission): Promise<LeadResult> {
  if (!LEAD_ENDPOINT) return { ok: false, reason: 'demo' }

  try {
    const response = await fetch(LEAD_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    })
    const body = (await response.json().catch(() => null)) as { ok?: unknown } | null
    if (response.ok && body?.ok === true) return { ok: true }
    if (response.status === 400) return { ok: false, reason: 'invalid' }
    return { ok: false, reason: 'network_error' }
  } catch {
    return { ok: false, reason: 'network_error' }
  }
}
