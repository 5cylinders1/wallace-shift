import { useEffect, useRef } from 'react'
import { BrandStatement } from '../BrandStatement/BrandStatement'
import { BrandStatementContent } from '../BrandStatement/BrandStatementContent'
import { BRAND_HANDOFF_HEIGHT_SVH, BRAND_REVEAL_OVERLAP_SVH, getBrandHandoffFrame } from './brandHandoffProgress'
import type { ProgressSource, SceneState } from '../experiments/water-hero/waterHeroTypes'
import './WaterHeroBrandHandoff.css'

/** The production statement is the split reveal itself. Its single dark
 * composition stays still as the canvas leaves, then the light copy wipes in. */
export function WaterHeroBrandHandoff({ still, progress, sceneState }: {
  still: boolean; progress: ProgressSource; sceneState: SceneState
}) {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (still || !section) return
    const stage = section.querySelector<HTMLElement>('.water-hero-brand__stage')!
    const aperture = section.querySelector<HTMLElement>('[data-brand-aperture]')!
    const body = aperture.querySelector<HTMLElement>('.shift-wipe__body')!
    const plane = section.querySelector<HTMLElement>('.shift-wipe__plane')!
    const edge = section.querySelector<HTMLElement>('.shift-wipe__edge')!
    let frame = 0
    let measure = true
    let height = 1
    let offset = 0
    let previous = ''
    const scheduleMeasure = () => { measure = true }
    const update = () => {
      if (measure) {
        height = Math.max(1, stage.getBoundingClientRect().height)
        offset = section.getBoundingClientRect().top / height
        measure = false
      }
      const contour = sceneState.logoReveal
      const key = `${progress.current}/${offset}/${height}/${contour?.version}`
      if (key !== previous) {
        const state = getBrandHandoffFrame(progress.current, offset, contour, height)
        stage.style.visibility = state.active ? 'visible' : 'hidden'
        stage.style.backgroundColor = `rgb(6 7 8 / ${state.backgroundOpacity})`
        stage.style.setProperty('--brand-mobile-clearance', String(state.mobileClearance))
        section.inert = !state.active
        section.setAttribute('aria-hidden', String(!state.active))
        aperture.style.clipPath = state.clip
        aperture.style.opacity = String(state.headingOpacity)
        body.style.opacity = String(state.bodyOpacity)
        body.setAttribute('aria-hidden', String(state.bodyOpacity <= .001))
        plane.style.clipPath = state.plane
        edge.style.clipPath = state.edge
        previous = key
      }
      frame = window.requestAnimationFrame(update)
    }
    window.addEventListener('scroll', scheduleMeasure, { passive: true })
    window.addEventListener('resize', scheduleMeasure)
    const observer = new ResizeObserver(scheduleMeasure)
    observer.observe(stage)
    update()
    return () => {
      window.removeEventListener('scroll', scheduleMeasure)
      window.removeEventListener('resize', scheduleMeasure)
      observer.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [still, progress, sceneState])

  if (still) return <BrandStatement />

  return <section ref={sectionRef} className="water-hero-brand"
    style={{ marginTop: `-${BRAND_REVEAL_OVERLAP_SVH}svh`, height: `${BRAND_HANDOFF_HEIGHT_SVH}svh` }}
    aria-labelledby="water-hero-brand-title" aria-hidden="true" inert>
    <div className="shift-wipe__stage water-hero-brand__stage">
      <div className="water-hero-brand__aperture" data-brand-aperture>
        <div className="shift-wipe__content shift-wipe__content--base">
          <BrandStatementContent headingId="water-hero-brand-title" />
        </div>
      </div>
      <div className="shift-wipe__plane" aria-hidden="true">
        <div className="shift-wipe__content shift-wipe__content--duplicate">
          <BrandStatementContent />
        </div>
        <div className="shift-wipe__edge" />
      </div>
    </div>
  </section>
}
