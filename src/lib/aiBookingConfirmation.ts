import { isAiBookingQualified, qualificationSteps } from '../content/aiOffer'
import { initialAiOpportunityValues, normalizeAiOpportunity, validateAiOpportunity,
  type AiOpportunityFormValues } from './aiOpportunityAdapter'
import { quizAnswers } from './aiQualificationAnswers'

const SESSION_KEY = 'ws:ai-booking-confirmation:v1'
const SESSION_TTL_MS = 4 * 60 * 60 * 1000

declare global {
  interface Window { __wsAiBookingConfirmed?: boolean }
}

export function clearAiBookingConfirmation() {
  window.__wsAiBookingConfirmed = false
  try { sessionStorage.removeItem(SESSION_KEY) } catch { /* Storage can be disabled. */ }
}

export function saveAiBookingConfirmation(values: AiOpportunityFormValues) {
  // This is only a tab-local presentation hint. It never authorizes a payment
  // or replaces the booking provider's server-side records.
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ version: 1, savedAt: Date.now(), answers: quizAnswers(values) }))
  } catch { /* The current mounted flow still works without session storage. */ }
}

export function restoreAiBookingConfirmation(): AiOpportunityFormValues | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const record: unknown = JSON.parse(raw)
    if (!record || typeof record !== 'object') throw new Error('Invalid confirmation')
    const { version, savedAt, answers } = record as Record<string, unknown>
    if (version !== 1 || typeof savedAt !== 'number' || !Number.isFinite(savedAt)
      || savedAt > Date.now() || Date.now() - savedAt >= SESSION_TTL_MS
      || !answers || typeof answers !== 'object' || Array.isArray(answers)) throw new Error('Invalid confirmation')
    const input = answers as Record<string, unknown>
    const strings = ['businessType', 'workflowDetails', 'currentTools', 'weeklyHours', 'impactDetails',
      'role', 'approverAvailability', 'revenue', 'aiExperience', 'budget', 'timing'] as const
    const arrays = ['workflows', 'impacts', 'aiBarriers'] as const
    if (strings.some(key => typeof input[key] !== 'string' || input[key].length > 1500)
      || arrays.some(key => !Array.isArray(input[key]) || input[key].length > 20
        || input[key].some(item => typeof item !== 'string' || item.length > 120))) throw new Error('Invalid answers')
    // Copy only the recognized answer fields; never restore contact or checkout data.
    const selected = Object.fromEntries([...strings, ...arrays].map(key => [key, input[key]]))
    const values = { ...initialAiOpportunityValues, ...selected } as AiOpportunityFormValues
    if (values.businessType.length > 120 || values.approverAvailability !== ''
      || !isAiBookingQualified(values)
      || qualificationSteps.some(step => Object.keys(validateAiOpportunity(values, step.id)).length > 0)) throw new Error('Invalid answers')
    return normalizeAiOpportunity(values)
  } catch {
    clearAiBookingConfirmation()
    return null
  }
}
