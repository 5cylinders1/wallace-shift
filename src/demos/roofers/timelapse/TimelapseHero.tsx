import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { brand } from '../brand'
import { finale, hero, labels, steps } from '../content'
import { HouseScene } from './HouseScene'
import { collectNodes, renderScene, resetStepCache, type OverlayNodes } from './director'
import './TimelapseHero.css'

/**
 * The scroll-driven timelapse: a tall section with a sticky stage. Scroll
 * position becomes a single progress value (0–100); `renderScene` turns
 * that into every attribute in the drawing, so scrubbing backwards is
 * exactly as correct as scrubbing forwards.
 *
 * With reduced motion the section collapses to one screen showing the
 * finished roof, and the seven steps render as a plain list beneath it.
 */

/** Dev-only: `?p=42` freezes the scene at that progress for review. */
function frozenProgress(): number | null {
  if (!import.meta.env.DEV) return null
  const value = new URLSearchParams(window.location.search).get('p')
  if (value === null) return null
  const p = Number(value)
  return Number.isFinite(p) ? Math.min(100, Math.max(0, p)) : null
}

export function TimelapseHero() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [step, setStep] = useState(-1)
  const [isStatic, setIsStatic] = useState(false)

  useGSAP(
    () => {
      const section = sectionRef.current
      const stage = stageRef.current
      const svg = svgRef.current
      if (!section || !stage || !svg) return

      const nodes = collectNodes(svg)
      const overlay: OverlayNodes = {
        intro: stage.querySelector('[data-intro]'),
        captions: stage.querySelector('[data-captions]'),
        finale: stage.querySelector('[data-finale]'),
        day: stage.querySelector('[data-day]'),
        time: stage.querySelector('[data-time]'),
        hud: stage.querySelector('[data-hud]'),
        labels: Object.fromEntries(
          Array.from(stage.querySelectorAll<HTMLElement>('[data-label]')).map((node) => [node.dataset.label, node]),
        ),
      }
      // The drawing's own box: full-bleed while scrubbing, a framed still
      // with reduced motion.
      const size = { width: svg.clientWidth, height: svg.clientHeight }
      const state = { p: 0, still: false }
      resetStepCache()
      const draw = () => renderScene(state.p, nodes, overlay, { ...size, still: state.still, onStep: setStep })

      const resize = new ResizeObserver(() => {
        size.width = svg.clientWidth
        size.height = svg.clientHeight
        draw()
      })
      resize.observe(svg)

      const frozen = frozenProgress()
      const mm = gsap.matchMedia()

      mm.add(
        { reduce: '(prefers-reduced-motion: reduce)', full: '(prefers-reduced-motion: no-preference)' },
        (context) => {
          const { reduce } = context.conditions as { reduce: boolean }
          if (reduce || frozen !== null) {
            setIsStatic(reduce)
            state.still = reduce && frozen === null
            state.p = frozen ?? 100
            draw()
            return
          }
          setIsStatic(false)
          state.still = false
          state.p = 0
          draw()
          gsap.to(state, {
            p: 100,
            ease: 'none',
            onUpdate: draw,
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          })
        },
      )

      return () => {
        resize.disconnect()
        mm.revert()
      }
    },
    { scope: sectionRef },
  )

  return (
    <section
      ref={sectionRef}
      id="process"
      className={`rf-timelapse${isStatic ? ' rf-timelapse--static' : ''}`}
      aria-labelledby="rf-hero-title"
    >
      <div ref={stageRef} className="rf-timelapse__stage">
        <HouseScene ref={svgRef} company={brand.shortName} phone={brand.phoneDisplay} />
        <div className="rf-timelapse__scrim" aria-hidden="true" />

        <div className="rf-timelapse__labels" aria-hidden="true">
          {Object.entries(labels).map(([name, text]) => (
            <span key={name} className="rf-callout" data-label={name}>
              <span className="rf-callout__dot" />
              <span className="rf-callout__text">{text}</span>
            </span>
          ))}
        </div>

        <div className="rf-timelapse__hud" data-hud aria-hidden="true">
          <span className="rf-timelapse__rec">Timelapse</span>
          <span className="rf-timelapse__clock">
            <strong data-day>Before the job</strong>
            <span data-time>Free inspection</span>
          </span>
          <span className="rf-timelapse__rail">
            <span />
          </span>
        </div>

        <div className="rf-timelapse__intro" data-intro>
          <p className="rf-eyebrow">{hero.eyebrow}</p>
          <h1 id="rf-hero-title" className="rf-timelapse__title">
            {hero.titleLead} <em>{hero.titleAccent}</em>
          </h1>
          <p className="rf-timelapse__lede">{hero.supporting}</p>
          <div className="rf-actions">
            <a className="rf-button rf-button--primary" href="#estimate">
              {hero.primary}
            </a>
            <a className="rf-button rf-button--ghost" href="#estimator">
              {hero.secondary}
            </a>
          </div>
          <ul className="rf-timelapse__trust">
            {hero.trust.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="rf-timelapse__cue" aria-hidden="true">
            <span />
            {hero.scrollCue}
          </p>
        </div>

        <div className="rf-timelapse__captions" data-captions>
          <ol className="rf-steps">
            {steps.map((item, index) => (
              <li
                key={item.number}
                className={`rf-step${index === step ? ' is-active' : ''}${index < step ? ' is-past' : ''}`}
                aria-current={index === step ? 'step' : undefined}
              >
                <p className="rf-step__meta">
                  <span className="rf-step__number">
                    {item.number}
                    <span className="rf-step__total"> / 07</span>
                  </span>
                  <span>{item.when}</span>
                </p>
                <h2 className="rf-step__title">{item.title}</h2>
                <p className="rf-step__body">{item.body}</p>
                <p className="rf-step__note">{item.note}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="rf-timelapse__finale" data-finale>
          <p className="rf-eyebrow">{finale.eyebrow}</p>
          <h2 className="rf-timelapse__finale-title">{finale.title}</h2>
          <p className="rf-timelapse__lede">{finale.body}</p>
          <div className="rf-actions">
            <a className="rf-button rf-button--primary" href="#estimate">
              {finale.primary}
            </a>
            <a className="rf-button rf-button--ghost" href="#answers">
              {finale.secondary}
            </a>
          </div>
        </div>

        <a className="rf-timelapse__skip" href="#estimator">
          {hero.skip}
        </a>
      </div>
    </section>
  )
}
