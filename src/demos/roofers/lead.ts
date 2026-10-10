/**
 * The qualifying questions, the lead they produce, and how a lead is
 * prioritised. Kept apart from the form so the same definitions drive the
 * inputs, the validation and the preview of what the contractor receives.
 */

export type Choice<T extends string = string> = { value: T; label: string; hint?: string }

export const ISSUES = [
  { value: 'storm', label: 'Storm damage', hint: 'Hail or wind' },
  { value: 'leak', label: 'Active leak', hint: 'Water getting in' },
  { value: 'aging', label: 'Old or worn out', hint: 'Curling, bald, patched' },
  { value: 'sale', label: 'Buying or selling', hint: 'Inspection or certification' },
  { value: 'unsure', label: 'Not sure', hint: 'I want it checked' },
] as const satisfies readonly Choice[]

export const PROPERTIES = [
  { value: 'house', label: 'House' },
  { value: 'multi', label: 'Townhome or multi-family' },
  { value: 'commercial', label: 'Commercial building' },
] as const satisfies readonly Choice[]

export const ROOF_AGES = [
  { value: 'under10', label: 'Under 10 years' },
  { value: '10to20', label: '10–20 years' },
  { value: 'over20', label: 'Over 20 years' },
  { value: 'unknown', label: 'Not sure' },
] as const satisfies readonly Choice[]

export const INSURANCE = [
  { value: 'will-file', label: 'I plan to file a claim' },
  { value: 'filed', label: 'I’ve already filed' },
  { value: 'self', label: 'I’m paying myself' },
  { value: 'unsure', label: 'Not sure yet — help me decide' },
] as const satisfies readonly Choice[]

export const STORM_DATES = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'Earlier this month' },
  { value: 'half-year', label: '1–6 months ago' },
  { value: 'year', label: '6–12 months ago' },
  { value: 'older', label: 'Over a year ago' },
  { value: 'unknown', label: 'Not sure' },
] as const satisfies readonly Choice[]

export const PAYMENT = [
  { value: 'insurance', label: 'Insurance' },
  { value: 'cash', label: 'Cash or savings' },
  { value: 'finance', label: 'Monthly financing' },
  { value: 'unsure', label: 'Not sure yet' },
] as const satisfies readonly Choice[]

export const TIMELINES = [
  { value: 'now', label: 'As soon as possible', hint: 'It’s leaking or exposed' },
  { value: '30', label: 'Within 30 days' },
  { value: '90', label: 'In 1–3 months' },
  { value: 'research', label: 'Just researching' },
] as const satisfies readonly Choice[]

export const OWNERSHIP = [
  { value: 'yes', label: 'Yes, I own it' },
  { value: 'no', label: 'No — I rent or manage it' },
] as const satisfies readonly Choice[]

export const BEST_TIMES = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'any', label: 'Any time' },
] as const satisfies readonly Choice[]

type ValueOf<T extends readonly Choice[]> = T[number]['value']

export interface LeadAnswers {
  issue: ValueOf<typeof ISSUES> | ''
  property: ValueOf<typeof PROPERTIES> | ''
  roofAge: ValueOf<typeof ROOF_AGES> | ''
  insurance: ValueOf<typeof INSURANCE> | ''
  stormDate: ValueOf<typeof STORM_DATES> | ''
  payment: ValueOf<typeof PAYMENT> | ''
  timeline: ValueOf<typeof TIMELINES> | ''
  owner: ValueOf<typeof OWNERSHIP> | ''
  name: string
  phone: string
  email: string
  street: string
  zip: string
  bestTime: ValueOf<typeof BEST_TIMES>
  notes: string
  texts: boolean
}

export const EMPTY_ANSWERS: LeadAnswers = {
  issue: '',
  property: '',
  roofAge: '',
  insurance: '',
  stormDate: '',
  payment: '',
  timeline: '',
  owner: '',
  name: '',
  phone: '',
  email: '',
  street: '',
  zip: '',
  bestTime: 'any',
  notes: '',
  texts: true,
}

/** The roof the visitor priced, so the office knows its size before calling. */
export interface LeadRoof {
  /** 'measured' = measured by a roof-measuring service; 'outline' = public building outline at their address. */
  source: 'measured' | 'outline' | 'sample' | 'home-size'
  address: string | null
  footprintSqFt: number
  roofSqFt: number
  squares: number
  pitch: number
  buildings: number
  /** The measuring service's confidence, for measured roofs. */
  confidence?: string | null
  /** The pitch the service measured, when it differs from the `pitch` the homeowner priced at. */
  measuredPitch?: number | null
  /**
   * Who measured it, for measured roofs. Google's Solar terms (§20.2) allow
   * keeping its numbers for 30 days, longer only inside a solar proposal the
   * homeowner asked for, so a live CRM needs to know which records to expire.
   */
  measuredBy?: string | null
  /** When it was measured (ISO), so that expiry can be timed. */
  measuredAt?: string | null
  /** Solar shingles the homeowner priced, if they chose them. */
  solar?: { kw: number; yearlyKwh: number | null } | null
}

/** What the visitor already saw on the page, carried into the lead. */
export interface LeadContext {
  ballpark: { low: number; high: number; summary: string; roof?: LeadRoof | null } | null
  payment: { monthly: number; plan: string; amount: number } | null
}

export const asksStormDate = (answers: LeadAnswers) =>
  answers.issue === 'storm' || answers.insurance === 'will-file' || answers.insurance === 'filed'

export type FieldName = keyof LeadAnswers

/** Required fields per step; the last step is contact details. */
export function stepFields(step: number, answers: LeadAnswers): FieldName[] {
  switch (step) {
    case 0:
      return ['issue', 'property', 'roofAge']
    case 1:
      return asksStormDate(answers) ? ['insurance', 'stormDate', 'payment'] : ['insurance', 'payment']
    case 2:
      return ['timeline', 'owner']
    default:
      return ['name', 'phone', 'email', 'street', 'zip']
  }
}

const phoneDigits = (value: string) => value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')

export function fieldError(field: FieldName, answers: LeadAnswers): string | null {
  const value = answers[field]
  switch (field) {
    case 'name':
      return answers.name.trim().length >= 2 ? null : 'Please add your name.'
    case 'phone':
      return phoneDigits(answers.phone).length === 10 ? null : 'Enter a 10-digit phone number.'
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(answers.email.trim()) ? null : 'Enter an email address like name@example.com.'
    case 'street':
      return answers.street.trim().length >= 5 ? null : 'Add the property’s street address.'
    case 'zip':
      return /^\d{5}$/.test(answers.zip.trim()) ? null : 'Enter a 5-digit ZIP code.'
    default:
      return value === '' ? 'Choose one to continue.' : null
  }
}

export const formatPhone = (value: string) => {
  const digits = phoneDigits(value)
  return digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : value.trim()
}

export const labelFor = <T extends readonly Choice[]>(choices: T, value: string) =>
  choices.find((choice) => choice.value === value)?.label ?? '—'

export type Priority = 'hot' | 'warm' | 'nurture'

export interface LeadScore {
  priority: Priority
  score: number
  reasons: string[]
  nextStep: string
}

/**
 * A transparent points system — the same thing a contractor's office does
 * by ear on the phone, applied before anyone picks it up.
 */
export function scoreLead(answers: LeadAnswers, context: LeadContext): LeadScore {
  let score = 0
  const reasons: string[] = []
  const add = (points: number, reason?: string) => {
    score += points
    if (reason) reasons.push(reason)
  }

  if (answers.issue === 'storm') add(3, 'Storm damage')
  else if (answers.issue === 'leak') add(3, 'Active leak')
  else if (answers.issue === 'aging') add(2, 'Roof at end of life')
  else if (answers.issue === 'sale') add(2, 'Home sale deadline')
  else add(1)

  if (answers.timeline === 'now') add(3, 'Wants it done now')
  else if (answers.timeline === '30') add(2, 'Ready within 30 days')
  else if (answers.timeline === '90') add(1)

  if (answers.owner === 'yes') add(2, 'Owner, makes the decision')
  if (answers.insurance === 'filed') add(1, 'Claim already filed')
  if (answers.payment === 'cash') add(2, 'Paying cash')
  else if (answers.payment === 'finance' || answers.payment === 'insurance') add(1)
  if (answers.roofAge === 'over20') add(1, 'Roof over 20 years old')
  if (answers.property === 'commercial') add(1, 'Commercial property')
  if (context.ballpark?.roof?.source === 'measured') add(2, 'Measured their roof')
  else if (context.ballpark?.roof?.source === 'outline') add(2, 'Priced their actual roof')
  else if (context.ballpark) add(1, 'Has already seen pricing')

  const priority: Priority = score >= 9 ? 'hot' : score >= 5 ? 'warm' : 'nurture'
  const nextStep =
    priority === 'hot'
      ? 'Call within 5 minutes and offer the next inspection slot.'
      : priority === 'warm'
        ? 'Call today. Book the inspection and send the prep checklist.'
        : 'Send the homeowner guide by text, then follow up in a week.'

  return { priority, score, reasons: reasons.slice(0, 5), nextStep }
}
