/**
 * Roof pricing and the payment calculator.
 *
 * The numbers are realistic examples for a Midwest metro in 2026, set for
 * the demo's sample contractor (see the demo notes on the page). A live
 * site replaces QUOTE_RATES with the contractor's own.
 */

import { bandFor, pitchFactor } from './roof/pitch'
import type { SolarPotential } from './roof/types'

export type Stories = '1' | '1.5' | '2'
export type Material = 'architectural' | 'designer' | 'metal' | 'solar'
export type Layers = '1' | '2'
export type Shape = 'simple' | 'average' | 'complex'

export const OPTIONS = {
  stories: [
    { value: '1', label: '1' },
    { value: '1.5', label: '1½' },
    { value: '2', label: '2' },
  ],
  material: [
    { value: 'architectural', label: 'Architectural', hint: 'Most popular' },
    { value: 'designer', label: 'Designer', hint: 'Slate or shake look' },
    { value: 'metal', label: 'Metal', hint: 'Standing seam' },
    { value: 'solar', label: 'Solar shingles', hint: 'Makes power' },
  ],
  layers: [
    { value: '1', label: 'One' },
    { value: '2', label: 'Two' },
  ],
  shape: [
    { value: 'simple', label: 'Simple', hint: 'Few angles' },
    { value: 'average', label: 'Average', hint: 'A dormer or two' },
    { value: 'complex', label: 'Complex', hint: 'Many valleys' },
  ],
} as const

/** Share of living area that sits under the roof's footprint. */
const FOOTPRINT: Record<Stories, number> = { '1': 1, '1.5': 0.7, '2': 0.55 }

const roundTo = (value: number, step: number) => Math.round(value / step) * step

export interface FinancePlan {
  id: string
  name: string
  months: number
  apr: number
  promo: boolean
}

/** Standard amortized payment; a promo plan divides evenly over its term. */
export function monthlyPayment(amount: number, plan: FinancePlan): number {
  if (plan.apr === 0) return amount / plan.months
  const rate = plan.apr / 100 / 12
  return (amount * rate) / (1 - Math.pow(1 + rate, -plan.months))
}

export function totalCost(amount: number, plan: FinancePlan): number {
  return monthlyPayment(amount, plan) * plan.months
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const money = (value: number) => usd.format(value)

/* ------------------------------------------------------------------ */
/* Pricing from a building outline and a pitch                          */
/* ------------------------------------------------------------------ */

export interface RoofQuoteInputs {
  /** Ground area under the roof, from the outline (or from home size). */
  footprintSqFt: number
  /** Roof surface when it was measured; otherwise it's worked out from the footprint and pitch. */
  roofSqFt?: number | null
  /** Solar shingles only: the active system's size, kW. */
  solarKw?: number | null
  /** Rise per 12. */
  pitch: number
  material: Material
  layers: Layers
  shape: Shape
}

export interface RoofQuote {
  roofSqFt: number
  squares: number
  wastePct: number
  laborFactor: number
  low: number
  high: number
  /** Solar shingles: the part of the price that is the solar system. */
  solar: { kw: number; low: number; high: number } | null
}

const QUOTE_RATES = {
  /** Installed price per measured square, one layer torn off. */
  perSquare: {
    architectural: [440, 580],
    designer: [600, 800],
    metal: [950, 1300],
    // Solar shingle roofs are a full re-roof in matching standard shingles, plus the solar adder below.
    solar: [440, 580],
  } satisfies Record<Material, [number, number]>,
  /**
   * Solar shingles over standard ones, per watt of the active system, and
   * the inverter, rapid shutdown, permit and utility hookup. Published
   * prices vary widely (bundled figures of roughly $4–6/W, $40k–$100k for a
   * whole solar roof), so these are the demo contractor's example rates.
   */
  solarPerWatt: [3, 4] as [number, number],
  solarElectrical: [2500, 4000] as [number, number],
  extraLayerPerSquare: [55, 90] as [number, number],
  /** Extra material ordered for cuts, by roof shape. */
  waste: { simple: 0.1, average: 0.12, complex: 0.15 } satisfies Record<Shape, number>,
  /** Waste only adds material, roughly a third of an installed square. */
  materialShare: 0.35,
  minimum: [8500, 9500] as [number, number],
}

/** An outline's corner count is a fair first guess at roof complexity. */
export function shapeFromCorners(corners: number): Shape {
  if (corners <= 6) return 'simple'
  if (corners <= 12) return 'average'
  return 'complex'
}

/** A measuring service's complexity grade (0 low … 3 extreme) as a roof shape. */
export function shapeFromComplexity(complexity: number | null): Shape {
  if (complexity === null) return 'average'
  if (complexity <= 0) return 'simple'
  if (complexity === 1) return 'average'
  return 'complex'
}

/** Living area → the ground the roof covers, for visitors with no address. */
export function footprintFromHome(sqft: number, stories: Stories): number {
  return sqft * FOOTPRINT[stories] * 1.08
}

/* ------------------------------------------------------------------ */
/* Solar shingles, sized from the measured roof's panel layouts          */
/* ------------------------------------------------------------------ */

/**
 * Output per square foot of roof covered by active solar shingles: GAF's
 * Timberline Solar ES 2 is 57 W a shingle at about 30 a square (1.7 kW per
 * 100 sq ft). Panel layouts from the measuring service are packed denser,
 * so the same patch of roof makes proportionally less as shingles.
 */
export const SOLAR_SHINGLE_W_PER_SQFT = 17.1
/** DC to AC at the meter, as Google's Solar API cost guide assumes. */
const DC_TO_AC = 0.85
const SQFT_PER_M2 = 10.763_910_4
/** System sizes to choose from, kW of solar shingles; a roof only offers what it can hold. */
const SOLAR_SIZES = [4, 7, 10]

export interface SolarSize {
  kw: number
  /** Roof area covered by active shingles. */
  activeSqFt: number
  /** AC kWh a year, from the service's modelled sunlight on the same panels' spots. */
  yearlyKwh: number | null
}

/**
 * The solar shingle systems this roof can hold, from the measuring
 * service's panel layouts (best spots first). A layout's output is scaled
 * to shingles by power density over the same roof area.
 */
export function solarSizes(solar: SolarPotential | null | undefined): SolarSize[] {
  if (!solar || solar.maxPanels < 4) return []
  const panelSqFt = solar.panelHeightM * solar.panelWidthM * SQFT_PER_M2
  const density = solar.panelWatts / panelSqFt
  const ratio = Math.min(1, SOLAR_SHINGLE_W_PER_SQFT / density)
  const maxKw = (solar.maxPanels * solar.panelWatts * ratio) / 1000
  const sizes = SOLAR_SIZES.filter((kw) => kw <= maxKw)
  if (!sizes.length) sizes.push(Math.floor(maxKw * 2) / 2)
  return sizes.map((kw) => {
    const panels = (kw * 1000) / (solar.panelWatts * ratio)
    return { kw, activeSqFt: Math.round((panels * panelSqFt) / 10) * 10, yearlyKwh: yearlyFor(solar, panels, ratio) }
  })
}

/** Modelled output for `panels` panel spots, between the service's layouts, as shingles. */
function yearlyFor(solar: SolarPotential, panels: number, ratio: number): number | null {
  const configs = solar.configs
  if (!configs.length) return null
  const above = configs.find((c) => c.panels >= panels) ?? configs[configs.length - 1]
  const below = [...configs].reverse().find((c) => c.panels <= panels)
  const dc =
    below && below !== above
      ? below.yearlyKwh + ((above.yearlyKwh - below.yearlyKwh) * (panels - below.panels)) / (above.panels - below.panels)
      : above.yearlyKwh * (panels / above.panels)
  return Math.round((dc * ratio * DC_TO_AC) / 100) * 100
}

export function quoteRoof(inputs: RoofQuoteInputs): RoofQuote {
  const roofSqFt = inputs.roofSqFt ?? inputs.footprintSqFt * pitchFactor(inputs.pitch)
  const squares = roofSqFt / 100
  const wastePct = QUOTE_RATES.waste[inputs.shape]
  const laborFactor = bandFor(inputs.pitch).labor
  const [baseLow, baseHigh] = QUOTE_RATES.perSquare[inputs.material]
  const [layerLow, layerHigh] = inputs.layers === '2' ? QUOTE_RATES.extraLayerPerSquare : [0, 0]
  const factor = (1 + wastePct * QUOTE_RATES.materialShare) * laborFactor
  const solarKw = inputs.material === 'solar' && inputs.solarKw ? inputs.solarKw : null
  const solar = solarKw
    ? {
        kw: solarKw,
        low: roundTo(solarKw * 1000 * QUOTE_RATES.solarPerWatt[0] + QUOTE_RATES.solarElectrical[0], 250),
        high: roundTo(solarKw * 1000 * QUOTE_RATES.solarPerWatt[1] + QUOTE_RATES.solarElectrical[1], 250),
      }
    : null
  return {
    // Shown to the nearest 50: the outline and the pitch aren't more precise than that.
    roofSqFt: roundTo(roofSqFt, 50),
    squares: Math.round(squares * 2) / 2,
    wastePct,
    laborFactor,
    low: roundTo(Math.max(QUOTE_RATES.minimum[0], squares * (baseLow + layerLow) * factor), 250) + (solar?.low ?? 0),
    high: roundTo(Math.max(QUOTE_RATES.minimum[1], squares * (baseHigh + layerHigh) * factor), 250) + (solar?.high ?? 0),
    solar,
  }
}
