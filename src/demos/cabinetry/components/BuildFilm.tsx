import { useRef, useState, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { buildSrc, type Build } from '../builds'
import { DUR, MOTION_OK, STAGGER } from '../motion'
import { href, onLink } from '../routes'

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText)

/** The stacked phone and portrait-tablet layout; keep in sync with tambour.css. */
const STACKED = '(max-width: 760px), (orientation: portrait) and (max-width: 1100px)'

function chapterAt(build: Build, progress: number): number {
  let index = -1
  build.chapters.forEach((chapter, n) => { if (progress >= chapter.at) index = n })
  return index
}

interface Props {
  build: Build
  /** The intro shown before the build starts: kicker, h1 (with `titleId`), lede and actions. */
  intro: ReactNode
  titleId: string
  /** Room pages run a shorter film than the home page. */
  short?: boolean
}

/**
 * A room built in stages as the visitor scrolls, from a blueprint over bare
 * studs, through a wireframe of the finished room, to the room itself. The
 * stage is sticky inside a tall section; one GSAP timeline is scrubbed by
 * ScrollTrigger. Reduced motion gets the finished room and a list of the
 * chapters, each with its still.
 */
export default function BuildFilm({ build, intro, titleId, short = false }: Props) {
  const root = useRef<HTMLElement>(null)
  const [chapter, setChapter] = useState(-1)

  useGSAP(() => {
    const section = root.current
    if (!section) return
    const mm = gsap.matchMedia()
    mm.add({ stacked: STACKED, motion: '(prefers-reduced-motion: no-preference)' }, context => {
      const { stacked, motion } = context.conditions as { stacked: boolean; motion: boolean }
      const wide = !stacked
      if (!motion) { setChapter(-1); return }
      const q = gsap.utils.selector(section)
      const header = document.querySelector<HTMLElement>('.tb-header')
      let shown = -1

      const card = q('.tb-build-blueprint')
      const held = wide
        ? { xPercent: 17, yPercent: 2, scale: 0.5, rotationY: -17, rotationX: 7, rotationZ: -3 }
        : { xPercent: 0, yPercent: -3, scale: 0.5, rotationY: -12, rotationX: 6, rotationZ: -2 }
      gsap.set(card, { ...held, transformPerspective: 1400, autoAlpha: 1 })
      gsap.set(q('.tb-build-wireframe'), { autoAlpha: 0 })
      gsap.set(q('.tb-build-fill'), { scaleX: 0 })

      // The wipes and the wireframe draw are CSS custom properties read by the
      // masks. They are tweened as plain numbers and written here, so a revert
      // or refresh can never leave a stage unmasked.
      const vars: { el: HTMLElement; name: string; state: { v: number } }[] = []
      const variable = (el: HTMLElement | undefined, name: string) => {
        if (!el) return { v: 0 }
        const item = { el, name, state: { v: 0 } }
        el.style.setProperty(name, '0')
        vars.push(item)
        return item.state
      }
      const write = (el: HTMLElement | undefined, name: string, state: { v: number }) => () => el?.style.setProperty(name, state.v.toFixed(4))
      const wireframe = q('.tb-build-wireframe')[0] as HTMLElement | undefined
      const draw = variable(wireframe, '--d')

      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: section,
          start: () => `top top+=${header?.offsetHeight ?? 0}`,
          end: 'bottom bottom',
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
        onUpdate() {
          const next = chapterAt(build, timeline.progress())
          if (next !== shown) { shown = next; setChapter(next) }
        },
      })
      timeline
        .to(q('.tb-build-media'), { scale: 1.06, duration: 1 }, 0)
        .to(q('.tb-build-fill'), { scaleX: 1, duration: 1 }, 0)
        .to(q('.tb-build-shade'), { autoAlpha: 0.35, duration: 0.1 }, 0.03)
        .to(card, { xPercent: 0, yPercent: 0, scale: 1, rotationY: 0, rotationX: 0, rotationZ: 0, duration: 0.14, ease: 'hinge' }, 0.06)
        .to(card, { autoAlpha: 0, duration: 0.07 }, 0.19)
        .to(q('.tb-build-wireframe'), { autoAlpha: 1, duration: 0.05 }, 0.17)
        .to(draw, { v: 1, duration: 0.18, ease: 'tambour', onUpdate: write(wireframe, '--d', draw) }, 0.18)
        .to(q('.tb-build-wireframe'), { autoAlpha: 0, duration: 0.06 }, 0.41)
        .to(q('.tb-build-shade'), { autoAlpha: 0.15, duration: 0.2 }, 0.6)
      for (const stage of build.stages) {
        if (!stage.wipe) continue
        const [from, to] = stage.wipe
        const layer = q(`.tb-build-wipe.is-${stage.id}`)[0] as HTMLElement | undefined
        const wipe = variable(layer, '--w')
        timeline.to(wipe, { v: 1, duration: to - from, ease: 'tambour', onUpdate: write(layer, '--w', wipe) }, from)
      }
      timeline.set({}, {}, 1)
      // Lets the frames be checked at exact positions in development.
      if (import.meta.env.DEV) ((window as unknown as { tambourBuilds?: Record<string, gsap.core.Timeline> }).tambourBuilds ??= {})[build.id] = timeline
      return () => {
        for (const item of vars) item.el.style.removeProperty(item.name)
        setChapter(-1)
      }
    })
  }, { scope: root })

  // Chapter titles are split into lines once; each time a chapter becomes
  // active its lines rise into place, the way a drawer settles.
  const splits = useRef<SplitText[]>([])
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(MOTION_OK, () => {
      splits.current = gsap.utils.toArray<HTMLElement>('.tb-build-chapters h2', root.current).map(title => SplitText.create(title, { type: 'lines', mask: 'lines', linesClass: 'tb-line' }))
      return () => { splits.current = [] }
    })
  }, { scope: root })
  useGSAP(() => {
    const split = splits.current[chapter]
    if (!split) return
    gsap.fromTo(split.lines, { yPercent: 110 }, { yPercent: 0, duration: DUR.rise, ease: 'drawer', stagger: STAGGER.lines, overwrite: true })
  }, { scope: root, dependencies: [chapter] })

  const jump = (progress: number) => {
    const section = root.current
    if (!section) return
    const header = document.querySelector<HTMLElement>('.tb-header')?.offsetHeight ?? 0
    const top = section.getBoundingClientRect().top + window.scrollY - header
    const run = section.offsetHeight - (window.innerHeight - header)
    window.scrollTo({ top: top + run * progress + 2, behavior: 'smooth' })
  }

  const chapters = build.chapters
  const last = chapters.length - 1
  const count = (n: number) => <p className="tb-build-count"><span>{String(n + 1).padStart(2, '0')}</span> / {String(chapters.length).padStart(2, '0')}</p>
  return <section ref={root} className={`tb-build ${short ? 'is-short' : ''} ${chapter >= 0 ? 'is-playing' : ''}`} aria-labelledby={titleId}>
    <div className="tb-build-stage">
      <div className="tb-build-frame">
        <div className="tb-build-media" role="img" aria-label={build.label}>
          <div className="tb-build-image">
            {build.stages.map((stage, n) => <img key={stage.id} className={`tb-build-layer ${n ? `tb-build-wipe is-${stage.id}` : ''}`} src={buildSrc(build, stage.id)} alt=""
              width="1536" height="1024" decoding="async" fetchPriority={n ? 'low' : 'high'} draggable={false} />)}
            <div className="tb-build-wireframe" aria-hidden="true">
              <img src={buildSrc(build, 'wireframe')} alt="" width="1536" height="1024" decoding="async" draggable={false} />
              <span className="tb-build-scan" />
            </div>
            <div className="tb-build-blueprint" aria-hidden="true">
              <img src={buildSrc(build, 'blueprint')} alt="" width="1536" height="1024" decoding="async" draggable={false} />
            </div>
          </div>
        </div>
        <div className="tb-build-shade" aria-hidden="true" />
      </div>

      <div className="tb-build-copy">
        <div className={`tb-build-intro ${chapter < 0 ? 'is-active' : ''}`}>
          {intro}
          <p className="tb-build-cue" aria-hidden="true"><span /> Scroll to watch it built</p>
        </div>
        <ol className="tb-build-chapters" aria-label={build.listLabel}>
          {chapters.map((item, n) => <li key={item.id} className={n === chapter ? 'is-active' : ''}>
            {count(n)}
            <h2>{item.title}{item.em && <> <em>{item.em}</em></>}</h2>
            <p>{item.body}</p>
            {n === last && <div className="tb-actions">
              <a className="tb-button tb-button-brass" href={href.page('consultation')} onClick={onLink} tabIndex={n === chapter ? 0 : -1}>Book a design consultation</a>
              {build.cta.page !== 'consultation' && <a className="tb-button tb-button-line is-light" href={href.page(build.cta.page)} onClick={onLink} tabIndex={n === chapter ? 0 : -1}>{build.cta.label}</a>}
            </div>}
          </li>)}
        </ol>
      </div>

      <div className="tb-build-progress">
        <div className="tb-build-track" aria-hidden="true"><span className="tb-build-fill" /></div>
        <ol className="tb-build-ticks">
          {chapters.map((item, n) => <li key={item.id} style={{ left: `${item.at * 100}%` }}>
            <button type="button" className={n === chapter ? 'is-active' : n < chapter ? 'is-done' : ''} onClick={() => jump(item.at + 0.02)}
              aria-current={n === chapter ? 'step' : undefined}>
              <span className="tb-visually-hidden">Go to step {n + 1}: </span>{item.title.replace(/[.,]$/, '')}
            </button>
          </li>)}
        </ol>
        <p className="tb-build-note">Illustrative build sequence · generated imagery</p>
      </div>
    </div>

    <ol className="tb-build-static" aria-label={build.listLabel}>
      {chapters.map((item, n) => <li key={item.id}>
        <img src={buildSrc(build, item.still)} alt={build.stages.find(stage => stage.id === item.still)?.alt ?? 'A blueprint perspective drawing of the room'}
          width="1536" height="1024" loading="lazy" decoding="async" />
        {count(n)}
        <h3>{item.title}{item.em && <> <em>{item.em}</em></>}</h3>
        <p>{item.body}</p>
      </li>)}
      <li className="tb-build-static-note"><p className="tb-build-note-static">Illustrative build sequence · generated imagery</p></li>
    </ol>
  </section>
}
