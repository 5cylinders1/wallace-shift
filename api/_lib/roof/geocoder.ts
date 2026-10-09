/**
 * Address search: type-ahead suggestions, and the one result the homeowner
 * picks, as a point we can test against building outlines.
 *
 * Behind an interface so the provider can change without touching the
 * endpoints or the page. The default is Geoapify: its published FAQ says
 * results may be kept with their data credit and used with other
 * providers' maps and data, while Mapbox's and Google's terms restrict at
 * least one of those. Its formal terms still need confirming before a
 * contractor launches (see docs/roofing-demo.md).
 *
 *   GEOAPIFY_API_KEY   Server-side only; never give it a VITE_ prefix.
 *   ROOF_SEARCH_BIAS   Optional "lng,lat" of the contractor's service area.
 *                      Ranks nearby addresses first; it never filters.
 */

import type { AddressSuggestion, Credit, LatLng, LocationPrecision, RoofAddress } from '../../../src/demos/roofers/roof/types.js'
import { RoofError, fetchJson, type Deadline } from './http.js'

export interface GeocodedAddress {
  address: RoofAddress
  location: LatLng
  precision: LocationPrecision
  credits: Credit[]
}

export interface Geocoder {
  suggest(text: string, bias: LatLng | null): Promise<{ suggestions: AddressSuggestion[]; credits: Credit[] }>
  /** Turns a suggestion id back into a point; null when the id is not ours. */
  resolve(id: string): Promise<GeocodedAddress | null>
  /** Free-text search for when no suggestion was picked; null when nothing matches. */
  search(text: string, bias: LatLng | null, deadline?: Deadline): Promise<GeocodedAddress | null>
}

const GEOAPIFY = 'https://api.geoapify.com/v1/geocode'
const POWERED_BY: Credit = { text: 'Powered by Geoapify', href: 'https://www.geoapify.com/' }

/** Credits for the open datasets Geoapify draws on, as each licence words them. */
const SOURCE_CREDITS: Record<string, Credit> = {
  openstreetmap: { text: '© OpenStreetMap contributors', href: 'https://www.openstreetmap.org/copyright' },
  openaddresses: { text: '© OpenAddresses contributors', href: 'https://openaddresses.io/' },
  whosonfirst: { text: 'Who’s On First', href: 'https://whosonfirst.org/docs/licenses/' },
  geonames: { text: 'GeoNames', href: 'https://www.geonames.org/' },
}

interface GeoapifyResult {
  lat?: number
  lon?: number
  formatted?: string
  address_line1?: string
  address_line2?: string
  housenumber?: string
  street?: string
  city?: string
  town?: string
  village?: string
  state_code?: string
  postcode?: string
  country_code?: string
  result_type?: string
  rank?: { confidence?: number; confidence_building_level?: number; confidence_street_level?: number }
  datasource?: { sourcename?: string }
}

/** What a suggestion id carries, so picking one costs no second call. */
interface Packed {
  v: 1
  lat: number
  lng: number
  f: string
  s: string | null
  c: string | null
  t: string | null
  z: string | null
  p: LocationPrecision
  d: string | null
}

const PRECISIONS: LocationPrecision[] = ['rooftop', 'parcel', 'street', 'unknown']
const MAX_FIELD = 160

const text = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/\s+/g, ' ').trim()
  return cleaned && cleaned.length <= MAX_FIELD ? cleaned : null
}

/**
 * Only a building-level match is a point on (or in) the house. Geoapify's
 * own samples show `result_type: "building"` on points snapped to the
 * street line, so the type alone is not trusted.
 */
function precisionOf(result: GeoapifyResult): LocationPrecision {
  const rank = result.rank ?? {}
  if (rank.confidence_building_level === 1) return result.datasource?.sourcename === 'openaddresses' ? 'parcel' : 'rooftop'
  if (rank.confidence_building_level === 0 || rank.confidence_street_level === 1) return 'street'
  return 'unknown'
}

/** A house we can look up: a numbered address or a building, not a city, ZIP or whole street. */
const isPlace = (result: GeoapifyResult) =>
  result.country_code === 'us' &&
  Number.isFinite(result.lat) &&
  Number.isFinite(result.lon) &&
  (Boolean(text(result.housenumber)) || result.result_type === 'building')

function toPacked(result: GeoapifyResult): Packed {
  const street = text(result.address_line1) ?? ([text(result.housenumber), text(result.street)].filter(Boolean).join(' ') || null)
  return {
    v: 1,
    lat: result.lat as number,
    lng: result.lon as number,
    f: text(result.formatted)?.replace(/, United States( of America)?$/, '') ?? street ?? 'Selected address',
    s: street,
    c: text(result.city) ?? text(result.town) ?? text(result.village),
    t: text(result.state_code)?.toUpperCase() ?? null,
    z: text(result.postcode),
    p: precisionOf(result),
    d: text(result.datasource?.sourcename),
  }
}

/** Own keys only: an id can't reach `constructor` or `__proto__` through this. */
const sourceCredit = (name: string | null) => (name && Object.hasOwn(SOURCE_CREDITS, name) ? SOURCE_CREDITS[name] : undefined)

function fromPacked(packed: Packed): GeocodedAddress {
  const source = sourceCredit(packed.d)
  return {
    address: { formatted: packed.f, street: packed.s, city: packed.c, state: packed.t, zip: packed.z },
    location: { lat: packed.lat, lng: packed.lng },
    precision: packed.p,
    credits: [POWERED_BY, ...(source ? [source] : [])],
  }
}

const encode = (packed: Packed) => `g1.${Buffer.from(JSON.stringify(packed)).toString('base64url')}`

/** Ids round-trip through the browser, so everything in one is re-validated. */
function decode(id: string): Packed | null {
  if (!id.startsWith('g1.') || id.length > 1200) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(id.slice(3), 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const raw = parsed as Partial<Packed>
  const optional = (value: unknown) => (value === null ? null : text(value))
  const lat = raw.lat
  const lng = raw.lng
  if (typeof lat !== 'number' || typeof lng !== 'number' || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  const formatted = text(raw.f)
  if (!formatted || !PRECISIONS.includes(raw.p as LocationPrecision)) return null
  return {
    v: 1,
    lat,
    lng,
    f: formatted,
    s: optional(raw.s),
    c: optional(raw.c),
    t: optional(raw.t),
    z: optional(raw.z),
    p: raw.p as LocationPrecision,
    d: typeof raw.d === 'string' && sourceCredit(raw.d) ? raw.d : null,
  }
}

function geoapify(apiKey: string): Geocoder {
  const call = async (path: 'autocomplete' | 'search', query: string, bias: LatLng | null, limit: number, deadline?: Deadline) => {
    const params = new URLSearchParams({ text: query, filter: 'countrycode:us', lang: 'en', limit: String(limit), format: 'json', apiKey })
    if (bias) params.set('bias', `proximity:${bias.lng.toFixed(4)},${bias.lat.toFixed(4)}`)
    const body = (await fetchJson(`${GEOAPIFY}/${path}?${params}`, { timeoutMs: path === 'autocomplete' ? 4000 : 6000, deadline })) as {
      results?: GeoapifyResult[]
    }
    if (!body || !Array.isArray(body.results)) throw new RoofError('upstream', 'geoapify: no results array')
    return body.results.filter(isPlace)
  }

  return {
    async suggest(query, bias) {
      const results = await call('autocomplete', query, bias, 6)
      const seen = new Set<string>()
      const suggestions: AddressSuggestion[] = []
      const sources = new Set<string>()
      for (const result of results) {
        const packed = toPacked(result)
        if (seen.has(packed.f)) continue
        seen.add(packed.f)
        if (packed.d) sources.add(packed.d)
        const primary = packed.s ?? packed.f
        const secondary = [packed.c, [packed.t, packed.z].filter(Boolean).join(' ')].filter(Boolean).join(', ')
        suggestions.push({ id: encode(packed), primary, secondary })
        if (suggestions.length === 5) break
      }
      const credits = [POWERED_BY, ...[...sources].map(sourceCredit).filter((credit): credit is Credit => Boolean(credit))]
      return { suggestions, credits }
    },
    async resolve(id) {
      const packed = decode(id)
      return packed ? fromPacked(packed) : null
    },
    async search(query, bias, deadline) {
      const [first] = await call('search', query, bias, 1, deadline)
      return first ? fromPacked(toPacked(first)) : null
    },
  }
}

export function parseBias(value: string | undefined): LatLng | null {
  const [lng, lat] = (value ?? '').split(',').map(Number)
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0) ? { lat, lng } : null
}

/** Null while no provider key is set: the endpoints report `not_configured`. */
export function geocoderFromEnv(): Geocoder | null {
  const key = process.env.GEOAPIFY_API_KEY
  return key ? geoapify(key) : null
}
