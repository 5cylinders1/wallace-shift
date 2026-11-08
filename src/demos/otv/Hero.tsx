import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { channels, channelSrc, links, org, stores, titleHref } from './content'
import { pad2, useReducedMotion } from './hooks'

gsap.registerPlugin(useGSAP)

const AUTO_MS = 7000
const COUNT = channels.length
const wrap = (i: number) => (i + COUNT) % COUNT
const around = (i: number) => [wrap(i - 1), i, wrap(i + 1)]

/** HH:MM:SS:FF at 24 frames a second, counted from when the page came on. */
const timecode = (ms: number) => {
  const frames = Math.floor(ms / (1000 / 24))
  const s = Math.floor(frames / 24)
  return `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor(s / 60) % 60)}:${pad2(s % 60)}:${pad2(frames % 24)}`
}

/**
 * The hero is a television that is already on. It cycles through real titles
 * from the OTV catalog; changing channel cuts through a burst of static and a
 * short vertical roll, the way a tuner finds the next signal.
 */
export default function Hero() {
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [wanted, setWanted] = useState(() => new Set(around(0)))
  const [paused, setPaused] = useState(false)
  const [hold, setHold] = useState(false)
  const [inView, setInView] = useState(true)
  const [announce, setAnnounce] = useState('')

  const root = useRef<HTMLElement>(null)
  const roll = useRef<HTMLDivElement>(null)
  const noise = useRef<HTMLCanvasElement>(null)
  const sync = useRef<HTMLDivElement>(null)
  const tc = useRef<HTMLSpanElement>(null)
  const noiseFrame = useRef(0)
  const firstCut = useRef(true)

  /** Paint TV static into the small canvas for `ms` milliseconds. */
  const staticBurst = useCallback((ms: number) => {
    const canvas = noise.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const image = context.createImageData(canvas.width, canvas.height)
    const pixels = new Uint32Array(image.data.buffer)
    const end = performance.now() + ms
    cancelAnimationFrame(noiseFrame.current)
    const draw = (now: number) => {
      for (let i = 0; i < pixels.length; i++) {
        const v = (Math.random() * 255) | 0
        pixels[i] = 0xff000000 | (v << 16) | (v << 8) | v
      }
      context.putImageData(image, 0, 0)
      if (now < end) noiseFrame.current = requestAnimationFrame(draw)
    }
    noiseFrame.current = requestAnimationFrame(draw)
  }, [])

  useEffect(() => () => cancelAnimationFrame(noiseFrame.current), [])

  const tune = useCallback((next: number, byUser: boolean) => {
    const target = wrap(next)
    setWanted((current) => new Set([...current, ...around(target)]))
    if (byUser) setAnnounce(`Channel ${target + 1} of ${COUNT}: ${channels[target].title}`)
    if (reduced) {
      setIndex(target)
      return
    }
    staticBurst(460)
    gsap.to(noise.current, { opacity: 0.82, duration: 0.07, ease: 'none', onComplete: () => setIndex(target) })
  }, [reduced, staticBurst])

  // The signal settles after each cut: the picture rolls into place under the fading static.
  useGSAP(() => {
    if (firstCut.current) {
      firstCut.current = false
      return
    }
    if (reduced) return
    gsap.fromTo(roll.current, { yPercent: -4.5 }, { yPercent: 0, duration: 0.3, ease: 'steps(4)' })
    gsap.to(noise.current, { opacity: 0, duration: 0.36, delay: 0.05, ease: 'power1.out' })
    gsap.fromTo(sync.current, { yPercent: -120, opacity: 0.55 }, { yPercent: 1100, opacity: 0, duration: 0.42, ease: 'power1.in' })
  }, { dependencies: [index], scope: root })

  // Power-on: a single bright line opens into the picture, then the copy arrives.
  useGSAP(() => {
    const items = gsap.utils.toArray<HTMLElement>('[data-reveal]', root.current)
    if (reduced) {
      gsap.set('.otv-poweron', { display: 'none' })
      return
    }
    const intro = gsap.timeline({ defaults: { ease: 'power3.out' } })
    intro
      .fromTo('.otv-poweron-beam', { scaleX: 0 }, { scaleX: 1, duration: 0.26, ease: 'power2.out' })
      .to('.otv-poweron-beam', { scaleY: 260, opacity: 0, duration: 0.5, ease: 'power2.in' })
      .to('.otv-poweron', { opacity: 0, duration: 0.42, ease: 'power1.in' }, '<0.08')
      .set('.otv-poweron', { display: 'none' })
      .from(items, { y: 22, opacity: 0, duration: 0.8, stagger: 0.07 }, '-=0.32')
      .from('.otv-chyron', { x: 26, opacity: 0, duration: 0.8 }, '<0.2')
  }, { scope: root })

  // Running timecode, only while the hero is on screen.
  useEffect(() => {
    if (!inView) return
    const start = performance.now() - (Number(tc.current?.dataset.elapsed) || 0)
    let frame = 0
    const tick = (now: number) => {
      const elapsed = now - start
      if (tc.current) {
        tc.current.textContent = timecode(elapsed)
        tc.current.dataset.elapsed = String(elapsed)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView])

  useEffect(() => {
    const node = root.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // Channel surfing: on by default, off for reduced motion, held while someone is reading or hovering.
  useEffect(() => {
    if (paused || reduced || hold || !inView) return
    const timer = window.setTimeout(() => tune(index + 1, false), AUTO_MS)
    return () => window.clearTimeout(timer)
  }, [index, paused, reduced, hold, inView, tune])

  const onKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      tune(index + 1, true)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      tune(index - 1, true)
    }
  }

  const channel = channels[index]
  const surfing = !paused && !reduced

  return (
    <section ref={root} id="top" className={`otv-hero${reduced ? ' is-calm' : ''}`} aria-labelledby="otv-hero-title">
      <div className="otv-screen" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}>
        <div ref={roll} className="otv-screen-roll">
          {channels.map((c, i) => (
            <img
              key={c.slug}
              className={`otv-frame${i === index ? ' is-on' : ''}`}
              src={wanted.has(i) ? channelSrc(c.image, 1920) : undefined}
              srcSet={wanted.has(i) ? `${channelSrc(c.image, 1280)} 1280w, ${channelSrc(c.image, 1920)} 1920w` : undefined}
              sizes="(max-aspect-ratio: 1/1) 180vh, 80vw"
              style={{ '--focus': c.focus, '--focus-wide': c.focusWide } as CSSProperties}
              alt=""
              width="1920"
              height="1080"
              decoding="async"
              fetchPriority={i === 0 ? 'high' : 'low'}
            />
          ))}
        </div>
        <canvas ref={noise} className="otv-static" width="240" height="135" aria-hidden="true" />
        <div ref={sync} className="otv-sync" aria-hidden="true" />
        <div className="otv-scanlines" aria-hidden="true" />
        <div className="otv-screen-shade" aria-hidden="true" />
      </div>

      <div className="otv-hero-copy">
        <p className="otv-eyebrow" data-reveal>{org.name} <span aria-hidden="true">·</span> {org.city}, since {org.founded}</p>
        <h1 id="otv-hero-title" className="otv-hero-title" data-reveal>
          the future of storytelling is <span className="otv-bars-text">intersectional.</span>
        </h1>
        <p className="otv-hero-lede" data-reveal>
          A nonprofit streaming platform and media incubator for artists the industry overlooks. We develop television from the bottom up, with artists and their visions at the center.
        </p>
        <div className="otv-hero-actions" data-reveal>
          <a className="otv-btn" href={links.trial}>Start a free trial</a>
          <a className="otv-btn otv-btn--ghost" href="#ways">Make TV with us</a>
        </div>
        <p className="otv-stores" data-reveal>
          <span>Stream on</span>
          {stores.map((store) => <a key={store.label} href={store.href}>{store.label}</a>)}
        </p>
      </div>

      <div className="otv-chyron" role="group" aria-label="Now streaming" onKeyDown={onKeys} onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
        <div className="otv-chyron-top">
          <span className="otv-tally"><i aria-hidden="true" />Now streaming</span>
          <span className="otv-tc" aria-hidden="true"><span ref={tc}>00:00:00:00</span></span>
        </div>
        <a className="otv-chyron-title" href={titleHref(channel.slug)}>
          <span className="otv-ch" aria-hidden="true">CH {pad2(index + 1)}</span>
          <span className="otv-chyron-name">{channel.title}</span>
          <span className="otv-chyron-meta">from {channel.collection} <span aria-hidden="true">↗</span></span>
        </a>
        <div className="otv-chyron-controls">
          <button type="button" className="otv-icon-btn" onClick={() => tune(index - 1, true)} aria-label="Previous channel">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <span className="otv-ch-count" aria-hidden="true">{pad2(index + 1)} / {pad2(COUNT)}</span>
          <button type="button" className="otv-icon-btn" onClick={() => tune(index + 1, true)} aria-label="Next channel">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </button>
          {!reduced && (
            <button type="button" className="otv-icon-btn" onClick={() => setPaused((value) => !value)} aria-pressed={!surfing} aria-label="Pause channel surfing">
              {surfing
                ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12" /></svg>
                : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" className="is-fill" /></svg>}
            </button>
          )}
        </div>
        <span className="otv-sr" aria-live="polite">{announce}</span>
      </div>

      <div className="otv-poweron" aria-hidden="true"><div className="otv-poweron-beam" /></div>
    </section>
  )
}
