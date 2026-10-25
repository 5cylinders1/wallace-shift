import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { brandStatement } from '../../content/siteConfig'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { BrandStatementContent } from './BrandStatementContent'
import { START_LEFT_Y, END_LEFT_Y, FALLBACK_BAND_PCT, getBrandStatementBandPct, getBrandStatementWipe } from './brandStatementWipe'
import './BrandStatement.css'

// Matches --ease-premium in index.css, for a consistent motion signature.
const EASE_PREMIUM = 'cubic-bezier(0.16, 1, 0.3, 1)'

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
        const clip = getBrandStatementWipe(proxy.leftY, bandPct)
        plane.style.setProperty('clip-path', clip.plane)
        plane.style.setProperty('-webkit-clip-path', clip.plane)
        edge.style.setProperty('clip-path', clip.edge)
        edge.style.setProperty('-webkit-clip-path', clip.edge)
      }

      const measureBand = () => {
        bandPct = getBrandStatementBandPct(stage.clientHeight, bandPct)
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
            From scattered to connected.
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
          <BrandStatementContent headlineRef={headlineRef} bodyRef={bodyRef} />
        </div>

        <div className="shift-wipe__plane" ref={planeRef} aria-hidden="true">
          <div className="shift-wipe__content shift-wipe__content--duplicate">
            <BrandStatementContent />
          </div>
          <div className="shift-wipe__edge" ref={edgeRef} />
        </div>
      </div>
    </section>
  )
}
