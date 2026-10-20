/**
 * Datum's repairs and planning ranges. Every figure here is an illustrative
 * planning range for a fictional contractor, chosen to sit inside the spread
 * of published 2026 cost guides (see docs/demos/foundation-research.md).
 * They are not quotes. A real contractor replaces them.
 */

export type RepairId = 'extension' | 'regrade' | 'drain' | 'battery' | 'membrane' | 'injection' | 'straps' | 'anchors' | 'braces' | 'piers' | 'helical'

export interface Repair {
  id: RepairId
  name: string
  /** What it fixes, in a line. */
  fixes: string
  low: number
  high: number
  unit: string
  /** Relative cost band for quick comparison: 1 cheapest to 4. */
  band: 1 | 2 | 3 | 4
}

export const repairs: Record<RepairId, Repair> = {
  extension: { id: 'extension', name: 'Downspout extensions', fixes: 'Roof water landing beside the wall', low: 40, high: 160, unit: 'per downspout', band: 1 },
  regrade: { id: 'regrade', name: 'Regrading', fixes: 'Soil that slopes toward the house', low: 800, high: 3500, unit: 'per side', band: 2 },
  drain: { id: 'drain', name: 'Interior drain and sump', fixes: 'Water entering at the floor joint', low: 4000, high: 11000, unit: 'typical basement', band: 3 },
  battery: { id: 'battery', name: 'Battery backup pump', fixes: 'A sump that stops when the power does', low: 600, high: 1400, unit: 'per pump', band: 1 },
  membrane: { id: 'membrane', name: 'Exterior membrane and footing drain', fixes: 'Water reaching the outside of the wall', low: 12000, high: 30000, unit: 'per side', band: 4 },
  injection: { id: 'injection', name: 'Crack injection', fixes: 'A stable crack that lets water in', low: 400, high: 900, unit: 'per crack', band: 1 },
  straps: { id: 'straps', name: 'Carbon fiber straps', fixes: 'A wall that has cracked or started to bow', low: 3500, high: 9000, unit: 'per wall', band: 3 },
  anchors: { id: 'anchors', name: 'Wall anchors', fixes: 'A wall pushed in by the soil outside', low: 4000, high: 12000, unit: 'per wall', band: 3 },
  braces: { id: 'braces', name: 'Steel wall braces', fixes: 'A bowed wall where anchors will not fit', low: 4000, high: 10000, unit: 'per wall', band: 3 },
  piers: { id: 'piers', name: 'Push piers', fixes: 'A corner that has settled', low: 1200, high: 2800, unit: 'per pier', band: 4 },
  helical: { id: 'helical', name: 'Helical piers', fixes: 'Settlement under lighter structures', low: 1500, high: 3200, unit: 'per pier', band: 4 },
}

export const PRICE_NOTE = 'Illustrative planning ranges for this concept, not quotes. A real contractor sets its own.'

export function money(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`
}

export function range(repair: Repair): string {
  return `${money(repair.low)}–${money(repair.high)} ${repair.unit}`
}

export const bandLabel = (band: number) => '$'.repeat(band)
