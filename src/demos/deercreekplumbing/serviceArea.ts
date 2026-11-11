import { placePoints, zipPoints } from './serviceAreaData'

/** Local Census geography is used for recognition, never a made-up service radius. */
export type AreaMatch = {
  kind: 'found'
  label: string
  detail: string
  zip?: string
  lat: number
  lon: number
  named: boolean
}
export type AreaLookup = AreaMatch
  | { kind: 'choose'; label: string; detail: string; options: { label: string; value: string }[] }
  | { kind: 'empty' | 'invalid' | 'unknown'; label: string; detail: string }

const states: Record<string, 'KS' | 'MO'> = { ks: 'KS', kansas: 'KS', mo: 'MO', missouri: 'MO' }
const namedPlaces = new Set(['Olathe, KS', 'Louisburg, KS', 'Paola, KS'])
const zipLocalities: Record<string, { label: string; named: boolean }> = {
  '66061': { label: 'Olathe, KS', named: true },
  '66062': { label: 'Olathe, KS', named: true },
  '66053': { label: 'Louisburg, KS', named: true },
  '66071': { label: 'Paola, KS', named: true },
  // Primary local sources confirm both city names use this ZIP:
  // https://taxbill.jocogov.org/Property-Detail?PropertyQuickRefID=R314113
  // https://www.jcprd.com/facilities/facility/details/Stilwell-Community-Park-52
  '66085': { label: 'Overland Park / Stilwell, KS', named: false },
}
const confirmation = 'The office confirms service for your exact address and visit availability.'
const invalid = (): AreaLookup => ({ kind: 'invalid', label: 'Check the location', detail: 'Enter a town name or a five digit ZIP code, such as Olathe or 66085.' })

function normalize(value: string) {
  return value.toLowerCase().normalize('NFKC').replace(/[’'`.]/g, '').replace(/\bsaint\b/g, 'st').replace(/\s+/g, ' ').trim()
}

function placeMatch(name: string, state: string, lat: number, lon: number): AreaMatch {
  const label = `${name}, ${state}`
  const named = namedPlaces.has(label)
  return { kind: 'found', label, lat, lon, named, detail: named ? `${name} is named in Deer Creek’s advertised service area. ${confirmation}` : `Location found. ${confirmation}` }
}

/** Exact ZIPs, ZIP+4, town names, common spelling variants and optional KS/MO states. */
export function lookupServiceArea(value: string): AreaLookup {
  const raw = value.normalize('NFKC').trim()
  if (!raw) return { kind: 'empty', label: 'Where do you need service?', detail: 'Enter your town or ZIP code to get started.' }
  if (raw.length > 80) return invalid()
  const zip = raw.match(/^(\d{5})(?:-\d{4})?$/)?.[1]
  if (zip) {
    const point = zipPoints.find(([code]) => code === zip)
    if (!point) return { kind: 'unknown', label: `Let’s check ZIP ${zip}`, detail: 'This ZIP is not in our local lookup. Call the office to ask about your address.' }
    const locality = zipLocalities[zip]
    return {
      kind: 'found', zip, label: locality ? `${locality.label} · ${zip}` : `ZIP ${zip}`,
      lat: point[1], lon: point[2], named: locality?.named ?? false,
      detail: locality?.named ? `${locality.label.split(',')[0]} is named in Deer Creek’s advertised service area. ${confirmation}` : `Location found. ${confirmation}`,
    }
  }
  if (/\d/.test(raw) || /[^\p{L}\s,'’.-]/u.test(raw)) return invalid()

  const parts = raw.split(',')
  if (parts.length > 2) return invalid()
  let name = normalize(parts[0])
  let state: 'KS' | 'MO' | undefined
  if (parts.length === 2) {
    state = states[normalize(parts[1])]
    if (!state) return invalid()
  } else {
    const suffix = name.match(/\s+(kansas|missouri|ks|mo)$/)
    if (suffix) {
      state = states[suffix[1]]
      name = name.slice(0, -suffix[0].length)
    }
  }
  if (!name) return invalid()
  if (name === 'kck') {
    if (state && state !== 'KS') return invalid()
    name = 'kansas city'; state = 'KS'
  }
  if (name === 'kcmo') {
    if (state && state !== 'MO') return invalid()
    name = 'kansas city'; state = 'MO'
  }
  if (name === 'kc') name = 'kansas city'
  if (name === 'desoto') name = 'de soto'
  // Stilwell is an unincorporated postal community, absent from Census place points.
  if (name === 'stilwell' && (!state || state === 'KS')) {
    const point = zipPoints.find(([code]) => code === '66085')!
    return { ...placeMatch('Stilwell', 'KS', point[1], point[2]), zip: '66085' }
  }
  const exact = placePoints.filter(([place, region]) => normalize(place) === name && (!state || state === region))
  const matches = exact.length ? exact : name.length >= 3 ? placePoints.filter(([place, region]) => normalize(place).startsWith(name) && (!state || state === region)) : []
  if (matches.length === 1) return placeMatch(...matches[0])
  if (matches.length > 1) {
    return { kind: 'choose', label: 'Which location did you mean?', detail: 'Choose the matching town and state.', options: matches.slice(0, 8).map(([place, region]) => ({ label: `${place}, ${region}`, value: `${place}, ${region}` })) }
  }
  return { kind: 'unknown', label: 'Let’s check with the office', detail: 'We couldn’t match that town. Try its ZIP code, or call to confirm service for your address.' }
}

/** The booking form uses the same lookup and evidence as the standalone checker. */
export function locationMessage(value: string): string {
  const result = lookupServiceArea(value)
  return `${result.label}. ${result.detail}`
}
