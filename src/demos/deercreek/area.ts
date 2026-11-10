import { business } from './content'
import { placePoints, zipPoints } from './areaData'

/** Distance bands from the Olathe shop. Deer Creek's stated area is "the
 * Kansas City metropolitan area"; these radii are a proposal for Beau to
 * confirm (docs/demos/deercreek.md). */
export const AREA = { coreMiles: 30, edgeMiles: 45 } as const

export type Band = 'core' | 'edge' | 'outside'

export interface Located {
  kind: 'found'
  label: string
  lat: number
  lon: number
  miles: number
  band: Band
}
export type Lookup =
  | Located
  | { kind: 'choose'; options: Located[] }
  | { kind: 'unknown-zip'; zip: string }
  | { kind: 'not-found'; query: string }
  | { kind: 'empty' }

export function milesFromShop(lat: number, lon: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat - business.lat)
  const dLon = toRad(lon - business.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(business.lat)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2
  return 2 * 3958.8 * Math.asin(Math.sqrt(h))
}

export const bandFor = (miles: number): Band => (miles <= AREA.coreMiles ? 'core' : miles <= AREA.edgeMiles ? 'edge' : 'outside')

export function locate(label: string, lat: number, lon: number): Located {
  const miles = milesFromShop(lat, lon)
  return { kind: 'found', label, lat, lon, miles, band: bandFor(miles) }
}

const STATES: Record<string, string> = { ks: 'KS', kansas: 'KS', mo: 'MO', missouri: 'MO' }

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[’'`.]/g, '')
    .replace(/\bsaint\b/g, 'st')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Resolve a ZIP code or a town name ("Lenexa", "Lee's Summit, MO"). */
export function lookupArea(query: string): Lookup {
  const raw = query.trim()
  if (!raw) return { kind: 'empty' }

  const zip = raw.match(/^\d{5}(?:-\d{4})?$/)?.[0]?.slice(0, 5)
  if (zip) {
    const point = zipPoints.find(([code]) => code === zip)
    return point ? locate(`ZIP ${zip}`, point[1], point[2]) : { kind: 'unknown-zip', zip }
  }

  const [namePart, statePart] = raw.split(',').map(part => part.trim())
  let name = normalize(namePart ?? '')
  let state = statePart ? STATES[normalize(statePart)] : undefined
  if (!state) {
    const trailing = name.match(/\s(ks|mo|kansas|missouri)$/)
    if (trailing) {
      state = STATES[trailing[1]]
      name = name.slice(0, -trailing[0].length).trim()
    }
  }
  if (!name) return { kind: 'not-found', query: raw }

  const matches = placePoints.filter(([placeName, placeState]) => normalize(placeName) === name && (!state || placeState === state))
  const partial = matches.length ? matches : placePoints.filter(([placeName, placeState]) => normalize(placeName).startsWith(name) && name.length >= 3 && (!state || placeState === state))
  const options = partial
    .map(([placeName, placeState, lat, lon]) => locate(`${placeName}, ${placeState}`, lat, lon))
    .sort((a, b) => a.miles - b.miles)
    .slice(0, 6)
  if (options.length === 1) return options[0]
  if (options.length > 1) return { kind: 'choose', options }
  return { kind: 'not-found', query: raw }
}

/** The communities listed on the service-area page, nearest first. */
export function communitiesWithin(miles: number) {
  return placePoints
    .map(([name, state, lat, lon]) => ({ name, state, miles: milesFromShop(lat, lon) }))
    .filter(place => place.miles <= miles)
    .sort((a, b) => a.miles - b.miles)
}
