/**
 * The demo's sample contractor, and the per-prospect personalisation.
 *
 * Northvane Roofing is invented for this concept. The phone number is in
 * the 555-01xx block reserved for fiction, so nothing here can reach a real
 * business. For a cold-call follow-up, a link can carry the prospect's own
 * details, e.g.
 *
 *   https://roofers.wallaceshift.com/?company=Acme%20Roofing&city=Overland%20Park&phone=9135550199
 *
 * which swaps the name on the header, truck, yard sign and lead preview.
 * Values are length-capped and rendered as text only.
 */

export interface DemoBrand {
  company: string
  /** Shortest form, for the truck door and tight spots. */
  shortName: string
  city: string
  phoneDisplay: string
  phoneHref: string
  personalized: boolean
}

const SAMPLE = {
  company: 'Northvane Roofing',
  city: 'Kansas City',
  phone: '8165550142',
}

const MAX_TEXT = 36

function cleanText(value: string | null): string | null {
  if (!value) return null
  const printable = Array.from(value)
    .filter((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127 && char !== '<' && char !== '>')
    .join('')
  const cleaned = printable
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT)
  return cleaned.length >= 2 ? cleaned : null
}

function cleanPhone(value: string | null): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  return local.length === 10 ? local : null
}

const formatPhone = (digits: string) => `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`

/** "Acme Roofing & Exteriors" → "Acme" for the truck door. */
function shorten(company: string): string {
  const withoutTrade = company.replace(/\b(roofing|roofers?|exteriors?|construction|contracting|co\.?|company|llc|inc\.?)\b/gi, '')
  const compact = withoutTrade.replace(/[&,.]/g, ' ').replace(/\s+/g, ' ').trim()
  return (compact || company).slice(0, 16)
}

export function readDemoBrand(search: string): DemoBrand {
  const params = new URLSearchParams(search)
  const company = cleanText(params.get('company'))
  const city = cleanText(params.get('city'))
  const phone = cleanPhone(params.get('phone'))
  const finalCompany = company ?? SAMPLE.company
  const finalPhone = phone ?? SAMPLE.phone
  return {
    company: finalCompany,
    shortName: shorten(finalCompany),
    city: city ?? SAMPLE.city,
    phoneDisplay: formatPhone(finalPhone),
    phoneHref: `tel:+1${finalPhone}`,
    personalized: Boolean(company || city || phone),
  }
}

export const brand: DemoBrand = readDemoBrand(typeof window === 'undefined' ? '' : window.location.search)
