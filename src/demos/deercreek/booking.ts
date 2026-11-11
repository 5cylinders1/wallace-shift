import { problems, serviceBySlug, type Problem, type ServiceSlug } from './content'

/** The request form's state and the links that prefill it. Kept apart from
 * Scheduler.tsx so the prefill rules can be tested without a browser. */
export type Urgency = 'emergency' | 'soon' | 'week' | 'flexible'
export type Window = 'morning' | 'afternoon' | 'any'
export type Contact = 'call' | 'text' | 'email'
export type Property = 'home' | 'rental' | 'business'

export interface Draft {
  service: ServiceSlug | 'other' | ''
  /** The problem-finder choice that sent the visitor here, as its label. */
  issue: string
  details: string
  urgency: Urgency | ''
  zip: string
  property: Property | ''
  day: string
  window: Window
  name: string
  phone: string
  email: string
  contact: Contact
  prefs: string[]
  notes: string
}

export const EMPTY: Draft = { service: '', issue: '', details: '', urgency: '', zip: '', property: '', day: 'first', window: 'any', name: '', phone: '', email: '', contact: 'call', prefs: [], notes: '' }

export interface Prefill {
  draft: Draft
  /** A valid service (or the project path) arrived with the link, so the
   * first step can show it as a summary instead of the whole catalog. */
  preselected: boolean
  problem: Problem | null
}

const urgencyFor = (problem: Problem): Urgency =>
  problem.urgency === 'now' || problem.urgency === 'safety' ? 'emergency' : problem.urgency === 'plan' ? 'flexible' : 'soon'

/** Reads links such as ?issue=leak&service=leak-repair&zip=66062. Unknown
 * values are ignored, so a stale or edited link opens an ordinary form. */
export function prefillFrom(search: string): Prefill {
  const params = new URLSearchParams(search)
  const problem = problems.find(item => item.id === params.get('issue')) ?? null
  const requested = params.get('service')
  const zip = params.get('zip') ?? ''
  const service: Draft['service'] = requested && serviceBySlug(requested)
    ? requested as ServiceSlug
    : problem?.service ?? (problem?.urgency === 'plan' ? 'other' : '')
  return {
    draft: {
      ...EMPTY,
      service,
      issue: problem?.label ?? '',
      urgency: problem ? urgencyFor(problem) : '',
      zip: /^\d{5}$/.test(zip) ? zip : '',
    },
    preselected: service !== '',
    problem,
  }
}
