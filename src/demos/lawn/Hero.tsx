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
    gsap.from('.tw-hero-copy > *', { autoAlpha: 0, y: 20, duration: 0.9, stagger: 0.08, ease: 'power3.out', delay: 0.1 })
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
    <section ref={root} className={`tw-hero${reduced ? ' is-still' : ''}`} aria-labelledby="tw-hero-title">
      <div className="tw-hero-stage" aria-hidden="true">
        {reduced ? (
          <img src={`/demos/lawn/hero-${still === 'before' ? 'overgrown' : still}.webp`} alt="" className="tw-hero-still" />
        ) : (
          <>
            <img src="/demos/lawn/hero-overgrown.webp" alt="" className={`tw-hero-still${ready ? ' is-hidden' : ''}`} fetchPriority="high" />
            <canvas ref={canvas} className="tw-hero-canvas" />
          </>
        )}
        <div className="tw-hero-scrim" />
      </div>

      <div className="tw-hero-inner">
        <div className="tw-hero-copy">
          <p className="tw-eyebrow">Lawn care · {business.home}</p>
          <h1 id="tw-hero-title">Lawns that look <em>Trawsome.</em></h1>
          <p className="tw-hero-lede">Mowing, trimming and seasonal cleanups by {business.owner}, backed by his personal satisfaction guarantee.</p>
          <div className="tw-hero-actions">
            <a className="tw-button tw-button-lime" href="#estimate">Get my instant price</a>
            <a className="tw-button tw-button-ghost" href={business.phoneHref}>Call<span className="tw-wide-only">&nbsp;{business.phone}</span><span className="tw-narrow-only">&nbsp;Ben</span></a>
          </div>
          <p className="tw-fave">
            <FaveMark />
            <span>Nextdoor Neighborhood Favorite<br /><strong>{business.faveYears[0]}–{business.faveYears[business.faveYears.length - 1]}</strong></span>
          </p>
        </div>

        <div className="tw-hero-stages">
          <ol aria-label="Yard transformation">
            {stages.map((item, index) => (
              <li key={item.id}>
                <button type="button" aria-current={stage === index ? 'step' : undefined} onClick={() => goTo(index)}>
                  <span className="tw-stage-index">0{index + 1}</span>
                  <span className="tw-stage-label">{item.label}</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="tw-hero-note">{reduced ? 'Choose a stage to compare.' : 'Scroll to transform'} · Illustrated yard</p>
        </div>
      </div>
    </section>
  )
}

export function FaveMark() {
  return (
    <svg className="tw-fave-mark" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M20 29s-8.5-5.2-8.5-11a4.6 4.6 0 0 1 8.5-2.4 4.6 4.6 0 0 1 8.5 2.4c0 5.8-8.5 11-8.5 11Z" fill="currentColor" />
    </svg>
  )
}
