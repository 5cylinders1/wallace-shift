import { useRef } from 'react'
import { approach } from '../../content/siteConfig'
import { renderLines } from '../../lib/textLines'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { Reveal } from '../Reveal/Reveal'
import { PitStopScene } from './PitStopScene'
import { PitStopLoop } from './PitStopLoop'
import { useStageCycle } from './useStageCycle'
import { usePitStopSceneTimeline } from './usePitStopSceneTimeline'
import { PitStopCarStatic } from './PitStopCar'
import type { TireKey } from './pitStopGeometry'
import './Approach.css'

export function Approach() {
  const reducedMotion = useReducedMotion()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const sectionRef = useRef<HTMLElement>(null)
  const titleRefs = useRef<(HTMLHeadingElement | null)[]>([])
  const descRefs = useRef<(HTMLParagraphElement | null)[]>([])

  // Mobile shows one step at a time; this is the one on screen, and the
  // beat the pit scene below it is playing.
  const { stage: mobileStage, inView } = useStageCycle(
    sectionRef,
    approach.steps.length,
    isMobile && !reducedMotion,
  )

  const carTravelRef = useRef<HTMLDivElement>(null)
  const chassisRef = useRef<HTMLImageElement>(null)
  const frontUpperMountedRef = useRef<HTMLImageElement>(null)
  const frontLowerMountedRef = useRef<HTMLImageElement>(null)
  const rearUpperMountedRef = useRef<HTMLImageElement>(null)
  const rearLowerMountedRef = useRef<HTMLImageElement>(null)
  const frontUpperReplacementRef = useRef<HTMLImageElement>(null)
  const frontLowerReplacementRef = useRef<HTMLImageElement>(null)
  const rearUpperReplacementRef = useRef<HTMLImageElement>(null)
  const rearLowerReplacementRef = useRef<HTMLImageElement>(null)

  const releaseIndicatorRef = useRef<SVGCircleElement>(null)
  const rearUpperPeelRef = useRef<SVGRectElement>(null)
  const rearLowerPeelRef = useRef<SVGRectElement>(null)

  // Plain lookup objects for the GSAP effect's own convenience (they're
  // never passed to a JSX `ref=` attribute — each ref reaches its element
  // through its own individually-named prop instead, per the project's
  // react-hooks/refs lint rule).
  const mountedRefs: Record<TireKey, typeof frontUpperMountedRef> = {
    frontUpper: frontUpperMountedRef,
    frontLower: frontLowerMountedRef,
    rearUpper: rearUpperMountedRef,
    rearLower: rearLowerMountedRef,
  }
  const replacementRefs: Record<TireKey, typeof frontUpperReplacementRef> = {
    frontUpper: frontUpperReplacementRef,
    frontLower: frontLowerReplacementRef,
    rearUpper: rearUpperReplacementRef,
    rearLower: rearLowerReplacementRef,
  }
  // Matches PitStopScene's PEEL_MARK_POSITIONS order: rearUpper, rearLower.
  const peelMarkRefs = [rearUpperPeelRef, rearLowerPeelRef]

  usePitStopSceneTimeline(
    {
      sectionRef,
      carTravelRef,
      releaseIndicatorRef,
      mountedRefs,
      replacementRefs,
      peelMarkRefs,
      titleRefs,
      descRefs,
    },
    { enabled: !reducedMotion && !isMobile },
  )

  if (reducedMotion) {
    return (
      <section id="approach" className="approach approach--static">
        <div className="container approach__head">
          <h2 className="approach__heading">
            {renderLines(approach.headingLines)}
          </h2>
        </div>

        <div className="container approach__static-car">
          <PitStopCarStatic />
        </div>

        <div className="container approach__steps">
          {approach.steps.map((step) => (
            <div className="approach-step approach-step--static" key={step.index}>
              <span className="approach-step__index">{step.index}</span>
              <h3 className="approach-step__title">{step.title}</h3>
              <p className="approach-step__description">{step.description}</p>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section id="approach" className="approach" ref={sectionRef}>
      <div className="container approach__head">
        <Reveal>
          <h2 className="approach__heading">
            {renderLines(approach.headingLines)}
          </h2>
        </Reveal>
      </div>

      {!isMobile && (
        <div className="approach__scene-wrap">
          <PitStopScene
            carTravelRef={carTravelRef}
            chassisRef={chassisRef}
            frontUpperMountedRef={frontUpperMountedRef}
            frontLowerMountedRef={frontLowerMountedRef}
            rearUpperMountedRef={rearUpperMountedRef}
            rearLowerMountedRef={rearLowerMountedRef}
            frontUpperReplacementRef={frontUpperReplacementRef}
            frontLowerReplacementRef={frontLowerReplacementRef}
            rearUpperReplacementRef={rearUpperReplacementRef}
            rearLowerReplacementRef={rearLowerReplacementRef}
            releaseIndicatorRef={releaseIndicatorRef}
            peelMarkRefs={peelMarkRefs}
          />
        </div>
      )}

      {isMobile ? (
        <>
          {/* One step visible at a time, all three stacked in a single grid
              cell so the block is as tall as the longest and nothing
              reflows as they cross-fade. Every step stays in the document,
              so the sequence is never animation-only for assistive tech. */}
          <div className="container approach__steps approach__steps--cycle">
            {approach.steps.map((step, index) => (
              <div
                className={`approach-step${index === mobileStage ? ' approach-step--active' : ''}`}
                key={step.index}
              >
                <span className="approach-step__index">{step.index}</span>
                <h3 className="approach-step__title">{step.title}</h3>
                <p className="approach-step__description">{step.description}</p>
              </div>
            ))}
          </div>

          <div className="container">
            <PitStopLoop stage={mobileStage} active={inView} />
          </div>
        </>
      ) : (
        <div className="container approach__steps">
          {approach.steps.map((step, index) => (
            <div className="approach-step" key={step.index}>
              <span className="approach-step__index">{step.index}</span>
              <h3
                className="approach-step__title"
                ref={(el) => {
                  titleRefs.current[index] = el
                }}
              >
                {step.title}
              </h3>
              <p
                className="approach-step__description"
                ref={(el) => {
                  descRefs.current[index] = el
                }}
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
