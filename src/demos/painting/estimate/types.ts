/** The estimate request, shared by the page and /api/paint-request. */

export const PROJECTS = ['exterior', 'interior', 'cabinets', 'carpentry', 'commercial'] as const
export const TIMINGS = ['soon', 'season', 'planning'] as const
export const CONTACT_METHODS = ['call', 'text', 'email'] as const

export type Project = (typeof PROJECTS)[number]
export type Timing = (typeof TIMINGS)[number]
export type ContactMethod = (typeof CONTACT_METHODS)[number]

export const PROJECT_LABELS: Record<Project, string> = {
  exterior: 'Exterior painting',
  interior: 'Interior painting',
  cabinets: 'Cabinet refinishing',
  carpentry: 'Rotten wood replacement',
  commercial: 'Commercial painting',
}

export const TIMING_LABELS: Record<Timing, string> = {
  soon: 'As soon as possible',
  season: 'In the next few months',
  planning: 'Just planning ahead',
}

export const CONTACT_LABELS: Record<ContactMethod, string> = { call: 'Call', text: 'Text', email: 'Email' }

export interface EstimateRequestBody {
  name: string
  phone: string
  email: string
  contact: ContactMethod
  /** Town or street address, as the visitor typed it. */
  location: string
  projects: Project[]
  timing: Timing
  /** The color studio's last selection, when the visitor brought one along. */
  colors?: string
  notes?: string
  /** Honeypot: people never fill it in. */
  company?: string
}

export type EstimateErrorCode = 'invalid' | 'not_configured' | 'rate_limited' | 'send_failed'

export type EstimateResponse = { ok: true } | { ok: false; error: EstimateErrorCode }
