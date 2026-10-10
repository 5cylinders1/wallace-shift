import { forwardRef } from 'react'
import { ScenePatterns } from './ScenePatterns'
import { SceneSky, SceneTrees } from './SceneBackdrop'
import { SceneGround } from './SceneGround'
import { SceneGlow, SceneHouse, SceneHouseFront } from './SceneHouse'
import { CrewFigure, Debris, RoofBundles, Ropes, Trailer, Truck, YardSign } from './SceneActors'

interface HouseSceneProps {
  company: string
  phone: string
}

/**
 * The full illustration, back to front. The director owns every attribute
 * that changes; nothing here re-renders after mount.
 *
 * Crew members are re-parented by the director between the roof layer
 * (behind dormers and gables) and the front layer (ladder and lawn).
 */
export const HouseScene = forwardRef<SVGSVGElement, HouseSceneProps>(function HouseScene({ company, phone }, ref) {
  return (
    <svg
      ref={ref}
      className="rf-scene"
      viewBox="470 330 1590 880"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <ScenePatterns />
      <SceneSky />
      <SceneTrees />
      <SceneGround />
      <SceneHouse />
      <g id="rf-roof-crew">
        <RoofBundles />
        <Ropes />
      </g>
      <SceneHouseFront />
      <Trailer />
      <Truck company={company} />
      <YardSign company={company} phone={phone} />
      <g id="rf-front-crew">
        <CrewFigure member="inspector" />
        <CrewFigure member="r1" />
        <CrewFigure member="r2" />
        <CrewFigure member="r3" />
        <CrewFigure member="g1" />
      </g>
      <Debris />
      <rect id="rf-tint" x="-4000" y="-4000" width="12000" height="9000" fill="#ffffff" opacity="0" style={{ mixBlendMode: 'multiply' }} />
      <SceneGlow />
    </svg>
  )
})
