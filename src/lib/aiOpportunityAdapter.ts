import {
  aiOffer, aiPackages, workflowOptions, roleOptions, approverOptions, revenueOptions, weeklyHoursOptions, impactOptions,
  aiExperienceOptions, aiBarrierOptions, budgetOptions, timingOptions, routeAiOpportunity,
  type AiOpportunityPayload, type AiOpportunityRoute, type AiQualificationStep,
} from '../content/aiOffer'

export type AiOpportunityStep = AiQualificationStep | 'contact'
type ChoiceField = 'role' | 'revenue' | 'weeklyHours' | 'aiExperience' | 'budget' | 'timing'
export type AiOpportunityFormValues = Omit<AiOpportunityPayload, 'submissionId' | 'offerVersion' | ChoiceField> & {
  [K in ChoiceField]: AiOpportunityPayload[K] | ''
}
export type AiOpportunityErrors = Partial<Record<keyof AiOpportunityFormValues, string>>
export type AiOpportunityResult =
  | { ok: true; applicationId: string; route: AiOpportunityRoute; notification: 'queued' | 'sent' }
  | { ok: false; reason: 'not_configured' | 'invalid' | 'offer_changed' | 'submission_conflict' | 'rate_limited' | 'unavailable' }

export const initialAiOpportunityValues: AiOpportunityFormValues = {
  businessType: '', workflows: [], workflowDetails: '', currentTools: '', weeklyHours: '', impacts: [],
  role: '', approverAvailability: '', revenue: '', aiExperience: '', aiBarriers: [], budget: '', timing: '',
  name: '', businessName: '', email: '', website: '', contactMethod: 'email', phone: '',
  nextStep: 'consultation', packageId: '',
  offerAcknowledged: false, contactConsent: false, company: '',
}

/** Hidden answers never survive a change that makes their branch irrelevant. */
export function normalizeAiOpportunity(values: AiOpportunityFormValues): AiOpportunityFormValues {
  const normalized = {
    ...values,
    approverAvailability: values.role === 'joint' || values.role === 'researching' ? values.approverAvailability : '',
    aiBarriers: values.aiExperience === 'new' ? [] : [...values.aiBarriers],
    workflows: [...values.workflows],
    impacts: [...values.impacts],
    packageId: values.nextStep === 'package' ? values.packageId : '',
    contactMethod: values.nextStep === 'package' ? 'email' : values.contactMethod,
    phone: values.nextStep === 'consultation' && values.contactMethod === 'call' ? values.phone : '',
  } satisfies AiOpportunityFormValues
  if (routeAiOpportunity(normalized) === 'resource') normalized.offerAcknowledged = false
  return normalized
}

export function createAiOpportunityPayload(values: AiOpportunityFormValues, submissionId: string): AiOpportunityPayload {
  return { ...normalizeAiOpportunity(values), submissionId, offerVersion: aiOffer.version } as AiOpportunityPayload
}

/** Validation mirrors the API. Browser validation is for useful recovery, never security. */
export function validateAiOpportunity(values: AiOpportunityFormValues, step?: AiOpportunityStep): AiOpportunityErrors {
  const errors: AiOpportunityErrors = {}
  const text = (key: keyof AiOpportunityFormValues, label: string, max: number, required = true) => {
    const value = String(values[key]).trim()
    if (required && !value) errors[key] = `Please enter ${label}.`
    else if (value.length > max) errors[key] = `Please keep ${label} under ${max + 1} characters.`
  }
  const choice = (key: ChoiceField | 'approverAvailability', options: readonly { value: string }[], label: string) => {
    if (!options.some(option => option.value === values[key])) errors[key] = `Please choose ${label}.`
  }
  const multiple = (key: 'workflows' | 'impacts' | 'aiBarriers', options: readonly { value: string }[], label: string) => {
    const selected = values[key]
    const max = key === 'workflows' ? options.length : 2
    if (!Array.isArray(selected) || selected.length < 1 || selected.length > max || new Set(selected).size !== selected.length
      || selected.some(value => !options.some(option => option.value === value))) errors[key] = key === 'workflows' ? 'Please select at least one issue or “I am not sure yet”.' : `Please choose one or two ${label}.`
    else if ((key === 'workflows' || key === 'impacts') && selected.includes('not_sure' as never) && selected.length > 1) errors[key] = `Choose “I am not sure yet” on its own, or select the ${label} you know.`
  }
  if (!step || step === 'bottleneck') multiple('workflows', workflowOptions, 'issues')
  if (!step || step === 'authority') {
    choice('role', roleOptions, 'your role in the decision')
    if (values.role === 'joint' || values.role === 'researching') choice('approverAvailability', approverOptions, 'whether the person who approves can take part')
  }
  if (!step || step === 'business') {
    choice('revenue', revenueOptions, 'a revenue range or “I would prefer to discuss this”')
  }
  if (!step || step === 'impact') {
    choice('weeklyHours', weeklyHoursOptions, 'a team time estimate or “We have not measured it yet”')
    multiple('impacts', impactOptions, 'consequences')
  }
  if (!step || step === 'experience') {
    choice('aiExperience', aiExperienceOptions, 'your experience with AI')
    if (values.aiExperience && values.aiExperience !== 'new') multiple('aiBarriers', aiBarrierOptions, 'barriers')
  }
  if (!step || step === 'tools') {
    text('currentTools', 'your current tools', 500, false)
    text('workflowDetails', 'your task description', 1500, false)
  }
  if (!step || step === 'readiness') {
    choice('budget', budgetOptions, 'your readiness to invest')
    choice('timing', timingOptions, 'when you would like to start')
  }
  if (!step || step === 'contact') {
    text('businessType', 'what your business does', 120, false)
    text('name', 'your name', 120)
    text('businessName', 'your business name', 160)
    if (!['package', 'consultation'].includes(values.nextStep)) errors.nextStep = 'Please choose a package or consultation.'
    if (values.nextStep === 'package' && !Object.hasOwn(aiPackages, values.packageId)) errors.packageId = 'Please choose an available package.'
    if (values.nextStep === 'consultation' && values.packageId !== '') errors.packageId = 'Please clear the package selection for a consultation.'
    text('email', 'your email address', 254, values.nextStep !== 'consultation' || values.contactMethod !== 'call')
    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Please enter a valid email address.'
    text('website', 'your website address', 300, false)
    if (values.website.trim()) {
      try {
        const url = new URL(values.website.trim())
        if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) throw new Error('invalid')
      } catch { errors.website = 'Use a full website address, such as https://example.com, or leave this blank.' }
    }
    if (!['email', 'call'].includes(values.contactMethod)) errors.contactMethod = 'Please choose how you would like us to respond.'
    if (values.nextStep === 'package' && values.contactMethod !== 'email') errors.contactMethod = 'An email address is needed to discuss your package.'
    if (values.contactMethod === 'call') {
      const phone = values.phone.trim()
      const digits = phone.replace(/\D/g, '')
      if (phone.length > 40 || !/^[+()\d .-]+$/.test(phone) || digits.length < 7 || digits.length > 15) errors.phone = 'Please enter a phone number with 7 to 15 digits.'
    }
    if (routeAiOpportunity(values) !== 'resource' && !values.offerAcknowledged) errors.offerAcknowledged = 'Please confirm that you understand the conditional website offer.'
    if (!values.contactConsent) errors.contactConsent = 'Please confirm that we may respond to your request.'
  }
  return errors
}

/** A 200 HTML page or bare {ok:true} is not a saved application. */
export async function submitAiOpportunity(payload: AiOpportunityPayload): Promise<AiOpportunityResult> {
  try {
    const response = await fetch('/api/ai-opportunity', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    })
    const body: unknown = await response.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, reason: 'not_configured' }
    const data = body as Record<string, unknown>
    if (response.ok && data.ok === true
      && typeof data.applicationId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.applicationId)
      && ['fit_call', 'manual_review', 'resource'].includes(String(data.route))
      && ['queued', 'sent'].includes(String(data.notification))) {
      return { ok: true, applicationId: data.applicationId, route: data.route as AiOpportunityRoute, notification: data.notification as 'queued' | 'sent' }
    }
    const knownErrors = ['not_configured', 'invalid', 'offer_changed', 'submission_conflict', 'rate_limited'] as const
    const reason = knownErrors.find(error => error === data.error)
    return { ok: false, reason: reason ?? 'unavailable' }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}
