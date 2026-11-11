import { services } from './data'

export const issues = [
  { id: 'no-hot-water', label: 'No hot water', service: 'water-heaters', urgent: false },
  { id: 'slow-drain', label: 'A slow or clogged drain', service: 'drain-cleaning', urgent: false },
  { id: 'sewer-backup', label: 'Several drains backing up', service: 'sewer-repair', urgent: true },
  { id: 'basement-water', label: 'Water around the sump pump', service: 'sump-pumps', urgent: true },
  { id: 'leaking-pipe', label: 'A leaking pipe or fixture', service: 'leak-repair', urgent: true },
] as const

export type ContactMethod = 'email' | 'call' | 'text'
export type Draft = { service: string; issue: string; details: string; zip: string; day: string; time: string; name: string; contact: ContactMethod; email: string; phone: string; preferences: string }
export const emptyDraft: Draft = { service: '', issue: '', details: '', zip: '', day: '', time: 'Any time', name: '', contact: 'email', email: '', phone: '', preferences: '' }
export const draftStorageKey = 'deercreekplumbing:demo-draft:v1'

export function serviceName(service: string) {
  return services.find(item => item.slug === service)?.name ?? (service === 'other' ? 'I’m not sure yet' : '')
}

export function choiceFromValue(value: string): Pick<Draft, 'service' | 'issue'> | null {
  const issue = issues.find(item => item.id === value)
  if (issue) return { issue: issue.id, service: issue.service }
  if (value === 'unsure') return { issue: '', service: 'other' }
  const service = value.startsWith('service:') ? value.slice(8) : ''
  return services.some(item => item.slug === service) ? { service, issue: '' } : null
}

export function choiceValue(draft: Pick<Draft, 'service' | 'issue'>) {
  if (issues.some(issue => issue.id === draft.issue && issue.service === draft.service)) return draft.issue
  return draft.service === 'other' ? 'unsure' : draft.service ? `service:${draft.service}` : ''
}

/** Explicit link context changes the requested work, never the other entered details. */
export function applyLinkContext(draft: Draft, search: string): Draft {
  const params = new URLSearchParams(search)
  const choice = choiceFromValue(params.get('issue') ?? '')
  const requestedService = params.get('service') ?? ''
  const service = requestedService === 'other' || services.some(item => item.slug === requestedService) ? requestedService : ''
  const zip = params.get('zip') ?? ''
  return {
    ...draft,
    ...(choice ?? (service ? { service, issue: draft.service === service ? draft.issue : '' } : {})),
    ...(/^\d{5}$/.test(zip) ? { zip } : {}),
  }
}

/** Sample form details live in this tab only, with an explicit clear action in the form. */
export function loadDraft(): Draft {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(draftStorageKey) ?? 'null')
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return { ...emptyDraft }
    const raw = saved as Record<string, unknown>
    const text = (key: keyof Draft, max: number) => typeof raw[key] === 'string' ? raw[key].slice(0, max) : ''
    const service = text('service', 60)
    const issue = text('issue', 60)
    return {
      service: serviceName(service) ? service : '',
      issue: issues.some(item => item.id === issue && item.service === service) ? issue : '',
      details: text('details', 1500), zip: text('zip', 5).replace(/\D/g, ''),
      day: /^\d{4}-\d{2}-\d{2}$/.test(text('day', 10)) ? text('day', 10) : '',
      time: ['Any time', 'Morning', 'Afternoon'].includes(text('time', 20)) ? text('time', 20) : 'Any time',
      name: text('name', 120), contact: raw.contact === 'call' || raw.contact === 'text' ? raw.contact : 'email',
      email: text('email', 200), phone: text('phone', 25), preferences: text('preferences', 1000),
    }
  } catch { return { ...emptyDraft } }
}

export function saveDraft(draft: Draft) {
  try { sessionStorage.setItem(draftStorageKey, JSON.stringify(draft)); return true } catch { return false }
}
export function clearSavedDraft() {
  try { sessionStorage.removeItem(draftStorageKey) } catch { /* No storage to clear. */ }
}
