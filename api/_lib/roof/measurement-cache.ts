/** Successful measurements shared between visits, separate from the spending counters. */
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Credit, LatLng, MeasuredRoof, SolarPotential } from '../../../src/demos/roofers/roof/types.js'
import { limiterStore, type LimiterStore } from '../limiter-store.js'
import { RoofError } from './http.js'
import { unmeteredAllowed, type MeasurementId } from './measurement.js'

const DAY_S = 86_400
const LOCK_S = 90
const VERSION = 'v1'

export interface CachedMeasurement {
  provider: string
  roof: MeasuredRoof
  credits: Credit[]
  measuredAt: string
  expiresAt: string
}

export interface MeasurementStore {
  get(key: string): Promise<CachedMeasurement | null>
  put(key: string, value: CachedMeasurement, ttlSeconds: number): Promise<void>
  acquire(key: string, token: string): Promise<boolean>
  release(key: string, token: string): Promise<void>
}

/** Instant Roofer retention is opt-in; neither provider may be configured beyond 30 days. */
export function cacheSecondsFor(provider: MeasurementId): number {
  const raw = process.env[provider === 'instant-roofer' ? 'ROOF_MEASURE_CACHE_DAYS' : 'GOOGLE_SOLAR_CACHE_DAYS']?.trim()
  const days = raw ? Number(raw) : provider === 'instant-roofer' ? 0 : 7
  return Number.isInteger(days) && days > 0 && days <= 30 ? days * DAY_S : 0
}

/** The optional building identity must already have been verified by the caller. */
export function measurementCacheKey(provider: MeasurementId, point: LatLng, buildingIdentity?: string): string {
  const quality = provider === 'google-solar'
    ? process.env.GOOGLE_SOLAR_QUALITY?.trim().toUpperCase() === 'HIGH' ? 'HIGH' : 'MEDIUM'
    : null
  const identity = buildingIdentity
    ? ['building', buildingIdentity]
    : ['point', point.lat.toFixed(5), point.lng.toFixed(5)]
  const digest = createHash('sha256').update(JSON.stringify([VERSION, provider, quality, identity])).digest('hex')
  return `roof-measure-cache:${VERSION}:${provider}:${digest}`
}

const busy = () => new RoofError('busy', 'measurement cache unavailable or invalid')
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const nonnegative = (value: unknown): value is number => finite(value) && value >= 0
const nullableNumber = (value: unknown) => value === null || finite(value)

function pointOf(value: unknown): LatLng {
  if (!object(value) || !finite(value.lat) || !finite(value.lng) || Math.abs(value.lat) > 90 || Math.abs(value.lng) > 180) throw busy()
  return { lat: value.lat, lng: value.lng }
}

/** Copy only measurement fields; arbitrary records, addresses and image URLs are never persisted. */
function solarOf(value: unknown): SolarPotential {
  if (!object(value)) throw busy()
  for (const name of ['maxPanels', 'panelWatts', 'panelHeightM', 'panelWidthM', 'maxKw', 'slopedPanels']) {
    if (!nonnegative(value[name])) throw busy()
  }
  if (!nullableNumber(value.yearlyKwh) || !nullableNumber(value.sunshineHours)) throw busy()
  if (!Array.isArray(value.panels) || !Array.isArray(value.configs) || !Array.isArray(value.slopedConfigs)) throw busy()
  const configs = (input: unknown[]) => input.map(item => {
    if (!object(item) || !nonnegative(item.panels) || !nonnegative(item.yearlyKwh)) throw busy()
    return { panels: item.panels, yearlyKwh: item.yearlyKwh }
  })
  return {
    maxPanels: value.maxPanels as number,
    panelWatts: value.panelWatts as number,
    panelHeightM: value.panelHeightM as number,
    panelWidthM: value.panelWidthM as number,
    maxKw: value.maxKw as number,
    slopedPanels: value.slopedPanels as number,
    yearlyKwh: value.yearlyKwh as number | null,
    sunshineHours: value.sunshineHours as number | null,
    panels: value.panels.map(item => {
      if (!object(item) || typeof item.portrait !== 'boolean' || !finite(item.azimuth) || !finite(item.pitch)) throw busy()
      return { center: pointOf(item.center), portrait: item.portrait, azimuth: item.azimuth, pitch: item.pitch }
    }),
    configs: configs(value.configs),
    slopedConfigs: configs(value.slopedConfigs),
  }
}

function roofOf(value: unknown): MeasuredRoof {
  if (!object(value) || !finite(value.roofSqFt) || value.roofSqFt <= 0 || !finite(value.footprintSqFt) || value.footprintSqFt <= 0 || !nonnegative(value.pitchRise)) throw busy()
  if (value.complexity !== null && (!Number.isInteger(value.complexity) || !finite(value.complexity) || value.complexity < 0 || value.complexity > 3)) throw busy()
  const confidence = value.confidence
  if (!object(confidence) || !nullableNumber(confidence.score) || ![null, 'High', 'Medium', 'Low'].includes(confidence.label as string | null)) throw busy()
  const roof: MeasuredRoof = {
    roofSqFt: value.roofSqFt,
    footprintSqFt: value.footprintSqFt,
    pitchRise: value.pitchRise,
    complexity: value.complexity as number | null,
    confidence: { score: confidence.score as number | null, label: confidence.label as MeasuredRoof['confidence']['label'] },
    point: pointOf(value.point),
  }
  for (const name of ['faces', 'capturedYear', 'capturedMonth'] as const) {
    if (value[name] !== undefined) {
      if (value[name] !== null && (!nonnegative(value[name]) || !Number.isInteger(value[name]))) throw busy()
      roof[name] = value[name] as number | null
    }
  }
  if (value.atPoint !== undefined) {
    if (value.atPoint !== null && typeof value.atPoint !== 'boolean') throw busy()
    roof.atPoint = value.atPoint as boolean | null
  }
  if (value.bounds !== undefined) {
    if (value.bounds === null) roof.bounds = null
    else {
      if (!object(value.bounds)) throw busy()
      roof.bounds = { sw: pointOf(value.bounds.sw), ne: pointOf(value.bounds.ne) }
      if (roof.bounds.sw.lat > roof.bounds.ne.lat || roof.bounds.sw.lng > roof.bounds.ne.lng) throw busy()
    }
  }
  if (value.solar !== undefined) roof.solar = value.solar === null ? null : solarOf(value.solar)
  return roof
}

/** Corruption is a store failure, never a miss that could silently buy the roof again. */
function measurementOf(value: unknown): CachedMeasurement {
  if (!object(value) || (value.provider !== 'instant-roofer' && value.provider !== 'google-solar')) throw busy()
  if (typeof value.measuredAt !== 'string' || typeof value.expiresAt !== 'string') throw busy()
  const measuredAt = Date.parse(value.measuredAt)
  const expiresAt = Date.parse(value.expiresAt)
  if (!Number.isFinite(measuredAt) || !Number.isFinite(expiresAt) || measuredAt > Date.now() + 60_000 || expiresAt <= measuredAt || expiresAt - measuredAt > 30 * DAY_S * 1000) throw busy()
  if (!Array.isArray(value.credits) || value.credits.length === 0) throw busy()
  const credits = value.credits.map(credit => {
    if (!object(credit) || typeof credit.text !== 'string' || !credit.text.trim() || credit.text.length > 500) throw busy()
    if (credit.href !== undefined && (typeof credit.href !== 'string' || !/^https:\/\//.test(credit.href) || credit.href.length > 2000)) throw busy()
    return credit.href === undefined ? { text: credit.text } : { text: credit.text, href: credit.href as string }
  })
  return { provider: value.provider, roof: roofOf(value.roof), credits, measuredAt: value.measuredAt, expiresAt: value.expiresAt }
}

function readMeasurement(raw: string): CachedMeasurement {
  try { return measurementOf(JSON.parse(raw)) } catch { throw busy() }
}

function prepare(value: CachedMeasurement, ttlSeconds: number) {
  const clean = measurementOf(value)
  const remaining = Math.floor((Date.parse(clean.expiresAt) - Date.now()) / 1000)
  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0 || remaining < 1) throw busy()
  return { value: clean, json: JSON.stringify(clean), ttl: Math.min(ttlSeconds, remaining) }
}

async function command(store: LimiterStore, args: Array<string | number>): Promise<unknown> {
  try {
    const response = await fetch(store.url, {
      method: 'POST',
      headers: { authorization: `Bearer ${store.token}`, 'content-type': 'application/json' },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(1500),
    })
    if (!response.ok) throw busy()
    const body: unknown = await response.json()
    if (!object(body) || body.error !== undefined || !Object.hasOwn(body, 'result')) throw busy()
    return body.result
  } catch { throw busy() }
}

const RELEASE = "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end"

function redisStore(store: LimiterStore): MeasurementStore {
  return {
    async get(key) {
      const raw = await command(store, ['GET', key])
      if (raw === null) return null
      if (typeof raw !== 'string') throw busy()
      const value = readMeasurement(raw)
      return Date.parse(value.expiresAt) <= Date.now() ? null : value
    },
    async put(key, value, ttlSeconds) {
      const { json, ttl } = prepare(value, ttlSeconds)
      if (await command(store, ['SET', key, json, 'EX', ttl]) !== 'OK') throw busy()
    },
    async acquire(key, token) {
      const result = await command(store, ['SET', `${key}:lock`, token, 'NX', 'EX', LOCK_S])
      if (result !== null && result !== 'OK') throw busy()
      return result === 'OK'
    },
    async release(key, token) {
      const result = await command(store, ['EVAL', RELEASE, 1, `${key}:lock`, token])
      if (result !== 0 && result !== 1) throw busy()
    },
  }
}

/** Development uses one Vite worker; these locks also span store wrappers and requests. */
const localLocks = new Map<string, { token: string; expires: number }>()
const localFiles = new Map<string, Promise<void>>()
const missing = (error: unknown) => object(error) && error.code === 'ENOENT'

function acquireLocal(key: string, token: string): boolean {
  const now = Date.now()
  for (const [name, lock] of localLocks) if (lock.expires <= now) localLocks.delete(name)
  if (localLocks.has(key)) return false
  localLocks.set(key, { token, expires: now + LOCK_S * 1000 })
  return true
}

function releaseLocal(key: string, token: string): void {
  if (localLocks.get(key)?.token === token) localLocks.delete(key)
}

/** Keep expiry cleanup from deleting a replacement written by another local request. */
function fileOperation<T>(path: string, run: () => Promise<T>): Promise<T> {
  const result = (localFiles.get(path) ?? Promise.resolve()).then(run)
  const settled = result.then(() => undefined, () => undefined)
  localFiles.set(path, settled)
  void settled.then(() => { if (localFiles.get(path) === settled) localFiles.delete(path) })
  return result
}

function localStore(): MeasurementStore {
  const directory = join(process.cwd(), 'output', 'roof-measure-cache')
  const pathOf = (key: string) => join(directory, `${createHash('sha256').update(key).digest('hex')}.json`)
  return {
    async get(key) {
      const path = pathOf(key)
      return fileOperation(path, async () => {
        try {
          const value = readMeasurement(await readFile(path, 'utf8'))
          if (Date.parse(value.expiresAt) > Date.now()) return value
          await unlink(path).catch(error => { if (!missing(error)) throw error })
          return null
        } catch (error) {
          if (missing(error)) return null
          throw busy()
        }
      })
    },
    async put(key, value, ttlSeconds) {
      const { value: clean, ttl } = prepare(value, ttlSeconds)
      // Redis expires independently of the payload; local files carry that shorter lifetime.
      const expiresAt = new Date(Math.min(Date.parse(value.expiresAt), Date.now() + ttl * 1000)).toISOString()
      const json = JSON.stringify({ ...clean, expiresAt })
      const path = pathOf(key)
      const temporary = `${path}.${randomUUID()}.tmp`
      await fileOperation(path, async () => {
        try {
          await mkdir(directory, { recursive: true, mode: 0o700 })
          await writeFile(temporary, json, { flag: 'wx', mode: 0o600 })
          await rename(temporary, path)
        } catch {
          await unlink(temporary).catch(() => undefined)
          throw busy()
        }
      })
    },
    async acquire(key, token) {
      return acquireLocal(pathOf(key), token)
    },
    async release(key, token) {
      releaseLocal(pathOf(key), token)
    },
  }
}

interface MemoryEntry {
  value: CachedMeasurement
  timer: ReturnType<typeof setTimeout> | null
}
const localMemory = new Map<string, MemoryEntry>()

/** Timers over about 25 days overflow in Node; re-arm until the original expiry. */
function expireMemory(key: string, entry: MemoryEntry): void {
  if (localMemory.get(key) !== entry) return
  const remaining = Date.parse(entry.value.expiresAt) - Date.now()
  if (remaining <= 0) {
    if (entry.timer) clearTimeout(entry.timer)
    localMemory.delete(key)
    return
  }
  entry.timer = setTimeout(() => expireMemory(key, entry), Math.min(remaining, 2_147_483_647))
  entry.timer.unref()
}

/** Google results never reach local disk, whose expiry cannot run while the server is off. */
function localMemoryStore(): MeasurementStore {
  return {
    async get(key) {
      const entry = localMemory.get(key)
      if (!entry) return null
      if (Date.parse(entry.value.expiresAt) <= Date.now()) {
        expireMemory(key, entry)
        return null
      }
      return readMeasurement(JSON.stringify(entry.value))
    },
    async put(key, value, ttlSeconds) {
      const { value: clean, ttl } = prepare(value, ttlSeconds)
      const previous = localMemory.get(key)
      if (previous?.timer) clearTimeout(previous.timer)
      const expiresAt = new Date(Math.min(Date.parse(clean.expiresAt), Date.now() + ttl * 1000)).toISOString()
      const entry: MemoryEntry = { value: { ...clean, expiresAt }, timer: null }
      localMemory.set(key, entry)
      expireMemory(key, entry)
    },
    async acquire(key, token) {
      return acquireLocal(`memory:${key}`, token)
    },
    async release(key, token) {
      releaseLocal(`memory:${key}`, token)
    },
  }
}

/** A configured but invalid or unreachable Redis store never falls back to local storage. */
export function getMeasurementStore(provider?: MeasurementId): MeasurementStore | null {
  const store = limiterStore()
  if (store) return redisStore(store)
  const configured = [
    ['RATE_LIMIT_REDIS_URL', 'RATE_LIMIT_REDIS_TOKEN'],
    ['KV_REST_API_URL', 'KV_REST_API_TOKEN'],
    ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
  ].some(([url, token]) => Boolean(process.env[url]?.trim() && process.env[token]?.trim()))
  if (configured || !unmeteredAllowed() || process.env.VERCEL) return null
  return provider === 'google-solar' ? localMemoryStore() : localStore()
}
