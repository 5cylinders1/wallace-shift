import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { paths, stewardship } from './content'
import './service-journey.css'

const SurveyDrone = lazy(() => import('./SurveyDrone'))
const clamp = (value: number) => Math.max(0, Math.min(1, value))

class FlightBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? null : this.props.children }
}

function DroneDrawing() {
  return <svg viewBox="0 0 320 170" fill="none" aria-hidden="true">
    <g stroke="#98b3aa" strokeWidth="2">
      <path d="m139 73-49-31m90 31 49-31m-90 51-51 24m92-24 51 24" strokeWidth="9" stroke="#2d4245" />
      <ellipse cx="86" cy="41" rx="39" ry="12" /><ellipse cx="233" cy="41" rx="39" ry="12" />
      <ellipse cx="84" cy="132" rx="39" ry="12" /><ellipse cx="235" cy="132" rx="39" ry="12" />
      <path d="M86 33v15m147-15v15M84 124v15m151-15v15" stroke="#c2d0c7" strokeWidth="6" />
      <path d="m139 65 41 0 12 22-9 22h-47l-10-22z" fill="#27373a" />
      <path d="m144 71 32 0 7 12h-46z" fill="#536663" stroke="none" />
      <path d="m140 108-5 18h14m31-18 5 18h-14" />
      <rect x="149" y="108" width="22" height="20" rx="5" fill="#182a2d" />
      <circle cx="160" cy="118" r="6" fill="#588b83" />
    </g>
  </svg>
}

export default function ServiceJourney() {
  const section = useRef<HTMLElement>(null)
  const scene = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const flight = useRef({ progress: 0, bank: 0 })
  const [inView, setInView] = useState(false)
  const [loadScene, setLoadScene] = useState(false)
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [glReady, setGlReady] = useState(false)
  const onFlightReady = useCallback(() => setGlReady(true), [])
  const onFlightFailure = useCallback(() => setGlReady(false), [])

  useEffect(() => {
    const root = section.current
    const track = scene.current
    const frame = panel.current
    if (!root || !track || !frame) return
    const airspace = root.querySelector<HTMLElement>('.hr-survey-airspace')
    if (!airspace) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const cards = [...root.querySelectorAll<HTMLElement>('.hr-survey-card')]
    const stations = [...root.querySelectorAll<HTMLElement>('.hr-survey-station')]
    let raf = 0
    let pinDistance = 0
    let stickyTop = 96
    let isPinned = false
    let previousProgress = 0
    let disposed = false

    const update = () => {
      raf = 0
      const rect = track.getBoundingClientRect()
      const desktop = window.innerWidth > 1100
      let progress = 0
      if (media.matches) {
        progress = .5
      } else if (isPinned) {
        progress = clamp((stickyTop - rect.top + window.innerHeight * .15) / (pinDistance + window.innerHeight * .15))
      } else {
        progress = clamp((window.innerHeight * .72 - rect.top) / Math.max(350, rect.height * .6))
      }
      flight.current.progress = progress
      flight.current.bank = Math.max(-.18, Math.min(.18, (progress - previousProgress) * 12))
      previousProgress = progress
      root.style.setProperty('--survey-flight', String(desktop ? progress : .5))
      root.dataset.station = String(Math.min(2, Math.floor(progress * 3)))
      stations.forEach((station, index) => {
        station.dataset.active = String(index === Math.min(2, Math.floor(progress * 3)))
      })
      cards.forEach((card, index) => {
        // The layout always reserves the full text height. Only the lower visual
        // edge opens, so the reveal cannot reflow the following sections.
        const reveal = media.matches ? 1 : isPinned ? clamp((progress - index * .34) / .22) : 1
        card.style.setProperty('--survey-reveal', String(reveal))
      })
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update) }
    const measure = () => {
      if (disposed) return
      stickyTop = (document.querySelector('.hr-header')?.getBoundingClientRect().height ?? 72) + 16
      const height = frame.getBoundingClientRect().height
      isPinned = !media.matches && window.innerWidth > 1100 && height + stickyTop + 28 <= window.innerHeight
      pinDistance = isPinned ? Math.min(740, window.innerHeight * .82) : 0
      root.dataset.pinned = String(isPinned)
      // Sticky travel needs room inside the parent's content box. Padding alone
      // extends its border box but does not provide that containing-block room.
      track.style.height = isPinned ? `${height + pinDistance}px` : ''
      frame.style.top = `${stickyTop}px`
      schedule()
    }
    const visibility = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting && !document.hidden)
    })
    visibility.observe(airspace)
    const preparation = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !media.matches) setLoadScene(true)
    }, { rootMargin: '180px 0px' })
    preparation.observe(airspace)
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).dataset.revealed = 'true'
          revealObserver.unobserve(entry.target)
        }
      })
    }, { threshold: .12 })
    cards.forEach(card => revealObserver.observe(card))
    const onMedia = () => {
      setReduced(media.matches)
      const box = airspace.getBoundingClientRect()
      if (!media.matches && box.bottom > -180 && box.top < window.innerHeight + 180) setLoadScene(true)
      measure()
    }
    const onVisibility = () => {
      const box = airspace.getBoundingClientRect()
      setInView(!document.hidden && box.bottom > 0 && box.top < window.innerHeight)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', measure)
    document.addEventListener('visibilitychange', onVisibility)
    media.addEventListener('change', onMedia)
    document.fonts.ready.then(() => { if (!disposed) measure() })
    measure()
    return () => {
      disposed = true
      if (raf) cancelAnimationFrame(raf)
      visibility.disconnect()
      preparation.disconnect()
      revealObserver.disconnect()
      observer.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', measure)
      document.removeEventListener('visibilitychange', onVisibility)
      media.removeEventListener('change', onMedia)
      track.style.removeProperty('height')
      frame.style.removeProperty('top')
      delete root.dataset.pinned
    }
  }, [])

  return <section className="hr-paths hr-survey" id="paths" ref={section}>
    <div className="hr-wrap">
      <div className="hr-section-head hr-section-head-row">
        <div>
          <p className="hr-kicker hr-kicker-light"><span /> Two ways we work</p>
          <h2>Built in from the start, or rebuilt once, properly.</h2>
        </div>
        <p className="hr-lede">Most of our work is one of these two projects. Each begins with a drone survey you keep, whether or not we go further together.</p>
      </div>
      <div className="hr-survey-scene" ref={scene}>
        <div className="hr-survey-panel" ref={panel}>
          <div className="hr-survey-airspace" aria-hidden="true">
            <div className="hr-survey-grid" />
            <div className="hr-survey-flight-label"><span /> Every project begins above.</div>
            <span className="hr-survey-field-label">A different perspective.</span>
            <div className="hr-survey-route" />
            <div className="hr-survey-stations">
              {['01', '02', '03'].map((number, index) => <div className="hr-survey-station" key={number} data-active={index === 0}>
                <span className="hr-survey-crosshair" /><span className="hr-survey-station-number">{number}</span>
              </div>)}
            </div>
            <div className="hr-survey-aircraft" data-ready={glReady && !reduced}>
              <div className="hr-survey-drone-fallback"><DroneDrawing /></div>
              {loadScene && !reduced && <FlightBoundary onFailure={onFlightFailure}>
                <Suspense fallback={null}>
                  <SurveyDrone active={inView} flight={flight} onReady={onFlightReady} onFailure={onFlightFailure} />
                </Suspense>
              </FlightBoundary>}
              <div className="hr-survey-beam" />
            </div>
          </div>
          <div className="hr-path-grid hr-survey-cards">
            {paths.map((path, index) => <article key={path.kicker} className="hr-path hr-survey-card" style={{ '--survey-order': index } as React.CSSProperties}>
              <span className="hr-survey-card-index" aria-hidden="true">0{index + 1}</span>
              <p className="hr-path-kicker">{path.kicker}</p>
              <h3>{path.title}</h3>
              <p>{path.text}</p>
              <ul>{path.points.map(point => <li key={point}>{point}</li>)}</ul>
            </article>)}
            <article className="hr-path hr-path-quiet hr-survey-card" style={{ '--survey-order': 2 } as React.CSSProperties}>
              <span className="hr-survey-card-index" aria-hidden="true">03</span>
              <p className="hr-path-kicker">{stewardship.title}</p>
              <p>{stewardship.text}</p>
              <a href="#consultation" className="hr-text-link">Request an assessment <span aria-hidden="true">↗</span></a>
            </article>
          </div>
        </div>
      </div>
    </div>
  </section>
}
