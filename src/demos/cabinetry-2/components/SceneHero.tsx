import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { chapters, disclosure, hero, PIN_VH, SCRUB, SEQUENCE } from '../content'
import { drawFrame, frameUrl, FrameSequence } from '../sequence'

gsap.registerPlugin(useGSAP, ScrollTrigger)

/** Portrait screens get the portrait render; keep in sync with mitre.css. */
const PORTRAIT = '(max-aspect-ratio: 4/5)'
const base = (portrait: boolean) => `/demos/cabinetry-2/seq/${portrait ? 'phone' : 'desktop'}`

function usePortrait() {
  const [portrait, setPortrait] = useState(() => window.matchMedia(PORTRAIT).matches)
  useEffect(() => {
    const mq = window.matchMedia(PORTRAIT)
    const on = () => setPortrait(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return portrait
}

/**
 * The home page hero: an empty room that fills with a kitchen as the visitor
 * scrolls. A rendered image sequence (one camera, 128 frames) is drawn to a
 * canvas on a sticky stage; one GSAP timeline, scrubbed by ScrollTrigger, runs
 * in "playhead" units (viewport heights of scroll), so the caption timings are
 * the measured ones from the reference. Under reduced motion the stage is a
 * still of the finished room and the chapters are listed beneath it.
 */
export default function SceneHero() {
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const portrait = usePortrait()
  const seqBase = base(portrait)

  useGSAP(() => {
    const section = root.current
    const cv = canvas.current
    if (!section || !cv) return
    const ctx = cv.getContext('2d', { alpha: false })
    if (!ctx) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const seq = new FrameSequence(seqBase, SEQUENCE.frames)
      let devCleanup = () => {}
      let frame = 0
      let drawn = -1
      const paint = (force = false) => {
        if (!force && Math.abs(frame - drawn) < 0.001) return
        if (drawFrame(ctx, seq, frame)) {
          drawn = frame
          cv.classList.add('is-live')
        }
      }
      const size = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        cv.width = Math.round(cv.clientWidth * dpr)
        cv.height = Math.round(cv.clientHeight * dpr)
        paint(true)
      }
      const ro = new ResizeObserver(size)
      ro.observe(cv)
      seq.load(() => paint(true))

      const q = gsap.utils.selector(section)
      const blurOut = { autoAlpha: 0, filter: 'blur(10px)' }
      const blurIn = { autoAlpha: 1, filter: 'blur(0px)' }
      gsap.set(q('.mr-chapter'), blurOut)
      const span = SEQUENCE.end - SEQUENCE.start
      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: SCRUB, invalidateOnRefresh: true },
        onUpdate() {
          const p = timeline.time()
          frame = Math.min(1, Math.max(0, (p - SEQUENCE.start) / span)) * (SEQUENCE.frames - 1)
          paint()
        },
      })
      const [o0, o1] = hero.out
      timeline.to(q('.mr-hero-copy'), { ...blurOut, filter: 'blur(8px)', duration: o1 - o0 }, o0)
      chapters.forEach(chapter => {
        const el = q(`.mr-chapter[data-chapter="${chapter.id}"]`)
        const [i0, i1, x0, x1] = chapter.at
        timeline.fromTo(el, blurOut, { ...blurIn, duration: i1 - i0 }, i0)
        if (x0 < PIN_VH) timeline.to(el, { ...blurOut, duration: x1 - x0 }, x0)
      })
      timeline.set({}, {}, PIN_VH)
      if (import.meta.env.DEV) {
        // Development only: ?playhead=2.5 opens the hero at that position, for checking frames.
        (window as unknown as { mitreHero?: gsap.core.Timeline }).mitreHero = timeline
        const fixed = Number(new URLSearchParams(location.search).get('playhead'))
        if (fixed > 0) {
          // Re-applied after each refresh: a refresh resets the playhead to the scroll position.
          const hold = () => {
            timeline.scrollTrigger?.disable(false)
            timeline.time(fixed)
          }
          hold()
          ScrollTrigger.addEventListener('refresh', hold)
          const late = window.setTimeout(hold, 800)
          devCleanup = () => {
            ScrollTrigger.removeEventListener('refresh', hold)
            window.clearTimeout(late)
          }
        }
      }
      return () => {
        devCleanup()
        ro.disconnect()
        seq.dispose()
        cv.classList.remove('is-live')
      }
    })
  }, { scope: root, dependencies: [seqBase], revertOnUpdate: true })

  const last = SEQUENCE.frames - 1
  return (
    <section className="mr-hero" ref={root} aria-label="A kitchen built as you scroll">
      <div className="mr-stage">
        <img className="mr-poster" src={frameUrl(seqBase, 0)} alt="" fetchPriority="high" decoding="async" />
        <img className="mr-final" src={frameUrl(seqBase, last)} alt="The finished kitchen at dusk: rift oak cabinetry, a fluted island with a quartzite waterfall top and three opal glass pendants" loading="lazy" />
        <canvas ref={canvas} className="mr-canvas" aria-hidden="true" />
        <div className="mr-grain" aria-hidden="true" />
        <div className="mr-shade" aria-hidden="true" />
        <div className="mr-hero-copy">
          <div className="mr-hero-inner">
            <p className="mr-eyebrow">{hero.eyebrow}</p>
            <h1 className="mr-hero-title">{hero.title.map(line => <span key={line}>{line}</span>)}</h1>
            <p className="mr-lede">{hero.lede}</p>
          </div>
          <p className="mr-cue" aria-hidden="true">{hero.cue}</p>
        </div>
        <ol className="mr-chapters">
          {chapters.map(chapter => (
            <li key={chapter.id} className={`mr-chapter is-${chapter.side}`} data-chapter={chapter.id}>
              <p className="mr-eyebrow">{chapter.number} — {chapter.label}</p>
              <h2 className="mr-chapter-title">{chapter.title}</h2>
              {chapter.body && <p className="mr-chapter-body">{chapter.body}</p>}
              {chapter.side === 'right' && <a className="mr-cta" href="#contact">Plan your kitchen <span aria-hidden="true">→</span></a>}
            </li>
          ))}
        </ol>
        <p className="mr-disclosure">{disclosure}</p>
      </div>
    </section>
  )
}
