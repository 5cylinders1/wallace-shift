import type { LeadContext } from '../lead'
import { RoofTool } from '../roof/RoofTool'
import type { RoofAddress } from '../roof/types'
import './Estimator.css'

interface EstimatorProps {
  onBallpark: (ballpark: LeadContext['ballpark']) => void
  onAddress: (address: RoofAddress | null) => void
}

/** The roof estimator, straight after the timelapse: a full-width dark band of its own. */
export function Estimator({ onBallpark, onAddress }: EstimatorProps) {
  return (
    <section id="estimator" className="rf-estimator" aria-labelledby="rf-roof-title">
      <div className="rf-container">
        <RoofTool onEstimate={onBallpark} onAddress={onAddress} />
      </div>
    </section>
  )
}
