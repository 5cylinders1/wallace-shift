import { useRef, type CSSProperties, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { process, type StepIcon } from './content'
import { clamp, roomyMotion, stepped } from './motion'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const PER_STOP = 0.75
const GAP = 44
const narrowMotion = '(prefers-reduced-motion: no-preference) and (max-width: 899px), (prefers-reduced-motion: no-preference) and (max-height: 599px)'

/** One line drawing per step, on a 24-unit grid; `cp-icon-accent` parts take the ochre. */
const ICONS: Record<StepIcon, ReactNode> = {
  // A clipboard with the scope checked off.
  estimate: (
    <>
      <rect x="5" y="4.5" width="14" height="17" rx="2" />
      <rect x="8.5" y="2.5" width="7" height="4" rx="1.2" className="cp-icon-accent" />
      <path d="M8.3 11.6l1.4 1.4 2.4-2.8M8.3 16.6l1.4 1.4 2.4-2.8M14.2 12h1.8M14.2 17h1.8" />
    </>
  ),
  // Water, then the scraper.
  wash: (
    <>
      <path d="M7.5 3c2.1 2.9 3.6 5 3.6 6.8a3.6 3.6 0 0 1-7.2 0c0-1.8 1.5-3.9 3.6-6.8z" className="cp-icon-accent" />
      <path d="M13.8 3.2c.9 1.3 1.6 2.2 1.6 3a1.6 1.6 0 0 1-3.2 0c0-.8.7-1.7 1.6-3z" />
      <rect x="17.55" y="7.85" width="2.8" height="6.4" rx="1.3" transform="rotate(45 18.95 11.05)" />
      <path d="M15.4 12.6l2 2-2.4 6.1-5.7-5.7z" />
    </>
  ),
  // A primer brush over a new board.
  prime: (
    <>
      <rect x="10.5" y="2.5" width="3" height="7" rx="1.5" />
      <rect x="9.3" y="9.5" width="5.4" height="2.6" rx="0.6" />
      <path d="M9.3 12.1h5.4v2.7c0 1-.8 1.9-1.8 1.9h-1.8c-1 0-1.8-.9-1.8-1.9z" className="cp-icon-accent" />
      <rect x="3" y="18.5" width="18" height="3" rx="0.8" />
    </>
  ),
  // The roller.
  paint: (
    <>
      <rect x="3.5" y="3.5" width="13" height="5.5" rx="1.6" className="cp-icon-accent" />
      <path d="M16.5 6.25h3a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1H12v2.75" />
      <rect x="10.5" y="14.5" width="3" height="7" rx="1.2" />
    </>
  ),
  // The house, signed off.
  done: (
    <>
      <path d="M3.5 11L12 3.8l8.5 7.2M5.5 9.5v11h13v-11" />
      <path d="M8.8 14.8l2.3 2.3 4.3-4.6" className="cp-icon-check" pathLength={1} />
    </>
  ),
}

/** Inline custom properties (`--course`) alongside ordinary styles. */
const withVars = (style: Record<string, string | number>) => style as CSSProperties
/** Problem spots the walkthrough circles, as [left, top]. */
const MARKS = [['14%', '22%'], ['76%', '58%'], ['20%', '68%']]
const DROPS = ['8%', '19%', '31%', '44%', '67%', '79%', '91%']
/** Spot-primer strokes, as [course, left %, width %]. */
const STROKES = [[0, 6, 30], [1, 52, 34], [2, 12, 24], [2, 64, 20], [3, 70, 24], [4, 4, 32], [5, 44, 40], [6, 20, 28], [6, 74, 18], [7, 58, 32]]
const COURSES = 8

/**
 * The top half of each card: a swatch of the house's siding at that stage of
 * the job, with the step happening on it. The same language as the hero: the
 * walkthrough circles problem spots on the old paint, the wash rinses the
 * grime off, primer goes on in strokes, the new color rolls on course by
 * course, and the finished corner catches the light.
 */
function Swatch({ icon, index }: { icon: StepIcon; index: number }) {
  return (
    <div className={`cp-step-panel is-${icon}`} aria-hidden="true">
      {icon === 'estimate' && (
        <>
          <span className="cp-panel-light" />
          {MARKS.map(([left, top]) => <i key={left} className="cp-panel-mark" style={{ left, top }} />)}
        </>
      )}
      {icon === 'wash' && (
        <>
          <span className="cp-panel-dirt" />
          <span className="cp-panel-sheen" />
          {DROPS.map((left) => <i key={left} className="cp-panel-drop" style={{ left }} />)}
        </>
      )}
      {icon === 'prime' && STROKES.map(([course, left, width]) => (
        <i key={`${course}-${left}`} className="cp-panel-stroke" style={withVars({ '--course': course, left: `${left}%`, width: `${width}%` })} />
      ))}
      {icon === 'paint' && Array.from({ length: COURSES }, (_, course) => (
        <i key={course} className={`cp-panel-course${course >= COURSES / 2 ? ' is-later' : ''}`} style={withVars({ '--course': course, transformOrigin: course % 2 ? '100% 50%' : '0% 50%' })} />
      ))}
      {icon === 'done' && (
        <>
          <span className="cp-panel-fascia" />
          <span className="cp-panel-trim" />
          <span className="cp-panel-gloss" />
        </>
      )}
      <span className="cp-panel-boards" />
      <span className="cp-panel-number">0{index + 1}</span>
      <span className="cp-panel-badge"><svg viewBox="0 0 24 24">{ICONS[icon]}</svg></span>
    </div>
  )
}

/** Each swatch's step as a looping timeline, paused until its card is the one in view. */
function loopFor(panel: HTMLElement, icon: StepIcon) {
  const q = gsap.utils.selector(panel)
  const width = () => panel.offsetWidth
  const height = () => panel.offsetHeight
  // Until a loop first plays, its swatch keeps the composed resting state from the CSS.
  const loop = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.5, defaults: { immediateRender: false } })
  if (icon === 'estimate') {
    loop
      .fromTo(q('.cp-panel-light'), { x: () => -width() * 0.5 }, { x: () => width(), duration: 3.2, ease: 'sine.inOut' })
      .fromTo(q('.cp-panel-mark'), { scale: 0.3, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.45, stagger: 0.7, ease: 'back.out(2.4)' }, 0.5)
      .to(q('.cp-panel-mark'), { autoAlpha: 0, duration: 0.5, ease: 'power1.in' }, '+=1.1')
  } else if (icon === 'wash') {
    loop
      .fromTo(q('.cp-panel-sheen'), { y: () => -height() }, { y: () => height(), duration: 2.4, ease: 'none' }, 0)
      .fromTo(q('.cp-panel-dirt'), { autoAlpha: 1 }, { autoAlpha: 0, duration: 1.8, ease: 'power1.inOut' }, 0.3)
      .fromTo(q('.cp-panel-drop'), { y: -24, autoAlpha: 1 }, { y: () => height() + 12, duration: 1.1, ease: 'power1.in', stagger: { each: 0.2, from: 'random' } }, 0.2)
      .to(q('.cp-panel-dirt'), { autoAlpha: 1, duration: 0.9, ease: 'power1.inOut' }, '+=1.2')
  } else if (icon === 'prime') {
    loop
      .fromTo(q('.cp-panel-stroke'), { scaleX: 0, autoAlpha: 1 }, { scaleX: 1, duration: 0.5, stagger: 0.17, ease: 'power2.out' })
      .to(q('.cp-panel-stroke'), { autoAlpha: 0, duration: 0.7, ease: 'power1.inOut' }, '+=1.4')
  } else if (icon === 'paint') {
    loop
      .fromTo(q('.cp-panel-course'), { scaleX: 0, autoAlpha: 1 }, { scaleX: 1, duration: 0.6, stagger: 0.24, ease: 'power1.inOut' })
      .to(q('.cp-panel-course'), { autoAlpha: 0, duration: 0.8, ease: 'power1.inOut' }, '+=1.4')
  } else {
    loop
      .fromTo(q('.cp-panel-gloss'), { x: () => -width() * 0.45 }, { x: () => width() * 1.1, duration: 2.8, ease: 'sine.inOut' })
      .fromTo(q('.cp-icon-check'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out' }, 0.4)
      .to(q('.cp-icon-check'), { strokeDashoffset: -1, duration: 0.5, ease: 'power2.in' }, '+=1.6')
  }
  return loop
}

/**
 * The repaint's steps on the inside of a curved wall. On wide screens the
 * section pins and the view pans along the wall one step at a time, the way
 * you'd turn to look around a room. Narrower screens list the steps and tilt
 * each into place; reduced motion gets the plain list.
 */
export default function Process() {
  const root = useRef<HTMLElement>(null)

  useGSAP(() => {
    const section = root.current
    if (!section) return
    const media = gsap.matchMedia()

    media.add(roomyMotion, () => {
      const world = section.querySelector<HTMLElement>('.cp-ring-world')
      const cards = gsap.utils.toArray<HTMLElement>('.cp-steps > li', section)
      if (!world || !cards.length) return
      section.classList.add('is-ring')
      // `enter` swings the wall round as the section arrives; `progress` pans along it while pinned.
      const view = { enter: -1.4, progress: 0 }
      // Only the card facing you plays its step, and only while the wall is on screen.
      const loops = cards.map((card, index) => loopFor(card.querySelector<HTMLElement>('.cp-step-panel')!, process[index].icon))
      let front = -1
      let onScreen = false
      const syncLoops = () => loops.forEach((loop, index) => (onScreen && index === front ? loop.play() : loop.pause()))

      const place = () => {
        const width = cards[0].offsetWidth
        const radius = Math.max(900, width * 2.9)
        const step = (width + GAP) / radius
        const at = view.enter + stepped(view.progress, cards.length, 0.65)
        world.style.transform = `translateZ(${radius.toFixed(1)}px) rotateY(${(at * step).toFixed(4)}rad)`
        cards.forEach((card, index) => {
          const off = Math.abs(index - at)
          card.style.transform = `rotateY(${(-index * step).toFixed(4)}rad) translateZ(${(-radius).toFixed(1)}px)`
          const opacity = clamp(1 - (off - 0.6) * 0.45)
          card.style.opacity = opacity.toFixed(3)
          card.style.visibility = opacity <= 0.001 ? 'hidden' : ''
          card.classList.toggle('is-front', off < 0.5)
        })
        const facing = Math.abs(at - Math.round(at)) < 0.5 ? Math.round(at) : -1
        if (facing !== front) {
          front = facing
          syncLoops()
        }
      }

      gsap.to(view, { enter: 0, ease: 'none', onUpdate: place, scrollTrigger: { trigger: section, start: 'top bottom', end: 'top top', scrub: 0.6 } })
      const tween = gsap.to(view, { progress: 1, ease: 'none', onUpdate: place })
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: () => `+=${(cards.length - 1) * PER_STOP * window.innerHeight}`,
        pin: true,
        scrub: 0.8,
        animation: tween,
        invalidateOnRefresh: true,
        onRefresh: place,
      })
      ScrollTrigger.create({ trigger: section, start: 'top bottom', end: 'bottom top', onToggle: ({ isActive }) => { onScreen = isActive; syncLoops() } })
      place()

      return () => {
        section.classList.remove('is-ring')
        world.style.removeProperty('transform')
        cards.forEach((card) => {
          card.style.removeProperty('transform')
          card.style.removeProperty('opacity')
          card.style.removeProperty('visibility')
          card.classList.remove('is-front')
        })
      }
    })

    media.add(narrowMotion, () => {
      gsap.utils.toArray<HTMLElement>('.cp-steps > li', section).forEach((card, index) => {
        gsap.fromTo(card,
          { autoAlpha: 0, rotationY: -28, z: -160, x: 40, transformPerspective: 900, transformOrigin: '0% 50%' },
          { autoAlpha: 1, rotationY: 0, z: 0, x: 0, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'top 70%', scrub: 0.5 } })
        const loop = loopFor(card.querySelector<HTMLElement>('.cp-step-panel')!, process[index].icon)
        ScrollTrigger.create({ trigger: card, start: 'top 85%', end: 'bottom 15%', onToggle: ({ isActive }) => (isActive ? loop.play() : loop.pause()) })
      })
    })

    return () => media.revert()
  }, { scope: root })

  return (
    <section ref={root} id="process" className="cp-process" aria-labelledby="cp-process-title">
      <div className="cp-process-inner">
        <div className="cp-section-head">
          <p className="cp-eyebrow" data-near>Process</p>
          <h2 id="cp-process-title" data-near>What a full repaint <em>involves.</em></h2>
          <p data-near>The same steps you watched at the top of the page, in order.</p>
        </div>
        <div className="cp-ring">
          <div className="cp-ring-world">
            <ol className="cp-steps">
              {process.map((step, index) => (
                <li key={step.title}>
                  <Swatch icon={step.icon} index={index} />
                  <div className="cp-step-copy">
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
