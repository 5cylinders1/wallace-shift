import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { approach, services } from '../../content/siteConfig'
import { renderLines } from '../../lib/textLines'
import { ContactCta } from '../ContactCta/ContactCta'
import { PageLink } from '../PageLink/PageLink'
import { ShiftQuiz } from '../ShiftQuiz/ShiftQuiz'
import { SiteFooter } from '../SiteFooter/SiteFooter'
import { getInteractiveHomeHeroSnapshot, getStaticHomeHeroSnapshot, subscribeInteractiveHomeHero } from '../Hero/homeHeroDisplay'
import { initialJourneyFrame, PROCESS_SCROLL_UNITS, sampleJourneyFrame, type JourneyFrame, type JourneyLayout } from './journeyDirector'
import { JourneyServiceRows } from './JourneyServiceRows'
import { JourneyStageArt, type JourneyStage } from './JourneyStageArt'
import './HomeJourney.css'

const LogoJourneyScene = lazy(() => import('./LogoJourneyScene'))

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error) {
    console.error('[HomeJourney] Scene failed to load', error)
    this.props.onFailure()
  }
  render() { return this.state.failed ? null : this.props.children }
}

function JourneyVisual({ frame, nearby, onFailure }: {
  frame: { current: JourneyFrame }; nearby: boolean; onFailure: () => void
}) {
  const [ready, setReady] = useState(false)
  return <div className="home-journey__visual" aria-hidden="true">
    {!ready && <img className="home-journey__loading-mark" src="/brand/wallace-shift-logo-black.svg" alt="" width="240" height="140" />}
    {nearby && <SceneBoundary onFailure={onFailure}>
      <Suspense fallback={null}><LogoJourneyScene frame={frame} onFailure={onFailure} onReady={() => setReady(true)} /></Suspense>
    </SceneBoundary>}
    {/* Cursor affordance only. The renderer owns the hit test against the
      * mark's real screen box, so both describe the same rectangle. */}
    <div className="home-journey__grip" />
  </div>
}

const processPhases = ['Identify', 'Transform', 'Resolve']
const processPanels: JourneyStage[] = ['find', 'make', 'launch']

/** One production-only visual spans the story. All copy and forms remain
 * native DOM, with a complete static layout when motion/WebGL is unavailable. */
export function HomeJourney() {
  const rootRef = useRef<HTMLDivElement>(null)
  const interactive = useSyncExternalStore(subscribeInteractiveHomeHero, getInteractiveHomeHeroSnapshot, getStaticHomeHeroSnapshot)
  const [nearby, setNearby] = useState(false)
  const [failed, setFailed] = useState(false)
  const frame = useRef({ ...initialJourneyFrame })
  // The eased charge the quiz mark carries, and the short flash each new
  // answer sends through it. Kept out of the pose sampler's own state so
  // scrolling still produces one pure, reversible frame.
  const power = useRef({ level: 0, surge: 0 })
  const powerTarget = useRef(0)
  const kickPower = useRef<() => void>(() => {})
  const live = interactive && !failed

  const handleQuizProgress = useCallback((answered: number, total: number) => {
    const next = total > 0 ? Math.max(0, Math.min(1, answered / total)) : 0
    if (next > powerTarget.current) power.current.surge = 1
    powerTarget.current = next
    kickPower.current()
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root || !live) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNearby(true); observer.disconnect() }
    }, { rootMargin: '600px 0px' })
    observer.observe(root)
    return () => observer.disconnect()
  }, [live])

  /**
   * Stacked panels hold once their own end reaches the bottom of the frame,
   * which is an offset only a panel's own height can give and no CSS length
   * knows. Live, the director owns these panels — they are absolute inside one
   * frame and wipe on its cue — so there is nothing to measure.
   */
  useEffect(() => {
    const root = rootRef.current
    if (!root || live) return
    const panels = Array.from(root.querySelectorAll<HTMLElement>('.journey-process__panel'))
    if (panels.length === 0) return
    const measure = () => {
      for (const panel of panels) {
        panel.style.setProperty('--journey-panel-height', `${panel.offsetHeight}px`)
      }
    }
    measure()
    const observer = new ResizeObserver(measure)
    for (const panel of panels) observer.observe(panel)
    return () => {
      observer.disconnect()
      for (const panel of panels) panel.style.removeProperty('--journey-panel-height')
    }
  }, [live])

  useEffect(() => {
    const root = rootRef.current
    if (!root || !interactive) return
    const section = root.querySelector<HTMLElement>('.journey-services')!
    const heading = root.querySelector<HTMLElement>('.journey-services__header')!
    const headingText = root.querySelector<HTMLElement>('#journey-services-heading')!
    const baseline = root.querySelector<HTMLElement>('.journey-services__baseline')!
    const entrance = root.querySelector<HTMLElement>('.journey-services__entrance')!
    const process = root.querySelector<HTMLElement>('.journey-process')!
    const rows = root.querySelector<HTMLElement>('.journey-services__rows')!
    const panels = Array.from(process.querySelectorAll<HTMLElement>('.journey-process__panel')).map(panel => ({
      panel, copy: panel.querySelector<HTMLElement>('.journey-process__copy')!,
      title: panel.querySelector<HTMLElement>('h2, h3')!,
      baseline: panel.querySelector<HTMLElement>('.journey-process__baseline')!,
    }))
    const quiz = root.querySelector<HTMLElement>('#shift-finder')!
    const closing = root.querySelector<HTMLElement>('.home-journey__closing')!
    const closingContent = closing.querySelector<HTMLElement>('.contact-cta__inner')!
    const closingFooter = closing.querySelector<HTMLElement>('.site-footer')!
    const closingCard = closing.querySelector<HTMLElement>('.contact-cta__form-slot')!
    let pending = 0
    let layout: JourneyLayout
    const measure = () => {
      const scroll = window.scrollY
      const top = (element: HTMLElement) => element.getBoundingClientRect().top + scroll
      layout = {
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        headerOffset: parseFloat(getComputedStyle(heading).top) || 0,
        servicesTop: top(section), servicesRowsBottom: top(rows) + rows.offsetHeight,
        servicesHeaderHeight: heading.offsetHeight,
        servicesHeadingRight: headingText.getBoundingClientRect().right,
        servicesHeadingBaseline: baseline.getBoundingClientRect().top - heading.getBoundingClientRect().top,
        entranceDistance: entrance.offsetHeight,
        processTop: top(process), processHeight: process.offsetHeight,
        processHeadingRight: Math.max(...panels.map(item => item.title.getBoundingClientRect().right)),
        quizTop: top(quiz), closingTop: top(closing), end: top(root) + root.offsetHeight,
        closingFooterTop: top(closingFooter),
        closingCardLeft: closingCard.getBoundingClientRect().left,
        closingCardTop: top(closingCard),
        closingCardWidth: closingCard.offsetWidth,
        closingCardHeight: closingCard.offsetHeight,
      }
      // The closing section sizes itself against the footer it sits above, so
      // the pair occupy exactly one screen. The footer's own height does not
      // depend on this, so the measurement settles in one pass.
      root.style.setProperty('--journey-footer-height', `${closingFooter.offsetHeight}px`)
      // The logo retains the services baseline. Align each chapter's last
      // title line to it, independent of line count or font loading.
      if (live) for (const item of panels) {
        const titleBaseline = item.baseline.getBoundingClientRect().top - item.copy.getBoundingClientRect().top
        item.panel.style.setProperty('--journey-panel-padding', `${Math.max(24, layout.servicesHeadingBaseline - titleBaseline)}px`)
      }
      const findPanel = panels[1]
      const findCopy = findPanel.copy.getBoundingClientRect()
      const findBody = findPanel.copy.querySelector<HTMLElement>('p:not([class])')!
      layout.findCopyRight = Math.max(findPanel.title.getBoundingClientRect().right, findBody.getBoundingClientRect().right)
      layout.findCopyBottom = findCopy.bottom - findPanel.panel.getBoundingClientRect().top + layout.headerOffset
    }
    const update = () => {
      pending = 0
      frame.current = sampleJourneyFrame(window.scrollY, layout, power.current)
      root.style.setProperty('--journey-visibility', String(frame.current.visible))
      root.style.setProperty('--journey-x', `${(frame.current.x + 1) * 50}%`)
      root.style.setProperty('--journey-y', `${(1 - frame.current.y) * 50}%`)
      root.style.setProperty('--journey-width', `${frame.current.scale * 100}%`)
      root.style.setProperty('--journey-finish', String(frame.current.finish))
      root.style.setProperty('--journey-services-surface', String(frame.current.servicesSurface))
      root.style.setProperty('--journey-anchor-ratio', String(frame.current.anchorScale / Math.max(.001, frame.current.scale)))
      root.style.setProperty('--journey-find-wipe', String(frame.current.findWipe))
      root.style.setProperty('--journey-make-wipe', String(frame.current.makeWipe))
      root.style.setProperty('--journey-launch-wipe', String(frame.current.launchWipe))
      // The grab area only accepts the pointer once the quiz chapter really
      // owns the mark, so it can never sit over the answers or the footer.
      const grabbable = live && frame.current.quiz > .55 ? 'true' : 'false'
      if (root.dataset.grip !== grabbable) root.dataset.grip = grabbable
    }
    const requestUpdate = () => { if (!pending) pending = requestAnimationFrame(update) }
    // Answering a question is the one thing on this page that changes the
    // mark without scrolling, so it drives its own short settle.
    let charging = 0
    let chargedAt = 0
    const advanceCharge = (now: number) => {
      charging = 0
      const delta = chargedAt ? Math.min(.1, (now - chargedAt) / 1000) : 0
      chargedAt = now
      const state = power.current
      state.level += (powerTarget.current - state.level) * (1 - Math.exp(-delta * 5.5))
      state.surge *= Math.exp(-delta * 3.2)
      if (Math.abs(powerTarget.current - state.level) < .001) state.level = powerTarget.current
      if (state.surge < .002) state.surge = 0
      update()
      if (state.level !== powerTarget.current || state.surge > 0) {
        charging = requestAnimationFrame(advanceCharge)
      } else chargedAt = 0
    }
    kickPower.current = () => {
      if (charging) return
      chargedAt = 0
      charging = requestAnimationFrame(advanceCharge)
    }
    const refresh = () => { measure(); requestUpdate() }
    measure()
    update()
    const observer = new ResizeObserver(refresh)
    for (const element of [root, heading, headingText, entrance, rows, process,
      ...panels.flatMap(item => [item.copy, item.title]), quiz, closing,
      closingContent, closingFooter, closingCard]) observer.observe(element)
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', refresh)
    // The preceding lazy hero can change length without changing this
    // element's own size. Its completed layout refresh also rebases us.
    ScrollTrigger.addEventListener('refresh', refresh)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', refresh)
      ScrollTrigger.removeEventListener('refresh', refresh)
      cancelAnimationFrame(pending)
      cancelAnimationFrame(charging)
      kickPower.current = () => {}
      delete root.dataset.grip
      frame.current = { ...frame.current, visible: 0 }
    }
  }, [frame, interactive, live])

  return (
    <div className="home-journey" data-live={live} data-scroll={interactive} ref={rootRef}>
      {live && <JourneyVisual frame={frame} nearby={nearby} onFailure={() => setFailed(true)} />}

      <section className="journey-services" id="services" aria-labelledby="journey-services-heading">
        <div className="journey-services__pin">
          <header className="journey-services__header">
            <div className="container journey-services__heading-wrap">
              <div>
                <p className="eyebrow journey-kicker">01 / What moves you forward</p>
                <h2 id="journey-services-heading">{renderLines(services.headingLines)}<span className="journey-services__baseline" aria-hidden="true" /></h2>
              </div>
              <img className="journey-static-mark" src="/brand/wallace-shift-logo-black.svg" alt="" width="180" height="105" />
            </div>
          </header>
          <div className="journey-services__entrance" aria-hidden="true" />
          <JourneyServiceRows />
        </div>
        <div className="container journey-services__links">
          {[services.detailLink, services.pricingLink].map(link => <PageLink href={link.href} key={link.href}>
            <span className="eyebrow">{link.eyebrow}</span><span>{link.label} <span aria-hidden="true">↗</span></span>
          </PageLink>)}
        </div>
      </section>

      <section className="journey-process" id="approach" aria-labelledby="journey-process-heading"
        style={{ height: live ? `calc((100svh - var(--journey-header-offset)) * ${PROCESS_SCROLL_UNITS})` : undefined }}>
        <div className="journey-process__stage">
          <header className="journey-process__panel journey-process__panel--intro">
            <div className="container">
              <div className="journey-process__copy">
                <p className="eyebrow journey-kicker">02 / How the shift happens</p>
                <h2 id="journey-process-heading">{renderLines(approach.headingLines)}<span className="journey-process__baseline" aria-hidden="true" /></h2>
                <p className="journey-process__annotation" aria-hidden="true">W / 01 — The starting point</p>
              </div>
            </div>
          </header>
          {approach.steps.map((step, index) => <article className={`journey-process__panel journey-process__step journey-process__panel--${processPanels[index]}`} key={step.index}>
            <div className="container">
              <div className="journey-process__copy">
                <p className="journey-process__phase"><span>{step.index}</span>{processPhases[index]}</p>
                <h3>{step.title}<span className="journey-process__baseline" aria-hidden="true" /></h3>
                <p>{step.description}</p>
                {index === 2 && <PageLink href="/approach" className="journey-process__link">A closer look at our approach <span aria-hidden="true">↗</span></PageLink>}
              </div>
              {/* Rendered always, not only when the scene is absent: the page
                  is prerendered with `live` false, and hiding this in CSS
                  keeps the served markup complete without a swap on hydration. */}
              <JourneyStageArt stage={processPanels[index]} />
            </div>
          </article>)}
        </div>
      </section>

      <ShiftQuiz showSpotlight={false} onProgress={handleQuizProgress} />

      <div className="home-journey__closing">
        <div className="home-journey__still-water" aria-hidden="true"><img src="/brand/wallace-shift-logo-white.svg" alt="" width="240" height="140" /></div>
        <ContactCta sceneBackground />
        <SiteFooter />
      </div>
    </div>
  )
}
