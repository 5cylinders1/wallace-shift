import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { TeamPortrait } from './JourneyArtwork'
import './inquiry-journey.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

// One picture, heading, sentence and package per step. Each claim traces to the
// package scope in src/content/packagePurchase.ts: capture and delivery are in
// both packages; the confirmation and follow up are the lead page's one workflow.
const steps = [
  { title: 'Capture the request.', text: 'A customer describes the job on their phone and sends it.', scope: 'Both packages' },
  { title: 'Confirm and follow up.', text: 'They get a confirmation right away. If they don’t reply, follow up goes out at the agreed time and stops when they do.', scope: 'Lead page only' },
  { title: 'Hand it to your team.', text: 'The request reaches your inbox, ready for your team to pick up the conversation.', scope: 'Both packages' },
]
const clamp = gsap.utils.clamp(0, 1)

function CheckIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6" /></svg>
}

function CustomerPhone() {
  return <div className="ij-phone-art">
    <div className="ij-phone">
      <div className="ij-phone-camera" />
      <div className="ij-phone-screen">
        <div className="ij-phone-brand"><svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" focusable="false"><path d="m2 10 8-7 8 7M5 9v8h10V9M8 17v-5h4v5" /></svg>Northvane Roofing</div>
        <span className="ij-phone-eyebrow">ROOF REPAIR REQUEST</span>
        <dl className="ij-phone-fields"><div><dt>What needs attention?</dt><dd>Water around a skylight</dd></div><div><dt>Your name</dt><dd>Alex Morgan</dd></div><div><dt>Preferred contact</dt><dd>Email</dd></div></dl>
        <span className="ij-phone-send">Send request</span>
      </div>
    </div>
  </div>
}

function Confirmation() {
  return <div className="ij-mail">
    <div className="ij-mail-follow-up" />
    <div className="ij-mail-card">
      <div className="ij-mail-from"><span className="ij-mail-avatar">N</span><span><strong>Northvane Roofing</strong><small>To Alex Morgan</small></span></div>
      <p className="ij-mail-body">Thanks, Alex. We have your roof repair request.</p>
      <span className="ij-mail-line" /><span className="ij-mail-line" />
    </div>
  </div>
}

function Team() {
  return <div className="ij-team-portrait"><TeamPortrait /><span className="ij-team-badge"><CheckIcon /></span></div>
}

const pictures = [CustomerPhone, Confirmation, Team]

export default function InquiryJourney() {
  const root = useRef<HTMLElement>(null)
  const heading = useRef<HTMLDivElement>(null)
  const pin = useRef<HTMLDivElement>(null)
  const story = useRef<HTMLDivElement>(null)
  const completed = useRef(false)
  const [canPin, setCanPin] = useState(false)

  const storyTop = () => {
    const headerHeight = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-height')) || 0
    return headerHeight + (heading.current?.offsetHeight ?? 0)
  }

  // Measure natural content, not the wrapper whose height GSAP sets when
  // pinned. Reserve space for both headings beneath the site's fixed header.
  useEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        setCanPin(window.innerWidth > 900 && (story.current?.offsetHeight ?? Infinity) + storyTop() + 16 <= window.innerHeight)
      })
    }
    const observer = new ResizeObserver(update)
    if (story.current) observer.observe(story.current)
    if (heading.current) observer.observe(heading.current)
    ScrollTrigger.addEventListener('refresh', update)
    window.addEventListener('resize', update)
    update()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      ScrollTrigger.removeEventListener('refresh', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  useGSAP(() => {
    const host = root.current!
    const scene = host.querySelector<HTMLElement>('.ij-scene')!
    const items = [...host.querySelectorAll<HTMLElement>('.ij-step')]
    const frames = items.map(item => item.querySelector<HTMLElement>('.ij-frame')!)
    const stops = items.map(item => item.querySelector<HTMLElement>('.ij-stop')!)
    const mail = host.querySelector<HTMLElement>('.ij-mail')!
    const portrait = host.querySelector<HTMLElement>('.ij-team-portrait')!
    const paths = [...host.querySelectorAll<SVGPathElement>('.ij-route-segment')]
    const ink = [...host.querySelectorAll<SVGPathElement>('.ij-route-ink')]
    const svg = host.querySelector<SVGSVGElement>('.ij-route')!
    const lines = host.querySelector<SVGSVGElement>('.ij-route-lines')!
    const traveler = host.querySelector<SVGGElement>('.ij-traveler')!
    const media = gsap.matchMedia()
    let disposed = false

    // `all` always matches, so the callback also runs on narrow screens with motion.
    media.add({ all: '(min-width: 0px)', reduce: '(prefers-reduced-motion: reduce)', wide: '(min-width: 901px)' }, context => {
      const { reduce, wide } = context.conditions!
      host.dataset.motion = reduce ? 'reduced' : 'scroll'
      const held = canPin && !reduce
      const travelerScale = wide ? 1 : .75
      const lengths = [1, 1]
      let lastStage = -1
      const local = (element: Element) => {
        const a = element.getBoundingClientRect(), b = scene.getBoundingClientRect()
        return { left: a.left - b.left, right: a.right - b.left, x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 }
      }
      // Frames share one row on wide screens and one pitch when stacked, so
      // both legs are straight and the same length by construction.
      const measure = () => {
        const box = `0 0 ${scene.clientWidth} ${scene.clientHeight}`
        svg.setAttribute('viewBox', box)
        lines.setAttribute('viewBox', box)
        const d = [0, 1].map(i => {
          if (wide) {
            const a = local(frames[i]), b = local(frames[i + 1])
            return `M${a.right} ${a.y} H${b.left}`
          }
          const a = local(stops[i]), b = local(stops[i + 1])
          return `M${a.x} ${a.y} V${b.y}`
        })
        paths.forEach((path, i) => { path.setAttribute('d', d[i]); ink[i].setAttribute('d', d[i]); lengths[i] = path.getTotalLength() })
      }
      const setStage = (stage: number) => {
        items.forEach((item, i) => { item.dataset.state = i === stage ? 'current' : i < stage ? 'reached' : 'ahead' })
        host.dataset.stage = `${stage + 1}`
      }
      const paint = (progress: number) => {
        // Completion belongs to this visit, not a particular trigger. Keep
        // the full delivery after backscroll, resize or preference changes.
        if (progress >= 1) completed.current = true
        const p = completed.current ? 1 : progress
        const first = clamp((p - .08) / .23)
        const opening = clamp((p - .31) / .13)
        const second = clamp((p - .64) / .25)
        const delivered = clamp((p - .87) / .06)
        const stage = p < .31 ? 0 : p < .64 ? 1 : 2
        const leg = p < .64 ? 0 : 1
        const point = paths[leg].getPointAtLength(lengths[leg] * (leg === 0 ? first : second))
        const travelVisible = p > .08 && p < .315 || p >= .64 && p < .94
        mail.style.setProperty('--ij-opening', `${opening}`)
        gsap.set(traveler, { attr: { transform: `translate(${point.x} ${point.y}) scale(${travelerScale})` }, opacity: travelVisible ? 1 - clamp((p - .91) / .03) : 0 })
        ink.forEach((path, i) => { path.style.strokeDasharray = `${lengths[i]}`; path.style.strokeDashoffset = `${lengths[i] * (1 - (i === 0 ? first : second))}` })
        portrait.style.setProperty('--ij-arrival', `${delivered}`)
        portrait.classList.toggle('has-arrived', delivered > .25)
        if (stage !== lastStage) { setStage(stage); lastStage = stage }
      }
      measure()
      if (reduce) {
        // A static diagram: every step in full, both lines drawn, nothing moving.
        items.forEach(item => { item.dataset.state = 'current' })
        host.dataset.stage = '3'
        ink.forEach(path => { path.style.strokeDasharray = 'none'; path.style.strokeDashoffset = '0' })
        gsap.set(traveler, { opacity: 0 })
        mail.style.removeProperty('--ij-opening')
        portrait.style.setProperty('--ij-arrival', '1')
        portrait.classList.add('has-arrived')
        const observer = new ResizeObserver(measure)
        observer.observe(scene)
        return () => { observer.disconnect(); delete host.dataset.motion }
      }
      const trigger = ScrollTrigger.create({
        id: 'inquiry-journey',
        trigger: held ? pin.current : scene,
        pin: held ? pin.current : false,
        pinSpacing: true,
        anticipatePin: 1,
        start: held ? () => `top ${storyTop()}px` : 'top 65%',
        end: held ? () => `+=${window.innerHeight * 1.5}` : () => `top+=${local(frames[2]).y} 55%`,
        onUpdate: self => paint(self.progress),
        onRefresh: self => { measure(); paint(self.progress) },
      })
      paint(trigger.progress)
      return () => { trigger.kill(); delete host.dataset.motion }
    })
    let refreshFrame = 0
    const refresh = () => {
      cancelAnimationFrame(refreshFrame)
      refreshFrame = requestAnimationFrame(() => { if (!disposed) ScrollTrigger.refresh() })
    }
    void document.fonts.ready.then(refresh)
    // Comparison expansion and package reordering above this section can move
    // its start without resizing the window.
    const upstream = new ResizeObserver(refresh)
    let previous = host.previousElementSibling
    while (previous) { upstream.observe(previous); previous = previous.previousElementSibling }
    return () => { disposed = true; cancelAnimationFrame(refreshFrame); upstream.disconnect(); media.revert() }
  }, { scope: root, dependencies: [canPin], revertOnUpdate: true })

  return <section ref={root} className="r-section r-light ij-section" id="work" aria-labelledby="inquiry-heading">
    <div className="r-wrap">
      <div className="ij-demo">
        <div className="ij-scroll-track" data-held={canPin}>
          <div ref={heading} className="r-section-head ij-heading"><h2 id="inquiry-heading">The website is the start.<br /><em>Here is what comes next.</em></h2></div>
          <div ref={pin} className="ij-story-pin">
            <div ref={story} id="inquiry-story" className="ij-story">
              <div className="ij-story-bar"><p className="ij-scene-note">An illustration with fictional details. Nothing is sent.</p><p className="ij-scroll-cue"><span>Scroll to follow the request ↓</span><a href="#guarantee">Skip demonstration</a></p></div>
              <div className="ij-scene">
                <svg className="ij-route-lines" fill="none" aria-hidden="true">{[0, 1].map(i => <g key={i}><path className="ij-route-segment" /><path className="ij-route-ink" /></g>)}</svg>
                <ol className="ij-steps">
                  {steps.map((step, i) => {
                    const Picture = pictures[i]
                    return <li className="ij-step" key={step.title}>
                      <div className="ij-frame" aria-hidden="true"><Picture /></div>
                      <span className="ij-stop" aria-hidden="true" />
                      <h3><span className="ij-step-number" aria-hidden="true">{`0${i + 1}`}</span>{step.title}</h3>
                      <p className="ij-chip">{step.scope}</p>
                      <p className="ij-step-text">{step.text}</p>
                    </li>
                  })}
                </ol>
                <svg className="ij-route" fill="none" aria-hidden="true"><g className="ij-traveler"><rect x="-22" y="-17" width="44" height="34" rx="4" fill="#175c99" stroke="white" strokeWidth="1.5" /><path d="m-21-13 21 17 21-17" stroke="white" strokeWidth="1.5" strokeLinejoin="round" /></g></svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
}
