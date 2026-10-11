/**
 * A server-signed open-data footprint lets different pins on the same
 * building share a measurement. It grants no permission to call a provider:
 * the endpoint still applies its provider, cache-policy and spending checks.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import type { FootprintBuilding, LatLng } from '../../../src/demos/roofers/roof/types.js'
import type { MeasurementId } from './measurement.js'
import { pointInRing, type Point } from './polygon.js'

const PREFIX = 'rm1'
const MAX_TOKEN_LENGTH = 8192
const MAX_RING_POINTS = 120

interface BuildingIdentity {
  v: 1
  provider: MeasurementId
  source: string
  id: string
  /** Longitude, latitude pairs; closed implicitly. */
  ring: Point[]
}

function secretFor(provider: MeasurementId): Buffer | null {
  const apiKey = provider === 'instant-roofer'
    ? process.env.INSTANT_ROOFER_API_KEY?.trim()
    : provider === 'google-solar' ? process.env.GOOGLE_SOLAR_API_KEY?.trim() : undefined
  return apiKey
    ? createHmac('sha256', apiKey).update(`roof-measurement-building/v1:${provider}`).digest()
    : null
}

function validCoordinate(lat: unknown, lng: unknown): boolean {
  return typeof lat === 'number' && Number.isFinite(lat) && Math.abs(lat) <= 90
    && typeof lng === 'number' && Number.isFinite(lng) && Math.abs(lng) <= 180
}

/** Canonical order keeps identity stable when a dataset reverses/restarts a ring. */
function canonicalRing(points: Point[]): Point[] {
  const ring = points.slice()
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first[0] === last[0] && first[1] === last[1]) ring.pop()
  let best: Point[] = ring
  let bestText = JSON.stringify(best)
  for (const direction of [ring, ring.slice().reverse()]) {
    for (let index = 0; index < direction.length; index += 1) {
      const candidate = [...direction.slice(index), ...direction.slice(0, index)]
      const candidateText = JSON.stringify(candidate)
      if (candidateText < bestText) {
        best = candidate
        bestText = candidateText
      }
    }
  }
  return best
}

function readIdentity(value: unknown, provider: MeasurementId): BuildingIdentity | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Partial<BuildingIdentity>
  if (raw.v !== 1 || raw.provider !== provider) return null
  if (typeof raw.source !== 'string' || !raw.source.trim() || raw.source.length > 256) return null
  if (typeof raw.id !== 'string' || !raw.id.trim() || raw.id.length > 512) return null
  if (!Array.isArray(raw.ring) || raw.ring.length < 3 || raw.ring.length > MAX_RING_POINTS) return null
  if (raw.ring.some((point) => !Array.isArray(point) || point.length !== 2 || !validCoordinate(point[1], point[0]))) return null
  const ring = canonicalRing(raw.ring)
  if (ring.length < 3 || new Set(ring.map((point) => JSON.stringify(point))).size < 3) return null

  // A planar ring crossing the date line would describe the wrong interior.
  // Such unusual geometry can still use the endpoint's exact-pin cache.
  const longitudes = ring.map(([lng]) => lng)
  if (Math.max(...longitudes) - Math.min(...longitudes) > 180) return null
  const [originX, originY] = ring[0]
  let twiceArea = 0
  for (let index = 0; index < ring.length; index += 1) {
    const [x1, y1] = ring[index]
    const [x2, y2] = ring[(index + 1) % ring.length]
    twiceArea += (x1 - originX) * (y2 - originY) - (x2 - originX) * (y1 - originY)
  }
  if (twiceArea === 0) return null
  return { v: 1, provider, source: raw.source, id: raw.id, ring }
}

const signatureOf = (secret: Buffer, payload: string): Buffer =>
  createHmac('sha256', secret).update(`${PREFIX}.${payload}`).digest()

export function signMeasurementBuilding(
  provider: MeasurementId,
  source: string,
  building: FootprintBuilding,
): string | undefined {
  const secret = secretFor(provider)
  if (!secret || !building || !Array.isArray(building.ring)) return undefined
  if (building.ring.some((point) => !point || !validCoordinate(point.lat, point.lng))) return undefined
  const identity = readIdentity({
    v: 1,
    provider,
    source,
    id: building.id,
    ring: building.ring.map(({ lng, lat }) => [lng, lat]),
  }, provider)
  if (!identity) return undefined
  const payload = Buffer.from(JSON.stringify(identity)).toString('base64url')
  const token = `${PREFIX}.${payload}.${signatureOf(secret, payload).toString('base64url')}`
  return token.length <= MAX_TOKEN_LENGTH ? token : undefined
}

/** Returns an opaque cache identity only for a pin inside the signed footprint. */
export function verifyMeasurementBuilding(
  token: string | null,
  provider: MeasurementId,
  point: LatLng,
): string | null {
  if (typeof token !== 'string' || token.length > MAX_TOKEN_LENGTH || !point || !validCoordinate(point.lat, point.lng)) return null
  const secret = secretFor(provider)
  if (!secret) return null
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== PREFIX) return null
  const [, payload, signature] = parts
  if (!/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return null
  const given = Buffer.from(signature, 'base64url')
  const expected = signatureOf(secret, payload)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  const identity = readIdentity(parsed, provider)
  if (!identity || !pointInRing([point.lng, point.lat], identity.ring)) return null

  // Boundary pins may belong to adjoining buildings. Fall back to exact-pin
  // identity instead of merging them merely because ray casting includes an edge.
  for (let index = 0; index < identity.ring.length; index += 1) {
    const [ax, ay] = identity.ring[index]
    const [bx, by] = identity.ring[(index + 1) % identity.ring.length]
    const cross = (point.lng - ax) * (by - ay) - (point.lat - ay) * (bx - ax)
    if (cross === 0 && point.lng >= Math.min(ax, bx) && point.lng <= Math.max(ax, bx)
      && point.lat >= Math.min(ay, by) && point.lat <= Math.max(ay, by)) return null
  }
  // Include geometry as well as dataset/id, so a revised footprint cannot
  // silently inherit an older building's result.
  return `building:${createHash('sha256').update(JSON.stringify(identity)).digest('hex')}`
}
