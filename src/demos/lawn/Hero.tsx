import { useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { business, stages } from './content'
import { useReducedMotion } from './hooks'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/** Source frames share one camera (scripts/lawn/generate.py). */
const SOURCE = { width: 1536, height: 1024 }
/** Where the striped lawn begins, and the point its stripes run toward, in source pixels. */
const LAWN_TOP = 636
const VANISH = { x: 780, y: 380 }
/**
 * Where each mower pass meets the bottom edge. Projected from VANISH they
 * cover the lawn from its left edge to the driveway at the back (y = LAWN_TOP)
 * and the full width at the front.
 */
const PASSES = 12
const PASS_EDGES = Array.from({ length: PASSES + 1 }, (_, i) => -1200 + (i * 3900) / PASSES)

/** Scroll progress of each step: mowing ends, then the beds and drives are finished. */
const MOW = [0.06, 0.5] as const
const FINISH = [0.58, 0.9] as const
const STAGE_AT = [0, 0.5, 0.9]

const clamp = (v: number) => Math.max(0, Math.min(1, v))
const ease = (v: number) => v * v * (3 - 2 * v)
const span = ([a, b]: readonly [number, number], p: number) => clamp((p - a) / (b - a))

function sources(mobile: boolean) {
  const suffix = mobile ? '-mobile' : ''
  return ['overgrown', 'mowed', 'finished'].map((stage) => `/demos/lawn/hero-${stage}${suffix}.webp`)
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
 * Draws one moment of the transformation into a canvas sized to its box:
 * the overgrown yard, the mown lawn revealed pass by pass along its own
 * stripes, then the finished beds and drives swept in from the left.
 */
function painter(canvas: HTMLCanvasElement, images: HTMLImageElement[]) {
  const ctx = canvas.getContext('2d')!
  const sweep = document.createElement('canvas')
  const sweepCtx = sweep.getContext('2d')!
  let fit = { scale: 1, x: 0, y: 0, width: 0, height: 0 }

  const resize = () => {
    const box = canvas.getBoundingClientRect()
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = sweep.width = Math.max(1, Math.round(box.width * dpr))
    canvas.height = sweep.height = Math.max(1, Math.round(box.height * dpr))
    // Cover, centered horizontally on the house and kept low enough to show the whole lawn.
    const scale = Math.max(canvas.width / SOURCE.width, canvas.height / SOURCE.height)
    const width = SOURCE.width * scale
    const height = SOURCE.height * scale
    fit = { scale, width, height, x: (canvas.width - width) / 2, y: (canvas.height - height) * 0.62 }
  }

  const toCanvas = (x: number, y: number): [number, number] => [fit.x + x * fit.scale, fit.y + y * fit.scale]
  const along = (edge: number, s: number): [number, number] => toCanvas(VANISH.x + (edge - VANISH.x) * s, VANISH.y + (SOURCE.height - VANISH.y) * s)
  const draw = (target: CanvasRenderingContext2D, image: HTMLImageElement) => target.drawImage(image, fit.x, fit.y, fit.width, fit.height)

  const render = (progress: number) => {
    const [overgrown, mowed, finished] = images
    const mow = span(MOW, progress)
    const finish = ease(span(FINISH, progress))
    draw(ctx, mow >= 1 ? mowed : overgrown)

    if (mow > 0 && mow < 1) {
      // Above the lawn the two frames match; a quiet crossfade covers any drift.
      ctx.save()
      ctx.globalAlpha = ease(mow)
      ctx.beginPath()
      ctx.rect(0, 0, canvas.width, toCanvas(0, LAWN_TOP)[1])
      ctx.clip()
      draw(ctx, mowed)
      ctx.restore()

      // On the lawn, one pass at a time, alternating direction like a mower.
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, toCanvas(0, LAWN_TOP)[1], canvas.width, canvas.height)
      ctx.clip()
      ctx.beginPath()
      for (let i = 0; i < PASSES; i += 1) {
        // Each pass takes a quarter of the mowing time; four are underway at once.
        const t = clamp((mow * (PASSES + 3)) / 4 - i / 4)
        if (t <= 0) continue
        const reach = ease(t)
        const [near, far] = i % 2 ? [1 - reach, 1] : [0, reach]
        const from = Math.max(0.2, near)
        const a = PASS_EDGES[i]
        const b = PASS_EDGES[i + 1]
        ctx.moveTo(...along(a, from))
        ctx.lineTo(...along(b, from))
        ctx.lineTo(...along(b, Math.max(from, far) * 1.02))
        ctx.lineTo(...along(a, Math.max(from, far) * 1.02))
        ctx.closePath()
      }
      ctx.clip()
      draw(ctx, mowed)
      ctx.restore()
    }

    if (finish > 0) {
      // A soft-edged sweep from left to right, like a blower clearing the drive.
      sweepCtx.globalCompositeOperation = 'source-over'
      sweepCtx.clearRect(0, 0, sweep.width, sweep.height)
      draw(sweepCtx, finished)
      const feather = sweep.width * 0.35
      const edge = -feather + finish * (sweep.width + feather * 2)
      const gradient = sweepCtx.createLinearGradient(edge - feather, 0, edge + feather, 0)
      gradient.addColorStop(0, 'rgba(0,0,0,1)')
      gradient.addColorStop(1, 'rgba(0,0,0,0)')
      sweepCtx.globalCompositeOperation = 'destination-in'
      sweepCtx.fillStyle = gradient
      sweepCtx.fillRect(0, 0, sweep.width, sweep.height)
      ctx.drawImage(sweep, 0, 0)
    }
  }

  resize()
  return { render, resize }
}

export default function Hero() {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const trigger = useRef<ScrollTrigger | null>(null)
  const [stage, setStage] = useState(0)
  const [ready, setReady] = useState(false)
  const reduced = useReducedMotion()

  useGSAP(() => {
    const element = canvas.current
    const section = root.current
    if (!element || !section) return
    gsap.from('.ll-hero-copy > *', { autoAlpha: 0, y: 20, duration: 0.9, stagger: 0.08, ease: 'power3.out', delay: 0.1 })
    if (reduced) return

    let cancelled = false
    let paint: ReturnType<typeof painter> | null = null
    // Dev only: ?hero=0.3 holds that moment, for reviewing frames where scrolling can't repaint.
    const held = import.meta.env.DEV ? Number.parseFloat(new URLSearchParams(window.location.search).get('hero') ?? '') : NaN
    let progress = Number.isFinite(held) ? held : 0
    const mobile = window.matchMedia('(max-width: 760px)').matches
    const files = sources(mobile)
    // The first frame paints as soon as it arrives; the others follow.
    load(files[0]).then(async (first) => {
      if (cancelled) return
      paint = painter(element, [first, first, first])
      paint.render(progress)
      setReady(true)
      const rest = await Promise.all(files.slice(1).map(load))
      if (cancelled) return
      paint = painter(element, [first, ...rest])
      paint.render(progress)
      ScrollTrigger.refresh()
    }).catch(() => setReady(false))

    trigger.current = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=190%',
      pin: true,
      scrub: true,
      onUpdate: (self) => {
        if (Number.isFinite(held)) return
        progress = self.progress
        paint?.render(progress)
        setStage(STAGE_AT.filter((point) => progress >= point - 0.001).length - 1)
      },
      onRefresh: (self) => {
        paint?.resize()
        paint?.render(Number.isFinite(held) ? progress : self.progress)
      },
    })
    return () => {
      cancelled = true
      trigger.current = null
    }
  }, { scope: root, dependencies: [reduced] })

  const goTo = (index: number) => {
    if (reduced || !trigger.current) return setStage(index)
    const { start, end } = trigger.current
    window.scrollTo({ top: start + (end - start) * STAGE_AT[index], behavior: 'smooth' })
  }

  const still = reduced ? stages[stage].id : null
  return (
    <section ref={root} className={`ll-hero${reduced ? ' is-still' : ''}`} aria-labelledby="ll-hero-title">
      <div className="ll-hero-stage" aria-hidden="true">
        {reduced ? (
          <img src={`/demos/lawn/hero-${still === 'before' ? 'overgrown' : still}.webp`} alt="" className="ll-hero-still" />
        ) : (
          <>
            <img src="/demos/lawn/hero-overgrown.webp" alt="" className={`ll-hero-still${ready ? ' is-hidden' : ''}`} fetchPriority="high" />
            <canvas ref={canvas} className="ll-hero-canvas" />
          </>
        )}
        <div className="ll-hero-scrim" />
      </div>

      <div className="ll-hero-inner">
        <div className="ll-hero-copy">
          <p className="ll-eyebrow">Landscape &amp; design · Kansas City</p>
          <h1 id="ll-hero-title">Outdoor living, <em>built to last.</em></h1>
          <p className="ll-hero-lede">Patios, retaining walls, outdoor kitchens and plantings, designed and installed by the Lareau family across {business.area}.</p>
          <div className="ll-hero-actions">
            <a className="ll-button ll-button-green" href="#plan">Plan my project</a>
            <a className="ll-button ll-button-ghost" href={business.phoneHref}>Call<span className="ll-wide-only">&nbsp;{business.phone}</span><span className="ll-narrow-only">&nbsp;us</span></a>
          </div>
          <a className="ll-rating" href={business.google} target="_blank" rel="noreferrer">
            <Stars />
            <span><strong>{business.rating.toFixed(1)} on Google</strong>{business.reviewCount} reviews</span>
          </a>
        </div>

        <div className="ll-hero-stages">
          <ol aria-label="Yard transformation">
            {stages.map((item, index) => (
              <li key={item.id}>
                <button type="button" aria-current={stage === index ? 'step' : undefined} onClick={() => goTo(index)}>
                  <span className="ll-stage-index">0{index + 1}</span>
                  <span className="ll-stage-label">{item.label}</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="ll-hero-note">{reduced ? 'Choose a stage to compare.' : 'Scroll to transform'} · Illustrated yard</p>
        </div>
      </div>
    </section>
  )
}

/** Five filled stars, for a 5.0 rating. Decorative: the text beside it says the rating. */
export function Stars() {
  return (
    <svg className="ll-stars" viewBox="0 0 100 20" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((index) => (
        <path key={index} transform={`translate(${index * 20} 0)`} d="m10 1.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8L10 1.5Z" fill="currentColor" />
      ))}
    </svg>
  )
}
