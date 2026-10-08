/**
 * The ballpark estimator and the payment calculator.
 *
 * The numbers are realistic examples for a Midwest metro in 2026, set for
 * the demo's sample contractor (see the demo notes on the page). A live
 * site replaces RATES with the contractor's own.
 */

export type Stories = '1' | '1.5' | '2'
export type Pitch = 'low' | 'medium' | 'steep'
export type Material = 'architectural' | 'designer' | 'metal'
export type Layers = '1' | '2'
export type Shape = 'simple' | 'average' | 'complex'

export interface EstimateInputs {
  sqft: number
  stories: Stories
  pitch: Pitch
  material: Material
  layers: Layers
  shape: Shape
}

export const DEFAULT_INPUTS: EstimateInputs = {
  sqft: 2000,
  stories: '1.5',
  pitch: 'medium',
  material: 'architectural',
  layers: '1',
  shape: 'average',
}

export const OPTIONS = {
  stories: [
    { value: '1', label: '1' },
    { value: '1.5', label: '1½' },
    { value: '2', label: '2' },
  ],
  pitch: [
    { value: 'low', label: 'Walkable', hint: 'Gentle slope' },
    { value: 'medium', label: 'Typical', hint: 'Most homes' },
    { value: 'steep', label: 'Steep', hint: 'Hard to stand on' },
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
/** Roof surface per square foot of footprint, by slope. */
const PITCH: Record<Pitch, number> = { low: 1.06, medium: 1.15, steep: 1.35 }
/** Overhangs, hips, ridges and waste. */
const OVERHANG_AND_WASTE = 1.12

const RATES = {
  /** Installed price per square (100 sq ft), one layer torn off. */
  perSquare: {
    architectural: [520, 690],
    designer: [700, 920],
    metal: [1100, 1500],
  } satisfies Record<Material, [number, number]>,
  extraLayerPerSquare: [60, 100] as [number, number],
  steepLabor: 1.1,
  shape: { simple: 0.95, average: 1, complex: 1.12 } satisfies Record<Shape, number>,
  minimum: [8500, 9500] as [number, number],
}

export interface EstimateResult {
  squares: number
  roofArea: number
  low: number
  high: number
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step

export function estimateRoof(inputs: EstimateInputs): EstimateResult {
  const roofArea = inputs.sqft * FOOTPRINT[inputs.stories] * PITCH[inputs.pitch] * OVERHANG_AND_WASTE
  const squares = roofArea / 100
  const [baseLow, baseHigh] = RATES.perSquare[inputs.material]
  const [layerLow, layerHigh] = inputs.layers === '2' ? RATES.extraLayerPerSquare : [0, 0]
  const factor = RATES.shape[inputs.shape] * (inputs.pitch === 'steep' ? RATES.steepLabor : 1)
  const low = Math.max(RATES.minimum[0], squares * (baseLow + layerLow) * factor)
  const high = Math.max(RATES.minimum[1], squares * (baseHigh + layerHigh) * factor)
  return {
    squares: Math.round(squares * 10) / 10,
    roofArea: roundTo(roofArea, 10),
    low: roundTo(low, 250),
    high: roundTo(high, 250),
  }
}

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

/** "$11,250" → "$11.3k" for tight spots. */
export const moneyShort = (value: number) =>
  value >= 1000 ? `$${(value / 1000).toFixed(1).replace(/\.0$/, '')}k` : money(value)
