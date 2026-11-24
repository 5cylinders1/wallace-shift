/**
 * The estimate request, shared by the form and api/_lib/trim/request.ts.
 * Labels here are the English ones the owner reads in the email.
 */
export const LANGUAGES = ['en', 'es'] as const
export type Language = typeof LANGUAGES[number]

export const CUSTOMERS = ['homeowner', 'builder'] as const
export type Customer = typeof CUSTOMERS[number]
export const CUSTOMER_LABELS: Record<Customer, string> = { homeowner: 'Homeowner', builder: 'Builder or contractor' }

export const JOBS = ['staircases', 'wall-paneling', 'crown-ceilings', 'trim-doors', 'built-ins', 'unsure'] as const
export type Job = typeof JOBS[number]
export const JOB_LABELS: Record<Job, string> = {
  staircases: 'Staircases & railings',
  'wall-paneling': 'Accent walls & paneling',
  'crown-ceilings': 'Crown molding & ceilings',
  'trim-doors': 'Baseboards, doors & windows',
  'built-ins': 'Built-ins & mantels',
  unsure: 'Not sure yet',
}

export const TIMINGS = ['soon', 'quarter', 'later', 'pricing'] as const
export type Timing = typeof TIMINGS[number]
export const TIMING_LABELS: Record<Timing, string> = {
  soon: 'As soon as possible',
  quarter: 'In the next 3 months',
  later: 'Later this year',
  pricing: 'Just getting prices',
}

export const CONTACTS = ['call', 'text', 'email'] as const
export type Contact = typeof CONTACTS[number]
export const CONTACT_LABELS: Record<Contact, string> = { call: 'Phone call', text: 'Text message', email: 'Email' }

export const MAX_PHOTOS = 3
/** Each photo is resized in the browser first; this is a ceiling, not a target. */
export const MAX_PHOTO_BYTES = 1_200_000

export type RequestErrorCode = 'invalid' | 'not_configured' | 'rate_limited' | 'send_failed'
export type RequestResponse = { ok: true } | { ok: false; error: RequestErrorCode }
