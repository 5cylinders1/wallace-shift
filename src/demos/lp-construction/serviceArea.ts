import { EDGE_ZIPS, INSIDE_ZIPS } from './serviceAreaZips.js'

export type AreaResult = 'inside' | 'edge' | 'outside' | 'unknown' | 'invalid'

/** Three-digit prefixes of the Kansas City metro. A metro ZIP missing from the
 * Census list (often a P.O. box ZIP) can't be placed, so it gets "call us". */
const METRO_PREFIXES = ['640', '641', '660', '661', '662']
const inside = new Set(INSIDE_ZIPS)
const edge = new Set(EDGE_ZIPS)
const known = new Set([...INSIDE_ZIPS, ...EDGE_ZIPS])

export function cleanZip(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 5)
}

export function checkZip(raw: string): AreaResult {
  const zip = cleanZip(raw)
  if (zip.length !== 5) return 'invalid'
  if (inside.has(zip)) return 'inside'
  if (edge.has(zip)) return 'edge'
  if (!known.has(zip) && METRO_PREFIXES.includes(zip.slice(0, 3))) return 'unknown'
  return 'outside'
}
