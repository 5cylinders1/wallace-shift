import { PitStopCarStatic } from './PitStopCar'
import './MobilePitScene.css'

// Mobile fallback: the complete assembled car, scaled uniformly, with no
// pin and no tire-swap animation — avoids a prolonged pinned scroll on
// small screens per the brief.
export function MobilePitScene() {
  return (
    <div className="mobile-pit-scene" aria-hidden="true">
      <PitStopCarStatic className="mobile-pit-scene__car" />
    </div>
  )
}
