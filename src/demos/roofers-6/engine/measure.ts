import type { RoofConfig } from '../catalog'

/* The sample home: a two-storey modern farmhouse with an attached garage
 * and a covered porch. Units are metres; the front faces +z. */
export const MAIN = { x0: -7.2, x1: 7.2, z0: -4.2, z1: 4.2, base: 0.4, eave: 6.0, overhang: 0.55 }
export const GARAGE = { x0: 7.2, x1: 13.6, z0: -2.8, z1: 4.0, eave: 3.2, overhang: 0.45 }
export const PORCH = { x0: -5.0, x1: 1.6, z0: 4.2, z1: 6.5, top: 3.45, pitch: 3, overhang: 0.3 }
export const CHIMNEY = { x0: -2.9, x1: -1.9, z0: 0.35, z1: 1.25 }

export interface RoofMetrics {
  areaFt2: number
  squares: number
  mainFt2: number
  garageFt2: number
  porchFt2: number
  ridgeFt: number
  eaveFt: number
  pitch: number
  garagePitch: number
}

const FT2 = 10.7639
const FT = 3.28084

/** The garage roof stays under the main eave, so steep main roofs flatten it. */
export function garagePitchFor(pitch: number): number {
  const s = pitch / 12
  const limit = (MAIN.eave - MAIN.overhang * s - 0.32 - GARAGE.eave) / ((GARAGE.z1 - GARAGE.z0) / 2)
  return Math.min(pitch, Math.max(3, limit * 12))
}

/**
 * Exact areas without building any geometry. Every plane of a roof with a
 * single pitch covers its plan area times the secant of that pitch, so a
 * hip and a gable over the same footprint measure the same.
 */
export function measureRoof(config: RoofConfig): RoofMetrics {
  const s = config.pitch / 12
  const secant = (slope: number) => Math.sqrt(1 + slope * slope)
  const o = MAIN.overhang
  const w = MAIN.x1 - MAIN.x0 + 2 * o
  const d = MAIN.z1 - MAIN.z0 + 2 * o
  const main = w * d * secant(s)

  const gp = garagePitchFor(config.pitch)
  const gs = gp / 12
  const gw = GARAGE.x1 - GARAGE.x0 + GARAGE.overhang
  const gd = GARAGE.z1 - GARAGE.z0 + 2 * GARAGE.overhang
  const garage = gw * gd * secant(gs)

  const pw = PORCH.x1 - PORCH.x0 + 2 * PORCH.overhang
  const pd = PORCH.z1 - PORCH.z0 + PORCH.overhang
  const porch = pw * pd * secant(PORCH.pitch / 12)

  const run = d / 2
  const ridge = config.style === 'hip'
    ? Math.max(0, w - d) + 4 * run * Math.sqrt(2 + s * s)
    : w
  const eaves = 2 * w + (config.style === 'hip' ? d : 0) + 2 * gw + pw
  const area = main + garage + porch
  return {
    areaFt2: area * FT2,
    squares: (area * FT2) / 100,
    mainFt2: main * FT2,
    garageFt2: garage * FT2,
    porchFt2: porch * FT2,
    ridgeFt: (ridge + gw) * FT,
    eaveFt: eaves * FT,
    pitch: config.pitch,
    garagePitch: Math.round(gp * 10) / 10,
  }
}
