import { useRef, useState, type ChangeEvent } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { business, stages } from './content'
import { useReducedMotion } from './hooks'

gsap.registerPlugin(useGSAP)

/**
 * The timelapse: five frames of one house from one camera
 * (scripts/painting/generate.py, composited onto one plate by
 * scripts/painting/composite.py so only the paint and prep ever change).
 * Each transition reveals the next frame the way the work happens: washed
 * top to bottom, primed in short strokes along the boards, painted course by
 * course, then the masking comes off.
 */
const SOURCE = { width: 1536, height: 1024 }
/** The house in source pixels, and the point the crop keeps centered. */
const HOUSE = { left: 136, right: 1352, top: 80, bottom: 868 }
const FOCUS = { x: 745, top: 64 }
/** About two siding courses per painted band. */
const BAND = 30

type Kind = 'wash' | 'strokes' | 'bands' | 'fade'
type Segment = { stage: number; seconds: number } | { from: number; kind: Kind; seconds: number }

const TIMELINE: Segment[] = [
  { stage: 0, seconds: 1.5 },
  { from: 0, kind: 'wash', seconds: 1.9 },
  { stage: 1, seconds: 0.9 },
  { from: 1, kind: 'strokes', seconds: 2.3 },
  { stage: 2, seconds: 0.9 },
  { from: 2, kind: 'bands', seconds: 4.6 },
  { stage: 3, seconds: 0.8 },
  { from: 3, kind: 'fade', seconds: 1.1 },
]
const TOTAL = TIMELINE.reduce((sum, segment) => sum + segment.seconds, 0)

/** Where each segment starts, as a share of the whole timelapse. */
const STARTS = TIMELINE.map((_, index) => TIMELINE.slice(0, index).reduce((sum, segment) => sum + segment.seconds, 0) / TOTAL)
/** The progress at which each stage is first fully shown. */
const STAGE_AT = stages.map((_, index) => {
  if (index === 0) return 0
  const at = TIMELINE.findIndex((segment) => 'stage' in segment && segment.stage === index)
  return at === -1 ? 1 : STARTS[at]
})

const clamp = (v: number) => Math.max(0, Math.min(1, v))
const ease = (v: number) => v * v * (3 - 2 * v)

/** The frame and the transition at one moment of the timelapse. */
function momentAt(progress: number): { base: number; kind?: Kind; t: number } {
  for (let i = TIMELINE.length - 1; i >= 0; i -= 1) {
    if (progress < STARTS[i]) continue
    const segment = TIMELINE[i]
    if ('stage' in segment) return { base: segment.stage, t: 0 }
    const t = clamp((progress - STARTS[i]) / (segment.seconds / TOTAL))
    return t >= 1 ? { base: segment.from + 1, t: 0 } : { base: segment.from, kind: segment.kind, t }
  }
  return { base: 0, t: 0 }
}

/** The stage being worked on: a transition already names the step it shows happening. */
function stageAt(progress: number): number {
  if (progress >= 0.999) return stages.length - 1
  const { base, kind, t } = momentAt(progress)
  return kind && t > 0 ? base + 1 : base
}

/** A small seeded random, so the brush strokes fall the same way on every visit. */
function random(seed: number) {
  let value = seed
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296
    return value / 4294967296
  }
}

/** Primer goes on in short strokes along the boards, a few rows at a time. */
const STROKES = (() => {
  const next = random(7)
  const strokes: { x: number; y: number; length: number; start: number }[] = []
  for (let y = HOUSE.top; y < HOUSE.bottom; y += BAND / 2) {
    for (let x = HOUSE.left - 40; x < HOUSE.right; ) {
      const length = 90 + next() * 220
      strokes.push({ x, y, length, start: next() * 0.78 })
      x += length * (0.7 + next() * 0.25)
    }
  }
  return strokes
})()

function sources(mobile: boolean) {
  return stages.map((stage) => `/demos/painting/hero-${stage.id}${mobile ? '-mobile' : ''}.webp`)
}

function load(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

function painter(canvas: HTMLCanvasElement, images: HTMLImageElement[]) {
  const ctx = canvas.getContext('2d')!
  const mask = document.createElement('canvas')
  const maskCtx = mask.getContext('2d')!
  let fit = { scale: 1, x: 0, y: 0, width: 0, height: 0 }

  const resize = () => {
    const box = canvas.getBoundingClientRect()
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = mask.width = Math.max(1, Math.round(box.width * dpr))
    canvas.height = mask.height = Math.max(1, Math.round(box.height * dpr))
    // Cover the frame, centered on the house and keeping the roof's peak in view.
    const scale = Math.max(canvas.width / SOURCE.width, canvas.height / SOURCE.height)
    const width = SOURCE.width * scale
    const height = SOURCE.height * scale
    const x = Math.min(0, Math.max(canvas.width - width, canvas.width / 2 - FOCUS.x * scale))
    const y = Math.min(0, Math.max(canvas.height - height, -FOCUS.top * scale))
    fit = { scale, width, height, x, y }
  }

  const sx = (x: number) => fit.x + x * fit.scale
  const sy = (y: number) => fit.y + y * fit.scale
  const draw = (target: CanvasRenderingContext2D, image: HTMLImageElement) => target.drawImage(image, fit.x, fit.y, fit.width, fit.height)

  /** Draws `image` over the canvas wherever `shape` paints the mask. */
  const reveal = (image: HTMLImageElement, shape: (target: CanvasRenderingContext2D) => void) => {
    maskCtx.globalCompositeOperation = 'source-over'
    maskCtx.clearRect(0, 0, mask.width, mask.height)
    maskCtx.fillStyle = '#000'
    shape(maskCtx)
    maskCtx.globalCompositeOperation = 'source-in'
    draw(maskCtx, image)
    ctx.drawImage(mask, 0, 0)
  }

  const transitions: Record<Kind, (image: HTMLImageElement, t: number) => void> = {
    // Water sheeting down the house: a soft edge travels from the roof to the lawn.
    wash: (image, t) => reveal(image, (target) => {
      const feather = mask.height * 0.22
      const edge = -feather + ease(t) * (mask.height + feather * 2)
      const gradient = target.createLinearGradient(0, edge - feather, 0, edge + feather)
      gradient.addColorStop(0, 'rgba(0,0,0,1)')
      gradient.addColorStop(1, 'rgba(0,0,0,0)')
      target.fillStyle = gradient
      target.fillRect(0, 0, mask.width, mask.height)
    }),
    // Spot priming: short strokes along the boards, each drawn out in its own moment.
    strokes: (image, t) => reveal(image, (target) => {
      target.beginPath()
      for (const stroke of STROKES) {
        const local = clamp((t - stroke.start) / 0.2)
        if (local <= 0) continue
        target.rect(sx(stroke.x), sy(stroke.y), stroke.length * ease(local) * fit.scale, (BAND / 2 + 1) * fit.scale)
      }
      target.fill()
      if (t > 0.9) {
        // Settle any gaps between strokes so the stage ends on the primed frame.
        target.globalAlpha = (t - 0.9) / 0.1
        target.fillRect(0, 0, mask.width, mask.height)
        target.globalAlpha = 1
      }
    }),
    // The main coat: course by course from the eaves down, each pass left or right like a painter working the wall.
    bands: (image, t) => reveal(image, (target) => {
      const rows = Math.ceil((HOUSE.bottom - HOUSE.top) / BAND)
      const feather = 70 * fit.scale
      const left = sx(HOUSE.left - 30)
      const right = sx(HOUSE.right + 30)
      target.fillRect(0, 0, mask.width, sy(HOUSE.top))
      target.fillRect(0, sy(HOUSE.bottom), mask.width, mask.height)
      target.fillRect(0, sy(HOUSE.top), left, sy(HOUSE.bottom) - sy(HOUSE.top))
      target.fillRect(right, sy(HOUSE.top), mask.width - right, sy(HOUSE.bottom) - sy(HOUSE.top))
      for (let i = 0; i < rows; i += 1) {
        const local = ease(clamp((t - (i / rows) * 0.78) / 0.22))
        if (local <= 0) continue
        const top = sy(HOUSE.top + i * BAND)
        const height = BAND * fit.scale + 1
        const reach = left + (right - left + feather) * local
        const forward = i % 2 === 0
        const edge = forward ? reach : right - (reach - left)
        const gradient = target.createLinearGradient(edge - (forward ? feather : -feather), 0, edge, 0)
        gradient.addColorStop(0, 'rgba(0,0,0,1)')
        gradient.addColorStop(1, 'rgba(0,0,0,0)')
        target.fillStyle = gradient
        if (forward) target.fillRect(left, top, Math.max(0, edge - left), height)
        else target.fillRect(edge, top, Math.max(0, right - edge), height)
        target.fillStyle = '#000'
      }
    }),
    fade: (image, t) => {
      ctx.globalAlpha = ease(t)
      draw(ctx, image)
      ctx.globalAlpha = 1
    },
  }

  const render = (progress: number) => {
    const { base, kind, t } = momentAt(progress)
    draw(ctx, images[base])
    if (kind && t > 0) transitions[kind](images[base + 1], t)
  }

  resize()
  return { render, resize }
}

type Mode = 'loading' | 'playing' | 'paused' | 'done'

export default function Hero() {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const slider = useRef<HTMLInputElement>(null)
  const tween = useRef<gsap.core.Tween | null>(null)
  const userPaused = useRef(false)
  const [stage, setStage] = useState(0)
  const [mode, setMode] = useState<Mode>('loading')
  const [ready, setReady] = useState(false)
  const reduced = useReducedMotion()
  const [still, setStill] = useState(stages.length - 1)

  useGSAP(() => {
    gsap.from('.cp-hero-reveal', { autoAlpha: 0, y: 20, duration: 0.9, stagger: 0.08, ease: 'power3.out', delay: 0.1 })
    const element = canvas.current
    const section = root.current
    if (reduced || !element || !section) return

    let cancelled = false
    let paint: ReturnType<typeof painter> | null = null
    const state = { progress: 0 }
    // Dev only: ?hero=0.5 holds that moment, for reviewing frames in a pane that can't animate.
    const held = import.meta.env.DEV ? Number.parseFloat(new URLSearchParams(window.location.search).get('hero') ?? '') : NaN

    const sync = () => {
      paint?.render(state.progress)
      if (slider.current) {
        slider.current.value = String(Math.round(state.progress * 1000))
        slider.current.style.setProperty('--p', `${state.progress * 100}%`)
        slider.current.setAttribute('aria-valuetext', `${stages[stageAt(state.progress)].label}, ${Math.round(state.progress * 100)}%`)
      }
      setStage(stageAt(state.progress))
    }

    // An explicit start: a plain .to() would record whatever progress a seek had already set.
    const timeline = gsap.fromTo(state, { progress: 0 }, {
      progress: 1,
      immediateRender: false,
      duration: TOTAL,
      ease: 'none',
      paused: true,
      onUpdate: sync,
      onComplete: () => setMode('done'),
    })
    tween.current = timeline

    // Plays only while the hero is on screen, and never against a visitor's pause.
    let visible = false
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (!paint || userPaused.current || timeline.progress() >= 1 || Number.isFinite(held)) return
      if (visible) { timeline.play(); setMode('playing') } else timeline.pause()
    }, { threshold: 0.35 })
    observer.observe(section)

    const files = sources(window.matchMedia('(max-width: 760px)').matches)
    Promise.all(files.map(load)).then((images) => {
      if (cancelled) return
      paint = painter(element, images)
      setReady(true)
      if (Number.isFinite(held)) {
        timeline.progress(clamp(held))
        sync()
        setMode('paused')
        return
      }
      sync()
      if (visible) { timeline.play(); setMode('playing') } else setMode('paused')
    }).catch(() => setReady(false))

    const onResize = () => { paint?.resize(); paint?.render(state.progress) }
    window.addEventListener('resize', onResize)
    return () => {
      cancelled = true
      observer.disconnect()
      window.removeEventListener('resize', onResize)
      timeline.kill()
      tween.current = null
    }
  }, { scope: root, dependencies: [reduced] })

  const toggle = () => {
    const timeline = tween.current
    if (!timeline) return
    if (mode === 'done' || timeline.progress() >= 1) {
      userPaused.current = false
      timeline.restart()
      setMode('playing')
    } else if (mode === 'playing') {
      userPaused.current = true
      timeline.pause()
      setMode('paused')
    } else {
      userPaused.current = false
      timeline.play()
      setMode('playing')
    }
  }

  const seek = (progress: number) => {
    const timeline = tween.current
    if (!timeline) return
    userPaused.current = true
    timeline.pause()
    timeline.progress(progress)
    setMode(progress >= 1 ? 'done' : 'paused')
  }

  const onScrub = (event: ChangeEvent<HTMLInputElement>) => seek(Number(event.target.value) / 1000)
  const goTo = (index: number) => (reduced ? setStill(index) : seek(STAGE_AT[index]))
  const current = reduced ? still : stage

  return (
    <section ref={root} className="cp-hero" aria-labelledby="cp-hero-title">
      <div className="cp-hero-head">
        <p className="cp-eyebrow cp-hero-reveal">House painting · {business.home}</p>
        <h1 id="cp-hero-title" className="cp-hero-reveal">From tired<br /> to <em>complete.</em></h1>
      </div>

      <div className="cp-hero-body">
        <p className="cp-hero-lede cp-hero-reveal">
          Exterior and interior painting, cabinet refinishing and rotten wood repair for homes and businesses around Bonner Springs and Kansas City, with {business.experienceYears} years of experience behind every coat.
        </p>
        <div className="cp-hero-actions cp-hero-reveal">
          <a className="cp-button cp-button-ink" href="#estimate">Request an estimate</a>
          <a className="cp-button cp-button-line" href="#studio">Try colors on your house</a>
        </div>
        <p className="cp-hero-call cp-hero-reveal">
          Or call <a href={business.phoneHref}>{business.phone}</a>
        </p>
      </div>

      <figure className="cp-hero-frame cp-hero-reveal">
        <div className="cp-hero-media" aria-hidden="true">
          {reduced ? (
            <picture>
              <source media="(max-width: 760px)" srcSet={`/demos/painting/hero-${stages[still].id}-mobile.webp`} />
              <img src={`/demos/painting/hero-${stages[still].id}.webp`} alt="" className="cp-hero-still" />
            </picture>
          ) : (
            <>
              <picture>
                <source media="(max-width: 760px)" srcSet="/demos/painting/hero-weathered-mobile.webp" />
                <img src="/demos/painting/hero-weathered.webp" alt="" className={`cp-hero-still${ready ? ' is-hidden' : ''}`} fetchPriority="high" />
              </picture>
              <canvas ref={canvas} className="cp-hero-canvas" />
            </>
          )}
        </div>

        <div className="cp-hero-badge" aria-hidden="true">
          <span className={`cp-hero-dot${mode === 'playing' ? ' is-live' : ''}`} />
          {reduced ? 'Stages' : 'Timelapse'}
          <span className="cp-hero-badge-count">0{current + 1}<small> / 0{stages.length}</small></span>
        </div>

        <figcaption className="cp-hero-controls">
          <div className="cp-hero-bar">
            {!reduced && (
              <button type="button" className="cp-hero-play" onClick={toggle} disabled={mode === 'loading'} aria-label={mode === 'playing' ? 'Pause timelapse' : mode === 'done' ? 'Replay timelapse' : 'Play timelapse'}>
                {mode === 'playing' ? (
                  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4h3v12H6zM11 4h3v12h-3z" fill="currentColor" /></svg>
                ) : mode === 'done' ? (
                  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 10a5.5 5.5 0 1 0 1.7-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M4 3v4h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : (
                  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4l10 6-10 6z" fill="currentColor" /></svg>
                )}
              </button>
            )}
            <p className="cp-hero-caption" aria-live="polite">
              <strong>{stages[current].label}.</strong> <span>{stages[current].caption}</span>
            </p>
            <ol className="cp-hero-stages" aria-label="Repaint stages">
              {stages.map((item, index) => (
                <li key={item.id}>
                  <button type="button" aria-current={current === index ? 'step' : undefined} aria-label={item.label} onClick={() => goTo(index)} disabled={!reduced && mode === 'loading'}>
                    <span className="cp-stage-long">{item.label}</span>
                    <span className="cp-stage-short" aria-hidden="true">{item.short}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
          {!reduced && (
            <input
              ref={slider}
              type="range"
              className="cp-hero-range"
              min={0}
              max={1000}
              defaultValue={0}
              onChange={onScrub}
              disabled={mode === 'loading'}
              aria-label="Timelapse position"
            />
          )}
        </figcaption>
      </figure>
    </section>
  )
}
