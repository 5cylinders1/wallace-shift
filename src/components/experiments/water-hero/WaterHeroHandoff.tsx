import { useEffect, useRef } from 'react'
import { SPLIT_START } from './sceneDirector'
import { applyHandoffProgress, type RevealBounds } from './handoffProgress'
import { STAGE_SCROLL_SVH } from './waterHeroConfig'
import type { DebugOverride, ProgressSource, SceneState } from './waterHeroTypes'

/** The ending and next section share this single heading. Its transparent
 * sticky stage begins during the split and continues after the canvas exits. */
export function WaterHeroHandoff({ still, progress, override, sceneState }: {
  still: boolean; progress?: ProgressSource; override?: DebugOverride; sceneState?: SceneState
}) {
  const sectionRef = useRef<HTMLElement>(null)
  const heroTravel = (STAGE_SCROLL_SVH - 100) / 100
  const overlap = STAGE_SCROLL_SVH - (STAGE_SCROLL_SVH - 100) * SPLIT_START

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    if (still) {
      applyHandoffProgress(section, 1, 0, true, heroTravel)
      return
    }
    const stage = section.querySelector<HTMLElement>('.water-hero-handoff__stage')!
    const aperture = section.querySelector<HTMLElement>('[data-split-aperture]')!
    let frame = 0
    let measure = true
    let offset = 0
    let bounds: RevealBounds = { left: 0, top: 0, width: 1, height: 1 }
    let previous = ''
    const scheduleMeasure = () => { measure = true }
    const update = () => {
      const inspecting = override?.progress !== null && override?.progress !== undefined
      // Inspection changes the stage from sticky to fixed. Measure after
      // applying that mode so its contour shares the canvas coordinate frame.
      if (section.dataset.inspection !== String(inspecting)) {
        section.dataset.inspection = String(inspecting)
        measure = true
      }
      if (measure) {
        const viewport = stage.getBoundingClientRect()
        const heading = aperture.getBoundingClientRect()
        const height = Math.max(1, viewport.height)
        const width = Math.max(1, viewport.width)
        offset = section.getBoundingClientRect().top / height
        bounds = { left: (heading.left - viewport.left) / width, top: (heading.top - viewport.top) / height,
          width: heading.width / width, height: heading.height / height }
        measure = false
      }
      const narrative = override?.progress ?? progress?.current ?? SPLIT_START - offset / heroTravel
      const contour = sceneState?.logoReveal
      const key = `${narrative}/${offset}/${inspecting}/${contour?.version}/${bounds.left}/${bounds.top}/${bounds.width}/${bounds.height}`
      if (key !== previous) {
        applyHandoffProgress(section, narrative, offset, false, heroTravel, inspecting, contour, bounds)
        previous = key
      }
      // The shared channel keeps debug sliders and GSAP's frame ordering
      // from leaving this single HTML reveal one scroll event behind.
      frame = window.requestAnimationFrame(update)
    }
    window.addEventListener('scroll', scheduleMeasure, { passive: true })
    window.addEventListener('resize', scheduleMeasure)
    const observer = new ResizeObserver(scheduleMeasure)
    observer.observe(stage)
    observer.observe(aperture)
    update()
    return () => {
      window.removeEventListener('scroll', scheduleMeasure)
      window.removeEventListener('resize', scheduleMeasure)
      observer.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [still, progress, override, sceneState, heroTravel])

  return <section ref={sectionRef}
    className={`water-hero-handoff${still ? ' water-hero-handoff--direct' : ''}`}
    style={still ? undefined : { marginTop: `-${overlap}svh`, height: `${overlap + 100}svh` }}
    aria-labelledby="water-hero-handoff-title" aria-hidden={!still} inert={!still}>
    <div className="water-hero-handoff__stage">
      <div className="water-hero-handoff__inner">
        <p className="water-hero-handoff__label" data-handoff-start=".89" data-handoff-end=".96">
          Beyond the surface
        </p>
        <div className="water-hero-handoff__aperture" data-split-aperture>
          <h2 id="water-hero-handoff-title" className="water-hero-handoff__title">
            <span>A Different</span>{' '}<span>Perspective</span>
          </h2>
        </div>
        <div className="water-hero-handoff__support">
          <p className="water-hero-handoff__body" data-handoff-start=".945" data-handoff-end=".985">
            The shift is where possibility becomes something you can see.
          </p>
          <a className="water-hero-handoff__link" href="/" data-handoff-start=".965" data-handoff-end=".995">
            Return to the Wallace Shift site <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </div>
  </section>
}
