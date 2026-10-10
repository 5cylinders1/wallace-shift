import { roofTool } from '../content'
import type { SolarPotential as Potential } from './types'

/**
 * DC panel output to AC at the meter: the 0.85 derate Google's "Calculate
 * solar costs and savings (US only)" guide applies to yearlyEnergyDcKwh.
 */
const DC_TO_AC = 0.85
/** Fewer than this and there's no layout worth quoting: the service only models four or more. */
const USEFUL_PANELS = 4

const count = (value: number) => value.toLocaleString('en-US')

/**
 * What the measured roof could carry in solar, from the same measurement:
 * shown to every homeowner, because judging whether solar fits is what the
 * measuring service is for (see api/_lib/roof/solar.ts).
 */
export function SolarPotential({ solar, shingles }: { solar: Potential | null | undefined; shingles: boolean }) {
  const copy = roofTool.solar
  if (!solar || solar.maxPanels < USEFUL_PANELS) {
    return (
      <div className="rf-roof__solar">
        <p className="rf-roof__solar-title">{copy.title}</p>
        <p className="rf-roof__help">{copy.none}</p>
      </div>
    )
  }
  const yearly = solar.yearlyKwh !== null ? Math.round((solar.yearlyKwh * DC_TO_AC) / 100) * 100 : null
  return (
    <div className="rf-roof__solar">
      <p className="rf-roof__solar-title">{copy.title}</p>
      <p className="rf-roof__solar-value">
        {copy.panels(count(solar.maxPanels))} <span>·</span> {solar.maxKw} kW
        {yearly !== null && (
          <>
            {' '}
            <span>·</span> {copy.yearly(count(yearly))}
          </>
        )}
      </p>
      <p className="rf-roof__help">{shingles ? copy.note : copy.noteNoShingles}</p>
    </div>
  )
}
