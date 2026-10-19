import { finishById, upgradeList, type RoofConfig, type Upgrades } from './catalog'

export const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
export const roundTo = (value: number, step: number) => Math.round(value / step) * step

export interface PlanningRange {
  low: number
  high: number
  roofLow: number
  roofHigh: number
  upgrades: number
  notes: string[]
}

/**
 * A planning range for the sample home: measured roof area times an
 * illustrative installed rate, adjusted for steep pitch and hip framing.
 * It is deliberately wide and never presented as a quote.
 */
export function planningRange(config: RoofConfig, areaFt2: number, upgrades: Upgrades): PlanningRange {
  const finish = finishById(config.finish)
  const steep = config.pitch >= 10 ? 1.16 : config.pitch >= 8 ? 1.06 : 1
  const shape = config.style === 'hip' ? 1.07 : 1
  const roofLow = roundTo(areaFt2 * finish.rate[0] * steep * shape, 250)
  const roofHigh = roundTo(areaFt2 * finish.rate[1] * steep * shape, 250)
  let upgradeLow = 0
  let upgradeHigh = 0
  for (const item of upgradeList) {
    if (upgrades[item.id] > 0.5) {
      upgradeLow += item.allowance[0]
      upgradeHigh += item.allowance[1]
    }
  }
  const notes: string[] = []
  if (config.pitch >= 10) notes.push('Steep pitch adds staging and safety time.')
  if (finish.heavy) notes.push('A heavy finish: we confirm the framing can carry it before quoting.')
  if (config.pitch < finish.minPitch) notes.push(`${finish.name} is normally installed at ${finish.minPitch}/12 or steeper.`)
  return { low: roofLow + upgradeLow, high: roofHigh + upgradeHigh, roofLow, roofHigh, upgrades: upgradeLow, notes }
}
