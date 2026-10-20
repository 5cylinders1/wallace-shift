/**
 * Planning ranges for a fictional Kansas City cabinetmaker. Illustrative only,
 * never a quote. Set against public 2025 national data (sources in
 * docs/demos/cabinetry.md): custom cabinetry at roughly $500–$1,200 per linear
 * foot, and Remodeling's 2025 Cost vs. Value averages of $82,793 for a major
 * midrange kitchen remodel and $164,104 for an upscale one. Tambour's
 * per-foot figures sit at the upper end because every job is fully custom.
 */
export type RoomId = 'kitchen' | 'primary-bath' | 'small-bath' | 'built-ins'
export type TierId = 'painted' | 'inset' | 'veneer'
export type ScopeId = 'cabinetry' | 'surfaces' | 'remodel'

export interface Option<T extends string> { id: T; label: string; detail: string }
interface Size { id: string; label: string; detail: string; feet: number }

export const roomOptions: Option<RoomId>[] = [
  { id: 'kitchen', label: 'Kitchen', detail: 'Perimeter, island, pantry' },
  { id: 'primary-bath', label: 'Primary bath', detail: 'Vanities, linen, built-in tub' },
  { id: 'small-bath', label: 'Guest or powder bath', detail: 'One vanity, one room' },
  { id: 'built-ins', label: 'Built-ins', detail: 'Closets, libraries, laundry' },
]

export const sizes: Record<RoomId, Size[]> = {
  kitchen: [
    { id: 'compact', label: 'Compact', detail: 'About 18 ft of cabinetry, no island', feet: 18 },
    { id: 'family', label: 'Family', detail: 'About 28 ft plus an island', feet: 34 },
    { id: 'large', label: 'Large', detail: 'About 38 ft, an island and a pantry wall', feet: 46 },
    { id: 'estate', label: 'Estate', detail: 'Two islands or a scullery, 50 ft or more', feet: 60 },
  ],
  'primary-bath': [
    { id: 'standard', label: 'Standard', detail: 'A 6 ft vanity and a linen cabinet', feet: 10 },
    { id: 'double', label: 'Double', detail: 'Double vanity, linen tower, makeup desk', feet: 16 },
    { id: 'suite', label: 'Suite', detail: 'Separate vanities and a built-in tub surround', feet: 24 },
  ],
  'small-bath': [
    { id: 'powder', label: 'Powder room', detail: 'A floating or furniture vanity', feet: 4 },
    { id: 'guest', label: 'Guest bath', detail: 'Vanity plus storage above the toilet', feet: 7 },
  ],
  'built-ins': [
    { id: 'wall', label: 'One wall', detail: 'About 10 ft: a library or media wall', feet: 10 },
    { id: 'room', label: 'One room', detail: 'About 24 ft: a closet or laundry room', feet: 24 },
    { id: 'suite', label: 'Dressing suite', detail: 'About 40 ft with a drawer island', feet: 40 },
  ],
}

export const tiers: (Option<TierId> & { perFoot: [number, number] })[] = [
  { id: 'painted', label: 'Painted shaker', detail: 'Overlay doors in conversion-varnish paint', perFoot: [900, 1250] },
  { id: 'inset', label: 'Inset', detail: 'Doors set inside the frame, painted or stained', perFoot: [1200, 1700] },
  { id: 'veneer', label: 'Rift oak or walnut', detail: 'Sequence-matched veneer, slab or fluted', perFoot: [1400, 2100] },
]

export const scopes: (Option<ScopeId> & { rooms: RoomId[] })[] = [
  { id: 'cabinetry', label: 'Cabinetry only', detail: 'Designed, built and installed by us', rooms: ['kitchen', 'primary-bath', 'small-bath', 'built-ins'] },
  { id: 'surfaces', label: 'Cabinetry and surfaces', detail: 'Plus counters, backsplash and lighting', rooms: ['kitchen', 'primary-bath', 'small-bath', 'built-ins'] },
  { id: 'remodel', label: 'Full remodel', detail: 'Demolition, plumbing, electrical, tile, floors', rooms: ['kitchen', 'primary-bath', 'small-bath'] },
]

/** Counters, backsplash and lighting for a reference size, scaled by footage. */
const SURFACES: Record<RoomId, { range: [number, number]; reference: number }> = {
  kitchen: { range: [16000, 38000], reference: 34 },
  'primary-bath': { range: [9000, 24000], reference: 16 },
  'small-bath': { range: [3500, 9000], reference: 5 },
  'built-ins': { range: [2500, 8000], reference: 24 },
}
/** Everything else in a full remodel, as a multiple of cabinetry and surfaces. */
const REMODEL: Record<RoomId, [number, number]> = { kitchen: [1.55, 1.85], 'primary-bath': [1.9, 2.3], 'small-bath': [2.0, 2.5], 'built-ins': [1, 1] }

export interface Estimate {
  low: number
  high: number
  parts: { label: string; low: number; high: number }[]
  weeks: { label: string; value: string }[]
}

const round = (value: number) => Math.round(value / 500) * 500

export function estimate(room: RoomId, sizeId: string, tier: TierId, scope: ScopeId): Estimate {
  const size = sizes[room].find(item => item.id === sizeId) ?? sizes[room][0]
  const perFoot = tiers.find(item => item.id === tier)!.perFoot
  const cabinetry: [number, number] = [size.feet * perFoot[0], size.feet * perFoot[1]]
  const parts = [{ label: 'Cabinetry', low: round(cabinetry[0]), high: round(cabinetry[1]) }]
  let low = cabinetry[0]
  let high = cabinetry[1]
  if (scope !== 'cabinetry') {
    const surfaces = SURFACES[room]
    const scale = Math.sqrt(size.feet / surfaces.reference)
    parts.push({ label: 'Counters, backsplash, lighting', low: round(surfaces.range[0] * scale), high: round(surfaces.range[1] * scale) })
    low += surfaces.range[0] * scale
    high += surfaces.range[1] * scale
  }
  if (scope === 'remodel') {
    const [a, b] = REMODEL[room]
    parts.push({ label: 'Trades, materials and finishes', low: round(low * (a - 1)), high: round(high * (b - 1)) })
    low *= a
    high *= b
  }
  const shop = Math.round(8 + size.feet / 15)
  const weeks = [
    { label: 'Design', value: '3–5 weeks' },
    { label: 'Workshop', value: `${shop}–${shop + 3} weeks` },
    { label: 'Installation', value: scope === 'remodel' ? (room === 'kitchen' ? '6–10 weeks with trades' : '4–7 weeks with trades') : size.feet > 30 ? '2–3 weeks' : '1–2 weeks' },
  ]
  return { low: round(low), high: round(high), parts, weeks }
}

export const money = (value: number) => `$${value.toLocaleString('en-US')}`
export const moneyShort = (value: number) => value >= 1000 ? `$${Math.round(value / 1000)}k` : `$${value}`

/** Worked examples for the home page, from the same model as the planner. */
export const examples: { label: string; note: string; args: [RoomId, string, TierId, ScopeId] }[] = [
  { label: 'Family kitchen, painted shaker cabinetry', note: 'Designed, built and installed', args: ['kitchen', 'family', 'painted', 'cabinetry'] },
  { label: 'Large kitchen remodel, inset cabinetry', note: 'Counters, tile, lighting, trades', args: ['kitchen', 'large', 'inset', 'remodel'] },
  { label: 'Primary bath remodel, double vanity', note: 'Vanities, linen tower, shower, tile', args: ['primary-bath', 'double', 'inset', 'remodel'] },
  { label: 'Walk-in dressing room in rift oak', note: 'Cabinetry and lighting', args: ['built-ins', 'suite', 'veneer', 'surfaces'] },
]
