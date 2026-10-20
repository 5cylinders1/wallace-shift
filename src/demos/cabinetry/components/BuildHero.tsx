import { useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { buildChapters } from '../content'
import { href, onLink } from '../routes'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const SRC = (name: string) => `/demos/cabinetry/hero/${name}.webp`
/** Construction stages, bottom to top. Each later stage wipes in over the one before. */
const STAGES = ['framing', 'roughin', 'drywall', 'cabinetry', 'finished'] as const
/** Where each later stage's wipe runs, as fractions of the hero's scroll. */
const WIPES: Record<string, [number, number]> = { roughin: [0.33, 0.43], drywall: [0.49, 0.59], cabinetry: [0.62, 0.72], finished: [0.78, 0.88] }
const STAGE_ALT: Record<string, string> = {
  framing: 'Bare wood framing',
  roughin: 'Insulation, wiring and plumbing stubs',
  drywall: 'Primed drywall and the first cabinet boxes',
  cabinetry: 'Cabinets and the navy island installed, hood frame in raw wood',
  finished: 'The finished kitchen',
}

/** The stacked phone and portrait-tablet layout; keep in sync with tambour.css. */
const STACKED = '(max-width: 760px), (orientation: portrait) and (max-width: 1100px)'

function chapterAt(progress: number): number {
  let index = -1
  buildChapters.forEach((chapter, n) => { if (progress >= chapter.at) index = n })
  return index
}

/**
 * The home page hero: a kitchen built in stages as the visitor scrolls, from a
 * blueprint over bare studs, through a wireframe of the finished room, to the
 * kitchen itself. The stage is sticky inside a tall section; one GSAP timeline
 * is scrubbed by ScrollTrigger. Reduced motion gets the finished kitchen and a
 * list of the stages instead.
 */
export default function BuildHero() {
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
          const next = chapterAt(timeline.progress())
          if (next !== shown) { shown = next; setChapter(next) }
        },
      })
      timeline
        .to(q('.tb-build-media'), { scale: 1.06, duration: 1 }, 0)
        .to(q('.tb-build-fill'), { scaleX: 1, duration: 1 }, 0)
        .to(q('.tb-build-shade'), { autoAlpha: 0.35, duration: 0.1 }, 0.03)
        .to(card, { xPercent: 0, yPercent: 0, scale: 1, rotationY: 0, rotationX: 0, rotationZ: 0, duration: 0.14, ease: 'power1.inOut' }, 0.06)
        .to(card, { autoAlpha: 0, duration: 0.07 }, 0.19)
        .to(q('.tb-build-wireframe'), { autoAlpha: 1, duration: 0.05 }, 0.17)
        .to(draw, { v: 1, duration: 0.18, ease: 'power1.inOut', onUpdate: write(wireframe, '--d', draw) }, 0.18)
        .to(q('.tb-build-wireframe'), { autoAlpha: 0, duration: 0.06 }, 0.41)
        .to(q('.tb-build-shade'), { autoAlpha: 0.15, duration: 0.2 }, 0.6)
      for (const [stage, [from, to]] of Object.entries(WIPES)) {
        const layer = q(`.tb-build-wipe.is-${stage}`)[0] as HTMLElement | undefined
        const wipe = variable(layer, '--w')
        timeline.to(wipe, { v: 1, duration: to - from, ease: 'power1.inOut', onUpdate: write(layer, '--w', wipe) }, from)
      }
      timeline.set({}, {}, 1)
      // Lets the frames be checked at exact positions in development.
      if (import.meta.env.DEV) (window as unknown as { tambourBuild?: gsap.core.Timeline }).tambourBuild = timeline
      return () => {
        for (const item of vars) item.el.style.removeProperty(item.name)
        setChapter(-1)
      }
    })
  }, { scope: root })

  const jump = (progress: number) => {
    const section = root.current
    if (!section) return
    const header = document.querySelector<HTMLElement>('.tb-header')?.offsetHeight ?? 0
    const top = section.getBoundingClientRect().top + window.scrollY - header
    const run = section.offsetHeight - (window.innerHeight - header)
    window.scrollTo({ top: top + run * progress + 2, behavior: 'smooth' })
  }

  const last = buildChapters.length - 1
  return <section ref={root} className={`tb-build ${chapter >= 0 ? 'is-playing' : ''}`} aria-labelledby="tb-hero-title">
    <div className="tb-build-stage">
      <div className="tb-build-frame">
        <div className="tb-build-media" role="img" aria-label="A kitchen built in stages as you scroll: bare framing, rough-in, drywall, cabinetry and the finished room">
          <div className="tb-build-image">
            {STAGES.map((stage, n) => <img key={stage} className={`tb-build-layer ${n ? `tb-build-wipe is-${stage}` : ''}`} src={SRC(stage)} alt=""
              width="1536" height="1024" decoding="async" fetchPriority={n ? 'low' : 'high'} draggable={false} />)}
            <div className="tb-build-wireframe" aria-hidden="true">
              <img src={SRC('wireframe')} alt="" width="1536" height="1024" decoding="async" draggable={false} />
              <span className="tb-build-scan" />
            </div>
            <div className="tb-build-blueprint" aria-hidden="true">
              <img src={SRC('blueprint')} alt="" width="1536" height="1024" decoding="async" draggable={false} />
            </div>
          </div>
        </div>
        <div className="tb-build-shade" aria-hidden="true" />
      </div>

      <div className="tb-build-copy">
        <div className={`tb-build-intro ${chapter < 0 ? 'is-active' : ''}`}>
          <p className="tb-label">Custom cabinetry · Kitchen &amp; bath remodels · Kansas City</p>
          <h1 id="tb-hero-title" tabIndex={-1}>Made for one room. <em>Yours.</em></h1>
          <p className="tb-build-lede">Tambour designs, builds and installs custom cabinetry, and remodels the kitchens and baths around it. Every piece is drawn for your walls and made in our Kansas City workshop.</p>
          <div className="tb-actions">
            <a className="tb-button tb-button-brass" href={href.page('consultation')} onClick={onLink}>Book a design consultation</a>
            <a className="tb-button tb-button-line is-light" href={href.page('kitchens')} onClick={onLink}>See kitchens</a>
          </div>
          <p className="tb-build-cue" aria-hidden="true"><span /> Scroll to watch it built</p>
        </div>
        <ol className="tb-build-chapters" aria-label="How a Tambour kitchen is built">
          {buildChapters.map((item, n) => <li key={item.id} className={n === chapter ? 'is-active' : ''}>
            <p className="tb-build-count"><span>{String(n + 1).padStart(2, '0')}</span> / {String(buildChapters.length).padStart(2, '0')}</p>
            <h2>{item.title}{item.em && <> <em>{item.em}</em></>}</h2>
            <p>{item.body}</p>
            {n === last && <div className="tb-actions">
              <a className="tb-button tb-button-brass" href={href.page('consultation')} onClick={onLink} tabIndex={n === chapter ? 0 : -1}>Start your kitchen</a>
              <a className="tb-button tb-button-line is-light" href={href.page('kitchens')} onClick={onLink} tabIndex={n === chapter ? 0 : -1}>See kitchens</a>
            </div>}
          </li>)}
        </ol>
      </div>

      <div className="tb-build-progress">
        <div className="tb-build-track" aria-hidden="true"><span className="tb-build-fill" /></div>
        <ol className="tb-build-ticks">
          {buildChapters.map((item, n) => <li key={item.id} style={{ left: `${item.at * 100}%` }}>
            <button type="button" className={n === chapter ? 'is-active' : n < chapter ? 'is-done' : ''} onClick={() => jump(item.at + 0.02)}
              aria-current={n === chapter ? 'step' : undefined}>
              <span className="tb-visually-hidden">Go to step {n + 1}: </span>{item.title.replace(/\.$/, '')}
            </button>
          </li>)}
        </ol>
        <p className="tb-build-note">Illustrative build sequence · generated imagery</p>
      </div>
    </div>

    <ol className="tb-build-static" aria-label="From framing to finished">
      {STAGES.map(stage => <li key={stage}><img src={SRC(stage)} alt={STAGE_ALT[stage]} width="1536" height="1024" loading="lazy" decoding="async" /><span>{STAGE_ALT[stage]}</span></li>)}
    </ol>
  </section>
}
