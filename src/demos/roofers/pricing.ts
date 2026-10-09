/**
 * Roof pricing and the payment calculator.
 *
 * The numbers are realistic examples for a Midwest metro in 2026, set for
 * the demo's sample contractor (see the demo notes on the page). A live
 * site replaces QUOTE_RATES with the contractor's own.
 */

import { bandFor, pitchFactor } from './roof/pitch'

export type Stories = '1' | '1.5' | '2'
export type Material = 'architectural' | 'designer' | 'metal'
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
}

const QUOTE_RATES = {
  /** Installed price per measured square, one layer torn off. */
  perSquare: {
    architectural: [440, 580],
    designer: [600, 800],
    metal: [950, 1300],
  } satisfies Record<Material, [number, number]>,
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

export function quoteRoof(inputs: RoofQuoteInputs): RoofQuote {
  const roofSqFt = inputs.footprintSqFt * pitchFactor(inputs.pitch)
  const squares = roofSqFt / 100
  const wastePct = QUOTE_RATES.waste[inputs.shape]
  const laborFactor = bandFor(inputs.pitch).labor
  const [baseLow, baseHigh] = QUOTE_RATES.perSquare[inputs.material]
  const [layerLow, layerHigh] = inputs.layers === '2' ? QUOTE_RATES.extraLayerPerSquare : [0, 0]
  const factor = (1 + wastePct * QUOTE_RATES.materialShare) * laborFactor
  return {
    // Shown to the nearest 50: the outline and the pitch aren't more precise than that.
    roofSqFt: roundTo(roofSqFt, 50),
    squares: Math.round(squares * 2) / 2,
    wastePct,
    laborFactor,
    low: roundTo(Math.max(QUOTE_RATES.minimum[0], squares * (baseLow + layerLow) * factor), 250),
    high: roundTo(Math.max(QUOTE_RATES.minimum[1], squares * (baseHigh + layerHigh) * factor), 250),
  }
}
