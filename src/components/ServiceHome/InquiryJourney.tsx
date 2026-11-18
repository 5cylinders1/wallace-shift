import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { TeamPortrait } from './JourneyArtwork'
import './inquiry-journey.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const steps = [
  { title: 'Capture the request.', text: 'A customer describes the job on their phone. Their details become one inquiry your team can act on.', scope: 'Inquiry capture in both packages' },
  { title: 'Give the inquiry a next step.', text: 'A confirmation lets the customer know their request arrived. An agreed follow up can keep the conversation moving.', scope: 'One automatic workflow in the $1,500 package' },
  { title: 'Put it in the right hands.', text: 'The request and any replies reach the agreed inbox, ready for your team to continue the conversation.', scope: 'An agreed inquiry destination in both packages' },
]
const clamp = gsap.utils.clamp(0, 1)

function JourneyIcon({ kind }: { kind: 'check' | 'envelope' | 'bell' | 'sms' | 'phone' }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'check' && <path d="m5 12 4 4L19 6" />}
    {kind === 'envelope' && <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></>}
    {kind === 'bell' && <><path d="M6 9a6 6 0 0 1 12 0v6l2 3H4l2-3V9Zm4 12h4" /><path d="M12 2v1" /></>}
    {kind === 'sms' && <><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 3v-3H3V6a2 2 0 0 1 2-2Z" /><path d="M7 9h10M7 13h6" /></>}
    {kind === 'phone' && <path d="m8 3 3 5-3 2c2 3 3 4 6 6l2-3 5 3c0 3-2 5-5 4C10 18 6 14 4 8 3 5 5 3 8 3Z" />}
  </svg>
}

function CustomerPhone() {
  return <div className="ij-customer">
    <div className="ij-phone-art">
      <div className="ij-phone">
        <div className="ij-phone-camera" aria-hidden="true" />
        <div className="ij-phone-screen">
          <div className="ij-phone-brand"><svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m2 10 8-7 8 7M5 9v8h10V9M8 17v-5h4v5" /></svg>Northvane Roofing</div>
          <span className="ij-phone-eyebrow">ROOF REPAIR REQUEST</span>
          <strong className="ij-phone-title">A little detail.<br />A clearer next step.</strong>
          <dl className="ij-phone-fields"><div><dt>What needs attention?</dt><dd>Water around a skylight</dd></div><div><dt>Your name</dt><dd>Alex Morgan</dd></div><div><dt>Preferred contact</dt><dd>Email</dd></div></dl>
          <div className="ij-phone-send"><JourneyIcon kind="check" />Sample form completed</div>
        </div>
      </div>
    </div>
    <p className="ij-station-label"><span className="ij-station-number">01</span>The customer<span>A completed form on their phone</span></p>
  </div>
}

function InquiryRecord() {
  return <div className="ij-record-station">
    <div className="ij-record-space">
      <div className="ij-envelope-dock" aria-hidden="true"><JourneyIcon kind="envelope" /><span>The inquiry</span></div>
      <article className="ij-record" aria-label="Fictional lead details">
        <span className="ij-record-status">FICTIONAL LEAD · ROOF REPAIR</span>
        <strong>Water around<br />a skylight</strong>
        <div className="ij-pills"><span className="ij-urgent">Urgent leak</span><span>Email preferred</span></div>
        <dl className="ij-contact"><div><dt>Name</dt><dd>Alex Morgan</dd></div><div><dt>Phone</dt><dd>(816) 555 0142</dd></div><div><dt>Address</dt><dd>123 Example Lane<br />Kansas City, MO</dd></div></dl>
        <p className="ij-job-note">Water entering the upstairs bedroom after last night’s rain. Homeowner is on site.</p>
        <span className="ij-record-tag"><JourneyIcon kind="check" />Contact and project details together</span>
      </article>
    </div>
    <div className="ij-email-example"><span>02 · EXAMPLE CONFIRMATION EMAIL</span><p>“Thanks, Alex. We have your roof repair request.”</p><small>If there is no reply, a follow up can run at the agreed time.</small></div>
  </div>
}

function TeamDestination() {
  return <div className="ij-team">
    <div className="ij-team-portrait"><TeamPortrait /><span className="ij-team-badge"><JourneyIcon kind="check" /></span></div>
    <p className="ij-station-label"><span className="ij-station-number">03</span>Your roofing team<span>The agreed person or inbox</span></p>
    <div className="ij-delivery-options">
      <p>Choose how your team is notified</p>
      <ul aria-label="Notification options"><li><JourneyIcon kind="bell" /><span>In app notification</span></li><li><JourneyIcon kind="sms" /><span>SMS</span></li><li><JourneyIcon kind="envelope" /><span>Email</span></li><li><JourneyIcon kind="phone" /><span>Phone call</span></li></ul>
      <small>Channel, setup and any usage costs agreed in scope.</small>
    </div>
  </div>
}

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
    const record = host.querySelector<HTMLElement>('.ij-record')!
    const dock = host.querySelector<HTMLElement>('.ij-envelope-dock')!
    const email = host.querySelector<HTMLElement>('.ij-email-example')!
    const portrait = host.querySelector<HTMLElement>('.ij-team-portrait')!
    const options = host.querySelector<HTMLElement>('.ij-delivery-options')!
    const source = host.querySelector<HTMLElement>('.ij-phone-send')!
    const slot = host.querySelector<HTMLElement>('.ij-record-space')!
    const target = host.querySelector<SVGGraphicsElement>('.ij-portrait-envelope')!
    const paths = [...host.querySelectorAll<SVGPathElement>('.ij-route-segment')]
    const ink = [...host.querySelectorAll<SVGPathElement>('.ij-route-ink')]
    const svg = host.querySelector<SVGSVGElement>('.ij-route')!
    const lines = host.querySelector<SVGSVGElement>('.ij-route-lines')!
    const traveler = host.querySelector<SVGGElement>('.ij-traveler')!
    const captions = [...host.querySelectorAll<HTMLElement>('.ij-caption-copy')]
    const explanations = [...host.querySelectorAll<HTMLElement>('.ij-explanation-copy')]
    const counter = host.querySelector<HTMLElement>('.ij-progress-count')!
    const media = gsap.matchMedia()
    let disposed = false

    media.add({ all: '(min-width: 0px)', reduce: '(prefers-reduced-motion: reduce)', wide: '(min-width: 901px)' }, context => {
      const { reduce, wide } = context.conditions!
      host.dataset.motion = reduce ? 'reduced' : 'scroll'
      const held = canPin && !reduce
      const center = (element: Element) => {
        const a = element.getBoundingClientRect(), b = scene.getBoundingClientRect()
        return { x: a.x - b.x + a.width / 2, y: a.y - b.y + a.height / 2 }
      }
      const lengths = [1, 1]
      let lastStage = -1
      let deliveryScale = { x: 1, y: 1 }
      const measure = () => {
        const a = center(source), b = center(slot), c = center(target)
        const targetBounds = target.getBoundingClientRect()
        deliveryScale = { x: targetBounds.width / 44, y: targetBounds.height / 34 }
        const halfCard = slot.getBoundingClientRect().width / 2
        const lane = Math.min(scene.clientWidth - 12, b.x + halfCard + 40)
        const leftLane = Math.max(12, b.x - halfCard - 40)
        svg.setAttribute('viewBox', `0 0 ${scene.clientWidth} ${scene.clientHeight}`)
        lines.setAttribute('viewBox', svg.getAttribute('viewBox')!)
        // The second leg exits behind the card's right edge, then visibly
        // meets the envelope held by the recipient, above the inbox surface.
        const d = wide ? [
          `M${a.x} ${a.y} C${a.x + 90} ${a.y},${b.x - 100} ${b.y},${b.x} ${b.y}`,
          `M${b.x} ${b.y} C${b.x + 100} ${b.y},${c.x - 80} ${c.y},${c.x} ${c.y}`,
        ] : [
          `M${a.x} ${a.y} C${leftLane} ${a.y},${leftLane} ${a.y + 50},${leftLane} ${a.y + 90} V${b.y - 60} Q${leftLane} ${b.y} ${b.x} ${b.y}`,
          `M${b.x} ${b.y} C${lane} ${b.y},${lane} ${b.y + 50},${lane} ${b.y + 90} V${c.y - 60} Q${lane} ${c.y} ${c.x} ${c.y}`,
        ]
        paths.forEach((path, i) => { path.setAttribute('d', d[i]); ink[i].setAttribute('d', d[i]); lengths[i] = path.getTotalLength() })
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
        const landing = leg === 1 ? clamp((second - .75) / .25) : 0
        const scaleX = 1 + landing * (deliveryScale.x - 1)
        const scaleY = 1 + landing * (deliveryScale.y - 1)
        const travelVisible = p > .08 && p < .315 || p >= .64 && p < .94
        // Card expansion reserves its final layout footprint, so the recipient
        // and its measured delivery anchor never shift as the lead opens.
        gsap.set(record, { scale: .16 + opening * .84, y: (1 - opening) * -20, opacity: opening, visibility: opening > 0 ? 'visible' : 'hidden', transformOrigin: '50% 50%' })
        gsap.set(dock, { opacity: 1 - opening, scale: 1 - opening * .15 })
        gsap.set(email, { opacity: opening, y: (1 - opening) * 8 })
        gsap.set(traveler, { attr: { transform: `translate(${point.x} ${point.y}) scale(${scaleX} ${scaleY})` }, opacity: travelVisible ? 1 - clamp((p - .91) / .03) : 0 })
        // Until it clears the lead, the outbound envelope is behind the card.
        svg.style.zIndex = leg === 1 && second < .45 ? '2' : '5'
        ink.forEach((path, i) => { path.style.strokeDasharray = `${lengths[i]}`; path.style.strokeDashoffset = `${lengths[i] * (1 - (i === 0 ? first : second))}` })
        portrait.style.setProperty('--ij-arrival', `${delivered}`)
        portrait.classList.toggle('has-arrived', delivered > .25)
        options.classList.toggle('has-arrived', delivered > .25)
        host.dataset.stage = `${stage + 1}`
        if (stage !== lastStage) {
          captions.forEach((el, i) => { el.style.visibility = i === stage ? 'visible' : 'hidden'; el.setAttribute('aria-hidden', `${i !== stage}`) })
          explanations.forEach((el, i) => { el.style.visibility = i === stage ? 'visible' : 'hidden'; el.setAttribute('aria-hidden', `${i !== stage}`) })
          counter.textContent = `0${stage + 1} / 03`
          lastStage = stage
        }
      }
      measure()
      if (reduce) {
        gsap.set([record, email], { clearProps: 'all' })
        captions.forEach(el => { el.style.visibility = 'visible'; el.removeAttribute('aria-hidden') })
        explanations.forEach(el => { el.style.visibility = 'visible'; el.removeAttribute('aria-hidden') })
        gsap.set(dock, { opacity: 0 })
        gsap.set(traveler, { opacity: 0 })
        portrait.classList.add('has-arrived'); options.classList.add('has-arrived')
        host.dataset.stage = '3'
        return
      }
      const trigger = ScrollTrigger.create({
        id: 'inquiry-journey',
        trigger: held ? pin.current : scene,
        pin: held ? pin.current : false,
        pinSpacing: true,
        anticipatePin: 1,
        start: held ? () => `top ${storyTop()}px` : 'top 65%',
        end: held ? () => `+=${window.innerHeight * 1.5}` : () => `top+=${center(target).y} 55%`,
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
          <div ref={heading} className="r-section-head ij-heading"><h2 id="inquiry-heading">The website is the start.<br /><em>Here is what comes next.</em></h2><p>From a customer’s phone to a conversation with your team. Follow one roof repair request.</p></div>
          <div ref={pin} className="ij-story-pin">
            <div ref={story} id="inquiry-story" className="ij-story">
              <div className="ij-caption"><div className="ij-caption-stack">{steps.map((step, i) => <div className="ij-caption-copy" key={step.title} aria-hidden={i !== 0}><span className="ij-scope">{step.scope}</span><h3>{step.title}</h3></div>)}</div><div className="ij-scroll-cue"><span className="ij-progress-count" aria-hidden="true">01 / 03</span><span>Scroll to follow the inquiry ↓</span><a href="#guarantee">Skip demonstration</a></div></div>
              <div className="ij-scene">
                <div className="ij-scene-note">ILLUSTRATIVE EMAIL WORKFLOW<span>Fictional details. Nothing is collected or sent.</span></div>
                <svg className="ij-route-lines" fill="none" aria-hidden="true">{[0, 1].map(i => <g key={i}><path className="ij-route-segment" /><path className="ij-route-ink" /></g>)}</svg>
                <svg className="ij-route" fill="none" aria-hidden="true"><g className="ij-traveler"><rect x="-22" y="-17" width="44" height="34" rx="4" fill="#175c99" stroke="white" strokeWidth="1.5" /><path d="m-21-13 21 17 21-17" stroke="white" strokeWidth="1.5" strokeLinejoin="round" /></g></svg>
                <CustomerPhone /><InquiryRecord /><TeamDestination />
              </div>
              <div className="ij-explanation">{steps.map((step, i) => <p className="ij-explanation-copy" key={step.title} aria-hidden={i !== 0}>{step.text}{i === 2 && <small>A reply stops this sample sequence. The original inquiry can already be available to the team.</small>}</p>)}</div>
            </div>
          </div>
        </div>
        <p className="ij-package-note"><strong>Website package?</strong> The inquiry goes straight to your agreed inbox for your team to reply. The $1,500 setup adds one agreed automatic workflow. Channels, timing and stop conditions are scoped before setup.</p>
        <ol className="p-visually-hidden" aria-label="Inquiry journey summary">{steps.map(step => <li key={step.title}>{step.title} {step.text} {step.scope}.</li>)}</ol>
      </div>
    </div>
  </section>
}
