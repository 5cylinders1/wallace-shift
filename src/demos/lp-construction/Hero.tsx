import { useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import AreaCheck from './AreaCheck'
import { stages } from './content'
import { useReducedMotion } from './hooks'
import { useLang } from './lang'
import { TalkButtons } from './Layout'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/** All five frames share one camera (scripts/lp-construction/generate.py). */
const SOURCE = 1248
const frame = (stage: string, size: 800 | 1248) => `/demos/lp-construction/hero/${stage}-${size}.webp`

/** Each step reveals the next frame with a soft edge moving the way the work does. */
const SWEEPS: [number, number][] = [
  [0, 1], // tear-out, top to bottom
  [1, 0], // boards go up, left to right
  [Math.SQRT1_2, -Math.SQRT1_2], // filled and primed, a diagonal shift
  [-1, 0], // paint and stain, right to left
]
const STEP = 1 / SWEEPS.length

const clamp = (v: number) => Math.max(0, Math.min(1, v))
const ease = (v: number) => v * v * (3 - 2 * v)

/** Which step is under way at `progress`, and how far along it is (holds at each end). */
function position(progress: number) {
  const index = Math.min(SWEEPS.length - 1, Math.floor(progress / STEP))
  const local = (progress - index * STEP) / STEP
  return { index, t: ease(clamp((local - 0.14) / 0.72)) }
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
  const buffer = document.createElement('canvas')
  const bufferCtx = buffer.getContext('2d')!
  let fit = { x: 0, y: 0, size: 0 }

  const resize = () => {
    const box = canvas.getBoundingClientRect()
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = buffer.width = Math.max(1, Math.round(box.width * dpr))
    canvas.height = buffer.height = Math.max(1, Math.round(box.height * dpr))
    // Cover the box, centered, so the stair and the paneled wall both stay in view.
    const size = Math.max(canvas.width, canvas.height)
    fit = { size, x: (canvas.width - size) / 2, y: (canvas.height - size) / 2 }
  }

  const draw = (target: CanvasRenderingContext2D, image: HTMLImageElement) => target.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, fit.x, fit.y, fit.size, fit.size)

  const render = (progress: number) => {
    const { index, t } = position(progress)
    const from = images[index]
    const to = images[index + 1]
    if (t <= 0) return draw(ctx, from)
    if (t >= 1) return draw(ctx, to)
    draw(ctx, from)
    const [dx, dy] = SWEEPS[index]
    const cx = canvas.width / 2, cy = canvas.height / 2
    const reach = Math.abs(dx) * cx + Math.abs(dy) * cy
    const feather = Math.max(canvas.width, canvas.height) * 0.28
    const edge = -reach - feather + t * (2 * reach + 2 * feather)
    bufferCtx.globalCompositeOperation = 'source-over'
    bufferCtx.clearRect(0, 0, buffer.width, buffer.height)
    draw(bufferCtx, to)
    const gradient = bufferCtx.createLinearGradient(cx + dx * (edge - feather), cy + dy * (edge - feather), cx + dx * (edge + feather), cy + dy * (edge + feather))
    gradient.addColorStop(0, 'rgba(0,0,0,1)')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    bufferCtx.globalCompositeOperation = 'destination-in'
    bufferCtx.fillStyle = gradient
    bufferCtx.fillRect(0, 0, buffer.width, buffer.height)
    ctx.drawImage(buffer, 0, 0)
  }

  resize()
  return { render, resize }
}

export default function Hero() {
  const root = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const trigger = useRef<ScrollTrigger | null>(null)
  const [stage, setStage] = useState(0)
  const [ready, setReady] = useState(false)
  const reduced = useReducedMotion()
  const { t } = useLang()

  useGSAP(() => {
    const element = canvas.current
    const section = track.current
    // No entrance animation: the headline is the largest paint, so it shows at once.
    if (!element || !section || reduced) return

    let cancelled = false
    let paint: ReturnType<typeof painter> | null = null
    // Dev only: ?hero=0.4 holds that moment, for reviewing frames where scrolling can't repaint.
    const held = import.meta.env.DEV ? Number.parseFloat(new URLSearchParams(window.location.search).get('hero') ?? '') : NaN
    let progress = Number.isFinite(held) ? held : 0
    const size = element.getBoundingClientRect().width * Math.min(2, window.devicePixelRatio || 1) > 900 ? SOURCE : 800
    const files = stages.map(id => frame(id, size as 800 | 1248))
    load(files[0]).then(async first => {
      if (cancelled) return
      paint = painter(element, [first, first, first, first, first])
      paint.render(progress)
      setReady(true)
      const rest = await Promise.all(files.slice(1).map(load))
      if (cancelled) return
      paint = painter(element, [first, ...rest])
      paint.render(progress)
    }).catch(() => setReady(false))

    // The hero is CSS-sticky below the header inside a taller track; the
    // track's extra height is the scroll that builds the foyer.
    trigger.current = ScrollTrigger.create({
      trigger: section,
      start: () => `top ${document.querySelector('.lp-header')?.getBoundingClientRect().height ?? 0}px`,
      end: 'bottom bottom',
      scrub: 0.4,
      invalidateOnRefresh: true,
      onUpdate: self => {
        if (Number.isFinite(held)) return
        progress = self.progress
        paint?.render(progress)
        const { index, t } = position(progress)
        setStage(index + (t > 0.5 ? 1 : 0))
      },
      onRefresh: self => {
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
    window.scrollTo({ top: start + (end - start) * index * STEP + 1, behavior: 'smooth' })
  }

  return (
    <div ref={track} className={`lp-hero-track${reduced ? '' : ' is-scrolling'}`}>
      <section ref={root} className={`lp-hero${reduced ? ' is-still' : ''}`} aria-labelledby="lp-hero-title">
        <div className="lp-hero-copy">
          <p className="lp-eyebrow">{t.hero.eyebrow}</p>
          <h1 id="lp-hero-title">{t.hero.titleA}<em>{t.hero.titleB}</em></h1>
          <p className="lp-hero-lede">{t.hero.lede}</p>
          <AreaCheck tone="dark" heading={t.hero.areaHeading} />
          <TalkButtons tone="dark" />
        </div>

        <div className="lp-hero-stage">
          <div className="lp-hero-media" aria-hidden="true">
            {reduced ? (
              <img src={frame(stages[stage], SOURCE)} alt="" width={SOURCE} height={SOURCE} className="lp-hero-still" />
            ) : (
              <>
                <img
                  src={frame('before', 800)}
                  srcSet={`${frame('before', 800)} 800w, ${frame('before', SOURCE)} ${SOURCE}w`}
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  alt="" width={SOURCE} height={SOURCE}
                  className={`lp-hero-still${ready ? ' is-hidden' : ''}`}
                  fetchPriority="high"
                />
                <canvas ref={canvas} className="lp-hero-canvas" />
              </>
            )}
          </div>
          <div className="lp-hero-stages">
            <ol aria-label={t.hero.stagesLabel}>
              {stages.map((id, index) => (
                <li key={id}>
                  <button type="button" aria-current={stage === index ? 'step' : undefined} onClick={() => goTo(index)}>
                    <span className="lp-stage-index" aria-hidden="true">{index + 1}</span>
                    <span className="lp-stage-label">{t.stages[id]}</span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="lp-hero-note">{reduced ? t.hero.choose : t.hero.scroll} · {t.hero.illustrated}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
