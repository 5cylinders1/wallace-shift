import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import PoolPlanOverlay from './PoolPlanOverlay'
import PoolFillVideo, { type PoolFillVideoHandle } from './PoolFillVideo'

gsap.registerPlugin(ScrollTrigger)

const phases = [
  { name: 'The idea', title: 'It starts with possibility.', description: 'A familiar backyard. A whole new way to enjoy it.', note: '01 / DREAM IT', point: 0 },
  { name: 'The plan', title: 'Designed before the first dig.', description: 'The pool. The spa. Every place to slow down. See it all come together.', note: '02 / PICTURE THE POSSIBILITIES', point: .24 },
  { name: 'The dig', title: 'Make room for something good.', description: 'The layout takes shape. Your backyard begins its next chapter.', note: '03 / BREAK GROUND', point: .36 },
  { name: 'The shell', title: 'Built from the inside out.', description: 'The structure, steps and systems come together beneath the surface.', note: '04 / BUILD THE FOUNDATION', point: .54 },
  { name: 'The details', title: 'Every detail, considered.', description: 'Natural stone. A thoughtful finish. Spaces that feel like you.', note: '05 / MAKE IT YOURS', point: .71 },
  { name: 'The first swim', title: 'This is what it was all for.', description: 'A place to gather, to slow down, and to make the most of home.', note: '06 / JUST ADD LIFE', point: 1 },
]
const sceneFiles = ['pool-yard', 'pool-excavation', 'pool-shell', 'pool-finish']

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const clamp = (value: number) => Math.max(0, Math.min(1, value))
const smooth = (start: number, end: number, value: number) => {
  const t = clamp((value - start) / (end - start))
  return t * t * (3 - 2 * t)
}

function WaveMark() {
  return <svg viewBox="0 0 44 44" fill="none" aria-hidden="true"><path d="M6 15c8-8 24-8 32 0M6 23c8-8 24-8 32 0M6 31c8-8 24-8 32 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}

function Blueprint() {
  return <div className="sw-blueprint" aria-hidden="true">
    <div className="sw-blueprint-top"><span>THE NEXT CHAPTER</span><span>SW / 001</span></div>
    <svg viewBox="0 0 370 260" fill="none">
      <defs><pattern id="sw-grid" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M14 0H0V14" stroke="currentColor" opacity=".12" strokeWidth=".7" /></pattern></defs>
      <rect width="370" height="260" fill="url(#sw-grid)" />
      <g stroke="currentColor" strokeWidth="1.1">
        <path d="M48 47H285V211H48z" opacity=".4" /><path className="sw-plan-line" d="M74 66H254V192H74z" /><path d="M82 74H246V184H82zM82 93h28v91M82 107h28M82 121h28M82 135h28M82 149h28M82 163h28" />
        <path d="M254 69h46v46h-46M260 75h34v34h-34M48 225h237M48 220v10M285 220v10M32 47v164M27 47h10M27 211h10" opacity=".7" />
        <path d="M130 88h95M130 96h75M129 155c11-11 22 11 33 0s22 11 33 0 22 11 33 0M129 166c11-11 22 11 33 0s22 11 33 0 22 11 33 0" opacity=".4" />
        <circle cx="322" cy="177" r="13" /><path d="M309 177h26M322 164v26M315 168l14 18M329 168l-14 18" opacity=".5" />
        <path d="M314 46v34M300 63h28M314 46l-5 8m5-8 5 8" />
      </g>
      <g fill="currentColor" fontFamily="Manrope, sans-serif" fontSize="7" letterSpacing="1.5"><text x="137" y="139">YOUR POOL GOES HERE</text><text x="147" y="240">ROOM TO UNWIND</text><text x="309" y="37">N</text></g>
    </svg>
    <div className="sw-blueprint-bottom"><span>A little imagination.<br /><strong>A lot to look forward to.</strong></span><span className="sw-blueprint-arrow">↗</span></div>
  </div>
}

export default function PoolHero() {
  const section = useRef<HTMLElement>(null)
  const scrollRange = useRef<ScrollTrigger | null>(null)
  const menuToggle = useRef<HTMLButtonElement>(null)
  const fillVideo = useRef<PoolFillVideoHandle>(null)
  const stageRef = useRef(0)
  const [reduced, setReduced] = useState(reduceMotion)
  const [stage, setStage] = useState(() => reduceMotion() ? 5 : 0)
  const [menuOpen, setMenuOpen] = useState(false)
  const manualFrame = useRef<(stage: number) => void>(() => {})

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const root = section.current
    if (!root) return
    const layers = [...root.querySelectorAll<HTMLElement>('.sw-scene-layer')]
    const panels = [...root.querySelectorAll<HTMLElement>('.sw-scene-caption')]
    const intro = root.querySelector<HTMLElement>('.sw-hero-intro')!
    const blueprint = root.querySelector<HTMLElement>('.sw-blueprint')!
    const progress = root.querySelector<HTMLElement>('.sw-progress-fill')!
    const photoStage = root.querySelector<HTMLElement>('.sw-scene')!
    const render = (p: number) => {
      const active = [.095, .31, .445, .62, .76].filter(point => p >= point).length
      // The original full-scene film takes over from the finished empty pool.
      // Its final frame remains visible instead of dissolving to another scene.
      const sceneOpacity = [1, smooth(.16, .24, p), smooth(.40, .49, p), smooth(.57, .67, p)]
      layers.forEach((layer, i) => {
        layer.style.opacity = String(sceneOpacity[i])
        layer.style.zIndex = String(i)
      })
      const waterProgress = p >= .94 ? 1 : clamp((p - .74) / .20)
      fillVideo.current?.setProgress(waterProgress, p >= .74)
      root.dataset.waterLevel = waterProgress.toFixed(3)
      root.style.setProperty('--sw-plan-draw', String(smooth(.045, .17, p)))
      root.style.setProperty('--sw-plan-opacity', String(smooth(.045, .09, p) * (1 - smooth(.30, .36, p))))
      // Keep the camera fixed across every frame; only a subtle global pullback.
      photoStage.style.transform = reduced ? 'none' : `scale(${1.035 - clamp(p) * .035})`
      const introOpacity = reduced ? 0 : 1 - clamp((p - .01) / .07)
      intro.style.opacity = String(introOpacity)
      intro.style.transform = `translateY(${-22 * (1 - introOpacity)}px)`
      intro.inert = introOpacity < .05
      blueprint.style.opacity = String(reduced ? 0 : 1 - clamp((p - .015) / .065))
      blueprint.style.transform = `translateY(${(1 - introOpacity) * 90}px) rotate(${-5 - (1 - introOpacity) * 8}deg)`
      panels.forEach((panel, i) => {
        const opacity = active === i && (reduced || p > .095) ? 1 : 0
        panel.style.opacity = String(opacity)
        panel.style.transform = `translateY(${opacity ? 0 : 12}px)`
        panel.inert = !opacity
      })
      progress.style.transform = `scaleX(${clamp(p)})`
      root.dataset.stage = String(active)
      if (active !== stageRef.current) {
        stageRef.current = active
        setStage(active)
      }
    }
    manualFrame.current = (i: number) => render(phases[i].point)
    const context = gsap.context(() => {
      if (reduced) { render(1); return }
      render(0)
      scrollRange.current = ScrollTrigger.create({
        trigger: root,
        start: 'top top',
        end: 'bottom bottom',
        invalidateOnRefresh: true,
        onUpdate: (trigger) => render(trigger.progress),
        onRefresh: (trigger) => render(trigger.progress),
      })
    }, root)
    const refresh = () => ScrollTrigger.refresh()
    document.fonts.ready.then(refresh)
    window.addEventListener('pageshow', refresh)
    return () => { context.revert(); scrollRange.current = null; window.removeEventListener('pageshow', refresh); manualFrame.current = () => {} }
  }, [reduced])

  const goToStage = (index: number) => {
    if (reduced) { manualFrame.current(index); return }
    const trigger = scrollRange.current
    if (!trigger) return
    window.scrollTo({ top: trigger.start + phases[index].point * (trigger.end - trigger.start), behavior: 'smooth' })
  }

  return <section ref={section} id="top" className={`sw-hero ${reduced ? 'sw-hero-reduced' : ''}`} aria-label="Watch a backyard become a pool">
    <div className="sw-hero-sticky">
      <div className="sw-scene" aria-hidden="true">
        {sceneFiles.map((file, i) => <picture key={file} className="sw-scene-layer" style={{ opacity: i === (reduced ? 3 : 0) ? 1 : 0 }}>
          <source media="(max-width: 700px)" srcSet={`/demos/pools/${file}-mobile.webp`} />
          <img src={`/demos/pools/${file}.webp`} width="1672" height="941" alt="" fetchPriority={i === (reduced ? 3 : 0) ? 'high' : 'auto'} decoding="async" />
        </picture>)}
        <PoolPlanOverlay />
        <PoolFillVideo key={reduced ? 'still' : 'film'} ref={fillVideo} sectionRef={section} reducedMotion={reduced} />
      </div>
      <div className="sw-hero-shade" />
      <header className="sw-header" onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) {
          setMenuOpen(false)
          menuToggle.current?.focus()
        }
      }}>
        <a className="sw-brand" href="#top" aria-label="Stillwater Pool Co. home"><WaveMark /><span>stillwater<small>POOL CO.</small></span></a>
        <button ref={menuToggle} className="sw-menu" aria-expanded={menuOpen} aria-controls="sw-navigation" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? 'Close' : 'Menu'}<span aria-hidden="true">{menuOpen ? '−' : '+'}</span></button>
        <nav className={`sw-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation" id="sw-navigation">
          <a href="#inspiration" onClick={() => setMenuOpen(false)}>The possibilities</a>
          <a href="#approach" onClick={() => setMenuOpen(false)}>Our approach</a>
          <a className="sw-nav-plan" href="#plan" onClick={() => setMenuOpen(false)}>Plan your pool <span aria-hidden="true">↗</span></a>
        </nav>
      </header>

      {reduced && <h1 className="sw-sr-only">Good things start outside. Stillwater Pool Co.</h1>}
      <div className="sw-hero-intro">
        <p className="sw-eyebrow"><span /> CUSTOM POOLS. CONSIDERED LIVING.</p>
        <h1>Good things<br />start <em>outside.</em></h1>
        <p className="sw-hero-deck">From the first sketch to the first swim.<br />Your favorite place is closer than you think.</p>
        <a className="sw-button sw-button-lime" href="#plan">Let’s create your escape <span aria-hidden="true">↗</span></a>
      </div>
      <Blueprint />

      <div className="sw-caption-area">
        {phases.map((phase, i) => <div key={phase.name} className="sw-scene-caption" style={{ opacity: reduced && i === 5 ? 1 : 0 }} inert={stage !== i}>
          <p className="sw-eyebrow">{phase.note}</p>
          <h2>{phase.title}</h2>
          <p>{phase.description}</p>
          {i === 5 && <a href="#inspiration" className="sw-hero-text-link">Find your kind of outside <span aria-hidden="true">↗</span></a>}
        </div>)}
      </div>

      <div className="sw-hero-bottom">
        <div className="sw-scroll-prompt"><span className="sw-scroll-icon" aria-hidden="true">↓</span><span>{reduced ? 'Explore the transformation' : 'Scroll to bring it to life'}</span><span className="sw-scroll-count">0{stage + 1} / 06</span></div>
        <div className="sw-progress-track" aria-hidden="true"><span className="sw-progress-fill" /></div>
        <nav className="sw-stages" aria-label="Pool construction stages">
          {phases.map((phase, i) => <button key={phase.name} type="button" className={stage === i ? 'is-current' : ''} aria-current={stage === i ? 'step' : undefined} onClick={() => goToStage(i)}><span className="sw-stage-number">0{i + 1}</span><span>{phase.name}</span><span className="sw-stage-dot" aria-hidden="true" /></button>)}
        </nav>
        <p className="sw-hero-credit">An AI concept transformation, imagined by Wallace Shift.</p>
      </div>
      <span className="sw-sr-only" aria-live="polite">Stage {stage + 1} of 6: {phases[stage].name}</span>
    </div>
  </section>
}
