import type { LeadContext, LeadRoof } from '../roofers/lead'
import type { RoofAddress } from '../roofers/roof/types'

const STORAGE_KEY = 'estate-demo-roof-estimate-v1'
const MAX_AGE_MS = 24 * 60 * 60 * 1000

/** Estimator context only. Project answers and contact details are never stored. */
export interface EstateRoofEstimate {
  schemaVersion: 1
  createdAt: string
  ballpark: NonNullable<LeadContext['ballpark']>
  address: RoofAddress | null
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const number = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
const text = (value: unknown, max = 500): value is string => typeof value === 'string' && value.length <= max
const nullableText = (value: unknown): value is string | null => value === null || text(value)
const optionalText = (value: unknown): value is string | null | undefined => value === undefined || nullableText(value)

function readRoof(value: unknown): LeadRoof | null {
  if (!record(value) || typeof value.source !== 'string' || !['measured', 'outline', 'sample', 'home-size'].includes(value.source) ||
    !nullableText(value.address) || !number(value.footprintSqFt, 1, 10_000_000) || !number(value.roofSqFt, 1, 10_000_000) ||
    !number(value.squares, 0.01, 100_000) || !number(value.pitch, 0, 100) || !number(value.buildings, 1, 10_000) || !Number.isInteger(value.buildings) ||
    !optionalText(value.confidence) || !optionalText(value.measuredBy) || !optionalText(value.measuredAt) ||
    (value.measuredAt != null && !Number.isFinite(Date.parse(value.measuredAt))) ||
    (value.measuredPitch != null && !number(value.measuredPitch, 0, 100))) return null

  let solar: LeadRoof['solar']
  if (value.solar != null) {
    if (!record(value.solar) || !number(value.solar.kw, 0, 100_000) ||
      (value.solar.yearlyKwh !== null && !number(value.solar.yearlyKwh, 0, 100_000_000))) return null
    solar = { kw: value.solar.kw, yearlyKwh: value.solar.yearlyKwh }
  } else solar = value.solar as null | undefined

  const source = value.source as LeadRoof['source']
  return {
    source, address: source === 'sample' || source === 'home-size' ? null : value.address,
    footprintSqFt: value.footprintSqFt, roofSqFt: value.roofSqFt, squares: value.squares,
    pitch: value.pitch, buildings: value.buildings, confidence: value.confidence,
    measuredBy: value.measuredBy, measuredAt: value.measuredAt,
    measuredPitch: value.measuredPitch as LeadRoof['measuredPitch'], solar,
  }
}

function parseContext(value: unknown): EstateRoofEstimate | null {
  if (!record(value) || value.schemaVersion !== 1 || !text(value.createdAt) || !record(value.ballpark)) return null
  const age = Date.now() - Date.parse(value.createdAt)
  if (!Number.isFinite(age) || age < -60_000 || age > MAX_AGE_MS) return null
  const raw = value.ballpark
  if (!number(raw.low, 0, 100_000_000) || !number(raw.high, raw.low, 100_000_000) || !text(raw.summary, 1_000)) return null
  const roof = raw.roof == null ? null : readRoof(raw.roof)
  if (raw.roof != null && !roof) return null
  let address: RoofAddress | null = null
  if ((roof?.source === 'outline' || roof?.source === 'measured') && value.address != null) {
    const candidate = value.address
    if (!record(candidate) || !text(candidate.formatted) || !nullableText(candidate.street) ||
      !nullableText(candidate.city) || !nullableText(candidate.state) || !nullableText(candidate.zip)) return null
    address = { formatted: candidate.formatted, street: candidate.street, city: candidate.city, state: candidate.state, zip: candidate.zip }
  }
  return { schemaVersion: 1, createdAt: value.createdAt, ballpark: { low: raw.low, high: raw.high, summary: raw.summary, roof }, address }
}

/** Call only from the visitor's explicit continue-to-brief action. */
export function saveRoofEstimate(ballpark: NonNullable<LeadContext['ballpark']>, address: RoofAddress | null): boolean {
  const context = parseContext({ schemaVersion: 1, createdAt: new Date().toISOString(), ballpark, address })
  if (!context) { clearRoofEstimate(); return false }
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context)); return true } catch { clearRoofEstimate(); return false }
}

export function readRoofEstimate(): EstateRoofEstimate | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const context = parseContext(JSON.parse(raw))
    if (!context) clearRoofEstimate()
    return context
  } catch { clearRoofEstimate(); return null }
}

export function clearRoofEstimate(): void {
  try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* Storage can be disabled. */ }
}
