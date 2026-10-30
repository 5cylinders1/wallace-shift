import { useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { business, stages } from './content'
import { useReducedMotion } from './hooks'
import { clamp, smooth } from './motion'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/**
 * The timelapse: five frames of one house from one camera
 * (scripts/painting/generate.py, composited onto one plate by
 * scripts/painting/composite.py so only the paint and prep ever change),
 * drawn into a wider view of the street (scripts/painting/outpaint.py and
 * scene.py) so the house sits in its surroundings instead of filling the
 * screen. Scrolling drives it. Each transition reveals the next frame the
 * way the work happens: washed top to bottom, primed in short strokes along
 * the boards, painted course by course, then the masking comes off.
 */
const SOURCE = { width: 1536, height: 1024 }
/** The wider view, and where the frames sit in it (printed by scene.py). */
const SCENE = { width: 1536, height: 1024, x: 344.3, y: 195.8, scale: 0.6044 }
/** The house in frame pixels. */
const HOUSE = { left: 136, right: 1352, top: 80, bottom: 868 }
/** The house's centre in the wider view, which every crop keeps in frame. */
const FOCUS = { x: SCENE.x + 745 * SCENE.scale, y: SCENE.y + ((HOUSE.top + HOUSE.bottom) / 2) * SCENE.scale }
const HOUSE_WIDTH = (HOUSE.right - HOUSE.left) * SCENE.scale
/** About two siding courses per painted band. */
const BAND = 30
/** Each frame fades into the wider view over this share of its width; scene.py blends over 7%, so the fade lands on matching pixels. */
const FEATHER = 0.05

type Kind = 'wash' | 'strokes' | 'bands' | 'fade'
/** Spans are relative shares of the timelapse's stretch of scroll. */
type Segment = { stage: number; span: number } | { from: number; kind: Kind; span: number }

const TIMELINE: Segment[] = [
  { stage: 0, span: 0.5 },
  { from: 0, kind: 'wash', span: 1.9 },
  { stage: 1, span: 0.8 },
  { from: 1, kind: 'strokes', span: 2.3 },
  { stage: 2, span: 0.8 },
  { from: 2, kind: 'bands', span: 4.4 },
  { stage: 3, span: 0.7 },
  { from: 3, kind: 'fade', span: 1.1 },
  { stage: 4, span: 0.6 },
]
const TOTAL = TIMELINE.reduce((sum, segment) => sum + segment.span, 0)

/** Where each segment starts, as a share of the whole timelapse. */
const STARTS = TIMELINE.map((_, index) => TIMELINE.slice(0, index).reduce((sum, segment) => sum + segment.span, 0) / TOTAL)
/** Where each stage's frame is fully shown and holding. */
const HOLDS = stages.map((_, index) => {
  const at = TIMELINE.findIndex((segment) => 'stage' in segment && segment.stage === index)
  return { start: STARTS[at], end: STARTS[at] + TIMELINE[at].span / TOTAL }
})
/** A stage's button lands mid-hold, where its frame is fully shown. */
const STAGE_AT = HOLDS.map((hold) => (hold.start + hold.end) / 2)
/** A stage's rail segment fills while its work happens: the transition into it. */
const FILLS = HOLDS.map((hold, index) => (index === 0 ? { from: 0, to: hold.end } : { from: HOLDS[index - 1].end, to: hold.start }))

/**
 * The pinned scroll, in screen heights: the title lifts away, the repaint
 * plays, the finished house holds, then the next section slides over it.
 */
const SCROLL = { intro: 0.55, lapse: 2.8, outro: 0.55, cover: 1 }
const PINNED = SCROLL.intro + SCROLL.lapse + SCROLL.outro + SCROLL.cover

/** The frame and the transition at one moment of the timelapse. */
function momentAt(progress: number): { base: number; kind?: Kind; t: number } {
  for (let i = TIMELINE.length - 1; i >= 0; i -= 1) {
    if (progress < STARTS[i]) continue
    const segment = TIMELINE[i]
    if ('stage' in segment) return { base: segment.stage, t: 0 }
    const t = clamp((progress - STARTS[i]) / (segment.span / TOTAL))
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
  const suffix = mobile ? '-mobile' : ''
  return [`/demos/painting/hero-surround${suffix}.webp`, ...stages.map((stage) => `/demos/painting/hero-${stage.id}${suffix}.webp`)]
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

/**
 * Where the wider view sits for a camera `pull` from 0 (the opening shot) to
 * 1 (the working view). Wide screens open a touch close and settle on the
 * whole street. Tall ones open filling the screen, then pull back to a
 * full-width band, the house nearly edge to edge, with room above and below
 * for the captions.
 */
function framing(width: number, height: number, pull: number, dpr: number) {
  const cover = Math.max(width / SCENE.width, height / SCENE.height)
  const tall = width / height < 1.1
  const near = tall ? cover : cover * 1.06
  const far = tall
    ? Math.max(width / SCENE.width, Math.min((width * 0.88) / HOUSE_WIDTH, (height - 320 * dpr) / SCENE.height))
    : cover
  const scale = near + (far - near) * pull
  const w = SCENE.width * scale
  const h = SCENE.height * scale
  const x = w >= width ? clamp(width / 2 - FOCUS.x * scale, width - w, 0) : (width - w) / 2
  const y = h >= height ? clamp(height / 2 - FOCUS.y * scale, height - h, 0) : (height - h) * 0.56
  return { scale, x, y, width: w, height: h }
}

/** A frame with its edges faded out, so it melts into the wider view behind it. */
function feathered(image: HTMLImageElement) {
  const canvas = document.createElement('canvas')
  const width = (canvas.width = image.naturalWidth)
  const height = (canvas.height = image.naturalHeight)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, 0, 0)
  ctx.globalCompositeOperation = 'destination-in'
  const edge = width * FEATHER
  for (const [size, horizontal] of [[width, true], [height, false]] as const) {
    const gradient = horizontal ? ctx.createLinearGradient(0, 0, width, 0) : ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, 'rgba(0,0,0,0)')
    gradient.addColorStop(edge / size, '#000')
    gradient.addColorStop(1 - edge / size, '#000')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }
  return canvas
}

function painter(canvas: HTMLCanvasElement, [surround, ...photos]: HTMLImageElement[]) {
  const ctx = canvas.getContext('2d')!
  const mask = document.createElement('canvas')
  const maskCtx = mask.getContext('2d')!
  const frames = photos.map(feathered)
  let dpr = 1
  let fit = framing(1, 1, 0, 1)
  /** The frames' rectangle on the canvas, and frame pixels to canvas pixels. */
  let frame = { x: 0, y: 0, width: 0, height: 0, scale: 1 }

  // Layout size, not the on-screen box: the stage is scaled while it recedes.
  const resize = () => {
    const width = Math.max(1, canvas.offsetWidth)
    const height = Math.max(1, canvas.offsetHeight)
    // The source is 1536 pixels wide, so more resolution than ~2200 only costs time.
    dpr = Math.min(window.devicePixelRatio || 1, 2, 2200 / width)
    canvas.width = mask.width = Math.round(width * dpr)
    canvas.height = mask.height = Math.round(height * dpr)
  }

  const sx = (x: number) => frame.x + x * frame.scale
  const sy = (y: number) => frame.y + y * frame.scale
  const draw = (target: CanvasRenderingContext2D, image: HTMLCanvasElement) => target.drawImage(image, frame.x, frame.y, frame.width, frame.height)

  /** Draws `image` over the canvas wherever `shape` paints the mask. */
  const reveal = (image: HTMLCanvasElement, shape: (target: CanvasRenderingContext2D) => void) => {
    maskCtx.globalCompositeOperation = 'source-over'
    maskCtx.clearRect(0, 0, mask.width, mask.height)
    maskCtx.fillStyle = '#000'
    shape(maskCtx)
    maskCtx.globalCompositeOperation = 'source-in'
    draw(maskCtx, image)
    ctx.drawImage(mask, 0, 0)
  }

  const transitions: Record<Kind, (image: HTMLCanvasElement, t: number) => void> = {
    // Water sheeting down the house: a soft edge travels from the roof to the lawn.
    wash: (image, t) => reveal(image, (target) => {
      const feather = frame.height * 0.22
      const edge = frame.y - feather + smooth(t) * (frame.height + feather * 2)
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
        target.rect(sx(stroke.x), sy(stroke.y), stroke.length * smooth(local) * frame.scale, (BAND / 2 + 1) * frame.scale)
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
      const feather = 70 * frame.scale
      const left = sx(HOUSE.left - 30)
      const right = sx(HOUSE.right + 30)
      target.fillRect(0, 0, mask.width, sy(HOUSE.top))
      target.fillRect(0, sy(HOUSE.bottom), mask.width, mask.height)
      target.fillRect(0, sy(HOUSE.top), left, sy(HOUSE.bottom) - sy(HOUSE.top))
      target.fillRect(right, sy(HOUSE.top), mask.width - right, sy(HOUSE.bottom) - sy(HOUSE.top))
      for (let i = 0; i < rows; i += 1) {
        const local = smooth(clamp((t - (i / rows) * 0.78) / 0.22))
        if (local <= 0) continue
        const top = sy(HOUSE.top + i * BAND)
        const height = BAND * frame.scale + 1
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
      ctx.globalAlpha = smooth(t)
      draw(ctx, image)
      ctx.globalAlpha = 1
    },
  }

  const render = (progress: number, pull: number) => {
    fit = framing(canvas.width, canvas.height, pull, dpr)
    const scale = fit.scale * SCENE.scale
    frame = { x: fit.x + SCENE.x * fit.scale, y: fit.y + SCENE.y * fit.scale, width: SOURCE.width * scale, height: SOURCE.height * scale, scale }
    const { base, kind, t } = momentAt(progress)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(surround, fit.x, fit.y, fit.width, fit.height)
    draw(ctx, frames[base])
    if (kind && t > 0) transitions[kind](frames[base + 1], t)
  }

  resize()
  return { render, resize }
}

/**
 * The same picture in plain HTML: the wider view with one stage's frame
 * faded into it. Shown before the canvas is ready, and as the stills when
 * motion is reduced.
 */
function Scene({ stage, className }: { stage: string; className?: string }) {
  return (
    <div className={`cp-hero-scene${className ? ` ${className}` : ''}`}>
      <picture>
        <source media="(max-width: 760px)" srcSet="/demos/painting/hero-surround-mobile.webp" />
        <img src="/demos/painting/hero-surround.webp" alt="" fetchPriority="high" />
      </picture>
      <picture>
        <source media="(max-width: 760px)" srcSet={`/demos/painting/hero-${stage}-mobile.webp`} />
        <img src={`/demos/painting/hero-${stage}.webp`} alt="" className="cp-hero-scene-frame" fetchPriority="high" />
      </picture>
    </div>
  )
}

export default function Hero() {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const rail = useRef<HTMLOListElement>(null)
  const seek = useRef<((progress: number) => void) | null>(null)
  const [stage, setStage] = useState(0)
  const [ready, setReady] = useState(false)
  const reduced = useReducedMotion()
  const [still, setStill] = useState(stages.length - 1)

  useGSAP(() => {
    const section = root.current
    const element = canvas.current
    if (!section || reduced || !element) return
    gsap.from('.cp-hero-intro > *', { autoAlpha: 0, y: 22, duration: 0.9, stagger: 0.08, ease: 'power3.out', delay: 0.15 })

    const app = section.closest('.cp-app')
    app?.classList.add('cp-is-staged')
    let cancelled = false
    let paint: ReturnType<typeof painter> | null = null
    let dirty = true
    const state = { progress: 0, pull: 0 }
    const frame = () => {
      if (!dirty || !paint) return
      paint.render(state.progress, state.pull)
      dirty = false
    }
    gsap.ticker.add(frame)

    const fills = () => Array.from(rail.current?.children ?? []) as HTMLElement[]
    const sync = () => {
      dirty = true
      fills().forEach((item, index) => {
        const { from, to } = FILLS[index]
        item.style.setProperty('--fill', String(clamp((state.progress - from) / (to - from))))
      })
      setStage(stageAt(state.progress))
    }

    const unit = () => section.offsetHeight
    const lapseAt = SCROLL.intro
    const outroAt = lapseAt + SCROLL.lapse
    const coverAt = outroAt + SCROLL.outro
    const timeline = gsap.timeline({ defaults: { ease: 'none' } })
    // The title card lifts toward the viewer as the camera pulls back to the whole house.
    timeline
      .to(state, { pull: 1, duration: SCROLL.intro, ease: 'power1.inOut', onUpdate: () => { dirty = true } }, 0)
      .to('.cp-hero-intro', { autoAlpha: 0, z: 160, y: -24, duration: SCROLL.intro * 0.8, ease: 'power1.in' }, 0)
      .to('.cp-hero-cue', { autoAlpha: 0, duration: SCROLL.intro * 0.3 }, 0)
      .to('.cp-hero-shade', { opacity: 0, duration: SCROLL.intro }, 0)
      .fromTo('.cp-hero-hud', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: SCROLL.intro * 0.5, immediateRender: false }, SCROLL.intro * 0.5)
      .fromTo(state, { progress: 0 }, { progress: 1, duration: SCROLL.lapse, onUpdate: sync, immediateRender: false }, lapseAt)
      // A slow dolly toward the house while the work happens.
      .to('.cp-hero-media', { scale: 1.05, duration: SCROLL.lapse + SCROLL.outro }, lapseAt)
      // The close-out: the finished house holds while the offer comes forward.
      .to('.cp-hero-hud', { autoAlpha: 0, y: -12, duration: SCROLL.outro * 0.5 }, outroAt)
      .to('.cp-hero-shade', { opacity: 1, duration: SCROLL.outro * 0.7 }, outroAt)
      .fromTo('.cp-hero-outro', { autoAlpha: 0, z: -180, y: 30 }, { autoAlpha: 1, z: 0, y: 0, duration: SCROLL.outro, ease: 'power2.out', immediateRender: false }, outroAt)
      // The next section slides up over the house, which tips back into the dark.
      .to('.cp-hero-stage', { scale: 0.86, rotationX: 9, y: () => -unit() * 0.06, borderRadius: 28, duration: SCROLL.cover, ease: 'power1.in' }, coverAt)
      .to('.cp-hero-dim', { opacity: 0.7, duration: SCROLL.cover, ease: 'power1.in' }, coverAt)
    gsap.set('.cp-hero-hud, .cp-hero-outro', { autoAlpha: 0 })

    // Dev only: ?hero=0.5 jumps to that moment of the repaint without easing, for reviewing frames.
    const held = import.meta.env.DEV ? Number.parseFloat(new URLSearchParams(window.location.search).get('hero') ?? '') : NaN
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => `+=${PINNED * unit()}`,
      pin: true,
      scrub: Number.isFinite(held) ? true : 0.6,
      animation: timeline,
      invalidateOnRefresh: true,
    })
    const positionOf = (progress: number) => trigger.start + (lapseAt + clamp(progress) * SCROLL.lapse) * unit()
    seek.current = (progress) => window.scrollTo({ top: positionOf(progress) })

    const files = sources(window.matchMedia('(max-width: 760px)').matches)
    Promise.all(files.map(load)).then((images) => {
      if (cancelled) return
      paint = painter(element, images)
      paint.render(state.progress, state.pull)
      dirty = false
      setReady(true)
      if (Number.isFinite(held)) window.scrollTo({ top: positionOf(held), behavior: 'instant' })
    }).catch(() => setReady(false))

    const onResize = () => { paint?.resize(); dirty = true }
    window.addEventListener('resize', onResize)
    return () => {
      cancelled = true
      seek.current = null
      gsap.ticker.remove(frame)
      window.removeEventListener('resize', onResize)
      app?.classList.remove('cp-is-staged')
    }
  }, { scope: root, dependencies: [reduced], revertOnUpdate: true })

  const goTo = (index: number) => (reduced ? setStill(index) : seek.current?.(STAGE_AT[index]))
  const current = reduced ? still : stage

  return (
    <section ref={root} className={`cp-hero${reduced ? ' is-still' : ''}`} aria-labelledby="cp-hero-title">
      <div className="cp-hero-stage">
        <div className="cp-hero-media" aria-hidden="true">
          {reduced ? (
            <Scene stage={stages[still].id} />
          ) : (
            <>
              <Scene stage="weathered" className={`is-near${ready ? ' is-hidden' : ''}`} />
              <canvas ref={canvas} className="cp-hero-canvas" />
            </>
          )}
        </div>
        <div className="cp-hero-top" aria-hidden="true" />
        <div className="cp-hero-shade" aria-hidden="true" />

        <div className="cp-hero-frame">
          <div className="cp-hero-intro">
            <p className="cp-eyebrow">House painting · {business.home}</p>
            <h1 id="cp-hero-title">From tired<br /> to <em>complete.</em></h1>
            <p className="cp-hero-lede">
              Exterior and interior painting, cabinet refinishing and rotten wood repair around Bonner Springs and Kansas City, with {business.experienceYears} years of experience behind every coat.
            </p>
            <div className="cp-hero-actions">
              <a className="cp-button cp-button-ochre" href="#estimate">Request an estimate</a>
              <a className="cp-button cp-button-glass" href="#studio">Try colors on your house</a>
            </div>
            <p className="cp-hero-call">Or call <a href={business.phoneHref}>{business.phone}</a></p>
          </div>

          {!reduced && (
            <p className="cp-hero-cue" aria-hidden="true">
              <span>Scroll to watch the repaint</span>
            </p>
          )}

          <div className="cp-hero-hud">
            <p className="cp-hero-caption" aria-live="polite">
              <span className="cp-hero-count">0{current + 1}<small> / 0{stages.length}</small></span>
              <strong>{stages[current].label}</strong>
              <span className="cp-hero-caption-text">{stages[current].caption}</span>
            </p>
            <ol ref={rail} className="cp-hero-rail" aria-label="Repaint stages">
              {stages.map((item, index) => (
                <li key={item.id} className={index <= current ? 'is-reached' : undefined}>
                  <button type="button" aria-current={current === index ? 'step' : undefined} aria-label={item.label} onClick={() => goTo(index)}>
                    <span className="cp-rail-track" aria-hidden="true"><span /></span>
                    <span className="cp-stage-long" aria-hidden="true">{item.label}</span>
                    <span className="cp-stage-short" aria-hidden="true">{item.short}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>

          {!reduced && (
            <div className="cp-hero-outro">
              <p className="cp-hero-outro-title">That’s a <em>complete</em> repaint.</p>
              <p className="cp-hero-outro-text">Prep, repairs and paint from one local company. See your own house in new colors, or ask for an estimate.</p>
              <div className="cp-hero-actions">
                <a className="cp-button cp-button-ochre" href="#estimate">Request an estimate</a>
                <a className="cp-button cp-button-glass" href="#studio">Try colors on your house</a>
              </div>
            </div>
          )}
        </div>
        <div className="cp-hero-dim" aria-hidden="true" />
      </div>
    </section>
  )
}
