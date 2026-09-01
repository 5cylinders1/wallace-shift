import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { brandStatement } from '../../content/siteConfig'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import './BrandStatement.css'

// Diagonal tilt (percentage points of stage height) between the plane's
// left-edge and right-edge Y position. Matches the site's existing
// lower-left-to-upper-right divider convention.
const TILT_PCT = 55
// Left-edge Y position (in % of stage height) when fully hidden below the
// viewport, and once the plane has completely covered the stage.
const START_LEFT_Y = 170
const END_LEFT_Y = -20
// Fallback highlight-band thickness as a % of stage height, used until the
// real stage height is measured.
const FALLBACK_BAND_PCT = 0.4
// Matches --ease-premium in index.css, for a consistent motion signature.
const EASE_PREMIUM = 'cubic-bezier(0.16, 1, 0.3, 1)'

function ShiftWipeHeadline() {
  return (
    <h2 className="shift-wipe__headline">
      <span className="shift-wipe__line">
        From <span className="shift-wipe__word">overlooked</span> to
      </span>
      <span className="shift-wipe__line">unforgettable.</span>
    </h2>
  )
}

export function BrandStatement() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLParagraphElement>(null)
  const planeRef = useRef<HTMLDivElement>(null)
  const edgeRef = useRef<HTMLDivElement>(null)

  const reducedMotion = useReducedMotion()

  useGSAP(
    () => {
      const stage = stageRef.current
      const plane = planeRef.current
      const edge = edgeRef.current
      if (!stage || !plane || !edge || reducedMotion) return

      const proxy = { leftY: START_LEFT_Y }
      let bandPct = FALLBACK_BAND_PCT

      const applyMask = () => {
        const rightY = proxy.leftY - TILT_PCT
        const planePolygon = `polygon(0% ${proxy.leftY}%, 100% ${rightY}%, 100% 100%, 0% 100%)`
        plane.style.setProperty('clip-path', planePolygon)
        plane.style.setProperty('-webkit-clip-path', planePolygon)

        const edgePolygon = `polygon(0% ${proxy.leftY - bandPct}%, 100% ${rightY - bandPct}%, 100% ${rightY}%, 0% ${proxy.leftY}%)`
        edge.style.setProperty('clip-path', edgePolygon)
        edge.style.setProperty('-webkit-clip-path', edgePolygon)
      }

      const measureBand = () => {
        const height = stage.clientHeight
        if (height > 0) bandPct = (3 / height) * 100
      }

      measureBand()
      applyMask()

      // Entrance: fades the headline (and, slightly behind it, the paragraph)
      // in while they are actually scrolling into view, well before the
      // section reaches its sticky position. Kept as its own ScrollTrigger
      // so the reveal never waits on the main pinned wipe timeline.
      //
      // Triggered off the headline element itself, not the outer section.
      // The headline sits vertically centered partway down the section's
      // first viewport-tall block, not at its top edge, so a trigger keyed
      // to the section's top crosses its whole range before the headline is
      // anywhere near visible — the reveal would finish silently off-screen
      // and only ever be seen already-resolved. Watching the headline's own
      // position (same convention as the Reveal component elsewhere on the
      // site) guarantees the animation plays while the text is on screen.
      const entranceTl = gsap.timeline({
        scrollTrigger: {
          trigger: headlineRef.current,
          start: 'top 85%',
          end: 'top 45%',
          scrub: true,
        },
      })

      const lines = headlineRef.current?.querySelectorAll<HTMLElement>(
        '.shift-wipe__line',
      )

      lines?.forEach((line, index) => {
        entranceTl.fromTo(
          line,
          { opacity: 0, x: -44, scale: 0.97 },
          { opacity: 1, x: 0, scale: 1, duration: 0.5, ease: EASE_PREMIUM },
          index * 0.14,
        )
      })
      entranceTl.fromTo(
        bodyRef.current,
        { opacity: 0, x: -28, scale: 0.98 },
        { opacity: 1, x: 0, scale: 1, duration: 0.5, ease: EASE_PREMIUM },
        0.42,
      )
      entranceTl.set({}, {}, 1)

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
          invalidateOnRefresh: true,
        },
      })

      tl.to(
        proxy,
        {
          leftY: END_LEFT_Y,
          duration: 0.65,
          ease: 'none',
          onUpdate: applyMask,
        },
        0.2,
      )
      tl.set({}, {}, 1)

      const handleResize = () => {
        measureBand()
        applyMask()
      }
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
      }
    },
    { scope: sectionRef, dependencies: [reducedMotion] },
  )

  if (reducedMotion) {
    return (
      <section className="brand-statement brand-statement--static" ref={sectionRef}>
        <div className="container brand-statement__inner">
          <h2 className="brand-statement__headline">
            From overlooked to unforgettable.
          </h2>
          <p className="brand-statement__body">{brandStatement.body}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="shift-wipe" ref={sectionRef}>
      <div className="shift-wipe__stage" ref={stageRef}>
        <div className="shift-wipe__content shift-wipe__content--base">
          <div className="shift-wipe__headline-wrap" ref={headlineRef}>
            <ShiftWipeHeadline />
          </div>
          <p className="shift-wipe__body" ref={bodyRef}>
            {brandStatement.body}
          </p>
        </div>

        <div className="shift-wipe__plane" ref={planeRef} aria-hidden="true">
          <div className="shift-wipe__content shift-wipe__content--duplicate">
            <ShiftWipeHeadline />
            <p className="shift-wipe__body">{brandStatement.body}</p>
          </div>
          <div className="shift-wipe__edge" ref={edgeRef} />
        </div>
      </div>
    </section>
  )
}
