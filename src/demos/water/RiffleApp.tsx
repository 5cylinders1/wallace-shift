import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { business, coverageSteps, disclosure, fixtureNames, hero, modes, nav, roomSteps, systemSteps, tracers, type Verdict } from './content'
import { END_USES } from './engine/volume'
import type { Mode, TracerId } from './engine/state'
import type { WaterEngine } from './engine/WaterEngine'
import { useMedia, useReducedMotion } from './hooks'
import Cost from './sections/Cost'
import Answers, { Compare, Process, ScheduleInstall, Sources } from './sections/Light'
import Study from './sections/Study'
import Volume from './sections/Volume'
import { directPins, directTarget, type Layout, type Pin, type StageName } from './stage/director'
import Labels from './stage/Labels'
import Stage from './stage/Stage'

/** Which [data-step] block the middle of the screen is in, and how far through it. */
function locate(section: HTMLElement, height: number) {
  const steps = section.querySelectorAll<HTMLElement>('[data-step]')
  let step = 0
  let progress = 0
  steps.forEach((node, index) => {
    const rect = node.getBoundingClientRect()
    if (rect.top <= height * 0.55) {
      step = index
      progress = Math.max(0, Math.min(1, (height * 0.55 - rect.top) / Math.max(rect.height, 1)))
    }
  })
  return { step, progress }
}

function Wordmark() {
  return <span className="rf-wordmark">
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M2.5 8.5c3-2.6 5.5-2.6 8.5 0s6 2.6 10.5-.8" />
      <path d="M2.5 13.5c3-2.6 5.5-2.6 8.5 0s6 2.6 10.5-.8" />
      <path d="M2.5 18.5c3-2.6 5.5-2.6 8.5 0s6 2.6 10.5-.8" />
    </svg>
    riffle
  </span>
}

function Header() {
  const [solid, setSolid] = useState(false)
  useEffect(() => {
    const check = () => setSolid(window.scrollY > 40)
    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [])
  return <header className={`rf-header ${solid ? 'is-solid' : ''}`}>
    <a className="rf-home" href="#top" aria-label={`${business.name}, back to top`}><Wordmark /></a>
    <nav aria-label="Main">
      {nav.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
    </nav>
    <a className="rf-phone" href={business.phoneHref}>{business.phone}</a>
    <a className="rf-cta rf-cta-small" href="#schedule">Schedule installation</a>
  </header>
}

function VerdictMark({ verdict }: { verdict: Verdict | null }) {
  if (!verdict) return null
  const label = verdict === 'stopped' ? 'Stopped' : verdict === 'changed' ? 'Changed' : 'Gets through'
  return <span className={`rf-verdict rf-verdict-${verdict}`}>{label}</span>
}

/** Arrow keys move through a radio group and select as they go, as native radios do. */
function arrowKeys<T extends string>(event: KeyboardEvent<HTMLElement>, ids: T[], value: T, onChange: (next: T) => void) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
  if (!step) return
  event.preventDefault()
  const next = (ids.indexOf(value) + step + ids.length) % ids.length
  onChange(ids[next])
  const radios = event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')
  radios[next]?.focus()
}

function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: { id: T; label: string }[]; value: T; onChange: (next: T) => void }) {
  return <div className="rf-segmented" role="radiogroup" aria-label={label} onKeyDown={(event) => arrowKeys(event, options.map((option) => option.id), value, onChange)}>
    {options.map((option) => <button
      key={option.id}
      type="button"
      role="radio"
      aria-checked={value === option.id}
      tabIndex={value === option.id ? 0 : -1}
      className={value === option.id ? 'is-on' : ''}
      onClick={() => onChange(option.id)}
    >{option.label}</button>)}
  </div>
}

const FIXTURE_IDS = Object.keys(fixtureNames)

export default function RiffleApp() {
  const reducedMotion = useReducedMotion()
  const [engine, setEngine] = useState<WaterEngine | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const wide = useMedia('(min-width: 900px)')
  const layout: Layout = wide ? 'wide' : 'narrow'

  const [heroMode, setHeroMode] = useState<Mode>(reducedMotion ? 'whole' : 'none')
  const [coverageStep, setCoverageStep] = useState(0)
  const [coverageChoice, setCoverageChoice] = useState<Mode | null>(null)
  const [systemStep, setSystemStep] = useState(0)
  const [tracerChoice, setTracerChoice] = useState<TracerId | 'all' | null>(null)
  const [roomStep, setRoomStep] = useState(0)
  const [roomProgress, setRoomProgress] = useState(0)
  const [roomChoice, setRoomChoice] = useState<boolean | null>(null)
  const [treatedCount, setTreatedCount] = useState(0)
  const [pins, setPins] = useState<Pin[]>([])
  const [activeStage, setActiveStage] = useState<StageName>('hero')
  const [years, setYears] = useState(8)
  const [hardness, setHardness] = useState(15)
  const [hot, setHot] = useState<50 | 100>(50)
  const [people, setPeople] = useState(4)
  const [home, setHome] = useState(2200)

  const heroRef = useRef<HTMLElement>(null)
  const coverageRef = useRef<HTMLElement>(null)
  const systemRef = useRef<HTMLElement>(null)
  const roomsRef = useRef<HTMLElement>(null)
  const studyRef = useRef<HTMLElement>(null)
  const volumeRef = useRef<HTMLElement>(null)

  const coverageMode = coverageChoice ?? coverageSteps[coverageStep].mode
  const tracer: TracerId | 'all' = tracerChoice ?? systemSteps[systemStep].tracer
  // The rooms start as the water arrives and flip by themselves halfway through, unless the visitor has chosen.
  const roomOn = roomChoice ?? roomProgress > 0.42

  const ui = useRef({ layout, heroMode, coverageMode, tracer, roomOn, years, hardness, people })
  useEffect(() => { ui.current = { layout, heroMode, coverageMode, tracer, roomOn, years, hardness, people } }, [layout, heroMode, coverageMode, tracer, roomOn, years, hardness, people])

  const onEngine = useCallback((next: WaterEngine | null) => setEngine(next), [])
  const onUnavailable = useCallback(() => setUnavailable(true), [])

  useEffect(() => {
    if (reducedMotion || !engine) return
    let timer = 0
    engine.whenRendered(() => { timer = window.setTimeout(() => setHeroMode('whole'), 1700) })
    return () => clearTimeout(timer)
  }, [reducedMotion, engine])

  useEffect(() => {
    if (!engine) return
    return engine.onFrame((frame) => {
      const count = FIXTURE_IDS.filter((id) => frame.treated[id]).length
      setTreatedCount((previous) => (previous === count ? previous : count))
    })
  }, [engine])

  // Each frame, find the section on screen and direct the model.
  useEffect(() => {
    let raf = 0
    const seen = { coverage: -1, system: -1, room: -1, roomBucket: -1, pins: '', stage: '' }
    const sections: [StageName, RefObject<HTMLElement | null>][] = [
      ['hero', heroRef], ['coverage', coverageRef], ['system', systemRef], ['rooms', roomsRef], ['study', studyRef], ['volume', volumeRef],
    ]
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const height = window.innerHeight
      let active: StageName | null = null
      let element: HTMLElement | null = null
      let best = 0
      let anyVisible = false
      for (const [name, ref] of sections) {
        const node = ref.current
        if (!node) continue
        const rect = node.getBoundingClientRect()
        const visible = Math.min(rect.bottom, height) - Math.max(rect.top, 0)
        if (visible <= 0) continue
        anyVisible = true
        const score = visible + (rect.top <= height / 2 && rect.bottom >= height / 2 ? height * 2 : 0)
        if (score > best) { best = score; active = name; element = node }
      }
      engine?.setActive(anyVisible)
      if (!active || !element) return
      const { step, progress } = locate(element, height)
      const state = ui.current
      if (active !== seen.stage) { seen.stage = active; setActiveStage(active); engine?.resetOrbit() }

      if (active === 'coverage' && seen.coverage !== step) { seen.coverage = step; setCoverageStep(step); setCoverageChoice(null) }
      if (active === 'system' && seen.system !== step) { seen.system = step; setSystemStep(step); setTracerChoice(null) }
      if (active === 'rooms') {
        if (seen.room !== step) { seen.room = step; setRoomStep(step); setRoomChoice(null) }
        const bucket = progress > 0.42 ? 1 : 0
        if (seen.roomBucket !== bucket) { seen.roomBucket = bucket; setRoomProgress(progress) }
      }

      let mode: Mode = 'whole'
      if (active === 'hero') mode = state.heroMode
      else if (active === 'coverage') mode = state.coverageMode
      else if (active === 'rooms') mode = state.roomOn ? 'whole' : 'none'
      engine?.setTarget(directTarget({ stage: active, step, layout: state.layout, mode, tracer: state.tracer, years: state.years, hardness: state.hardness, people: state.people }))

      const next = directPins({ stage: active, step, mode, layout: state.layout })
      const key = next.map((pin) => pin.anchor + pin.label).join('|')
      if (key !== seen.pins) { seen.pins = key; setPins(next) }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [engine])

  const activeTracer = tracers.find((item) => item.id === tracer) ?? tracers[0]
  const liveCount = coverageMode === 'whole' || treatedCount ? treatedCount : 0

  const live = Boolean(engine) && !unavailable
  return <div id="top" className={`rf-site ${live ? 'is-live' : ''} ${unavailable ? 'is-static' : ''}`}>
    <a className="rf-skip" href="#main">Skip to content</a>
    <Stage reducedMotion={reducedMotion} onEngine={onEngine} onUnavailable={onUnavailable} />
    <Labels engine={engine} pins={pins} />
    <Header />
    <main id="main">
      <section ref={heroRef} className="rf-hero" aria-labelledby="rf-hero-title">
        <div className="rf-copy">
          <p className="rf-kicker">{hero.eyebrow}</p>
          <h1 id="rf-hero-title">{hero.title}</h1>
          <p className="rf-lede">{hero.lede}</p>
          <div className="rf-actions">
            <a className="rf-cta" href="#schedule">{hero.primary}</a>
            <a className="rf-link" href="#coverage">{hero.secondary}</a>
          </div>
        </div>
        {live && <p className="rf-hint"><span aria-hidden="true" className="rf-hint-mark" />{hero.hint}</p>}
      </section>

      <section ref={coverageRef} id="coverage" className="rf-chapter" aria-label="Why treat the whole house">
        {coverageSteps.map((step, index) => <article key={step.title} data-step className={`rf-step ${coverageStep === index ? 'is-current' : ''}`}>
          <div className="rf-copy">
            <p className="rf-kicker">{step.kicker}</p>
            <h2>{step.title}</h2>
            <p>{step.body}</p>
          </div>
        </article>)}
        <div className={`rf-dock ${activeStage === 'coverage' ? 'is-active' : ''}`}>
          <div className="rf-dock-inner">
            <Segmented label="What’s treating the water" options={modes.map((mode) => ({ id: mode.id, label: wide ? mode.label : mode.short }))} value={coverageMode} onChange={setCoverageChoice} />
            <p className="rf-count" role="status"><strong>{liveCount}</strong> of {FIXTURE_IDS.length} fixtures on treated water</p>
          </div>
        </div>
      </section>

      <section ref={systemRef} id="system" className="rf-chapter" aria-label="Inside the system">
        {systemSteps.map((step, index) => <article key={step.title} data-step className={`rf-step ${systemStep === index ? 'is-current' : ''}`}>
          <div className="rf-copy">
            <p className="rf-kicker">{step.kicker}</p>
            <h2>{step.title}</h2>
            <p>{step.body}</p>
            {step.spec && <p className="rf-spec">{step.spec}</p>}
          </div>
        </article>)}
        <div className={`rf-dock rf-dock-tall ${activeStage === 'system' && (wide ? systemStep > 0 : systemStep === systemSteps.length - 1) ? 'is-active' : ''}`}>
          <div className="rf-dock-inner rf-tracer">
            <div className="rf-chips" role="radiogroup" aria-label="Choose a contaminant to follow" onKeyDown={(event) => arrowKeys(event, tracers.map((item) => item.id), tracer, setTracerChoice)}>
              {tracers.map((item) => <button key={item.id} type="button" role="radio" aria-checked={tracer === item.id} tabIndex={tracer === item.id ? 0 : -1} className={tracer === item.id ? 'is-on' : ''} onClick={() => setTracerChoice(item.id)}>
                <span className="rf-swatch" style={{ background: item.color }} aria-hidden="true" />{item.label}
              </button>)}
            </div>
            <div className="rf-readout" role="status">
              <p><VerdictMark verdict={activeTracer.verdict} /><strong>{activeTracer.headline}</strong></p>
              <p>{activeTracer.detail}</p>
            </div>
          </div>
        </div>
      </section>

      <section ref={roomsRef} id="rooms" className="rf-chapter" aria-label="What you’d notice at home">
        {roomSteps.map((step, index) => <article key={step.title} data-step className={`rf-step ${roomStep === index ? 'is-current' : ''}`}>
          <div className="rf-copy">
            <p className="rf-kicker">{step.kicker}</p>
            <h2>{step.title}</h2>
            <p>{step.body}</p>
            {step.note && <p className="rf-spec">{step.note}</p>}
          </div>
        </article>)}
        <div className={`rf-dock ${activeStage === 'rooms' ? 'is-active' : ''}`}>
          <div className="rf-dock-inner">
            <Segmented label="Compare the water" options={[{ id: 'off', label: 'As it arrives' }, { id: 'on', label: 'Through Riffle' }]} value={roomOn ? 'on' : 'off'} onChange={(next) => setRoomChoice(next === 'on')} />
          </div>
        </div>
      </section>

      <Study sectionRef={studyRef} years={years} hardness={hardness} hot={hot} onYears={setYears} onHardness={setHardness} onHot={setHot} />
      <Volume sectionRef={volumeRef} active={activeStage === 'volume'} people={people} onPeople={setPeople} engine={engine} uses={END_USES} />

      <div className="rf-light">
        <Compare />
        <Answers />
        <Cost home={home} people={people} onHome={setHome} onPeople={setPeople} />
        <Process />
        <ScheduleInstall home={home} people={people} />
        <Sources />
      </div>
    </main>
    <footer className="rf-footer">
      <div className="rf-footer-row">
        <Wordmark />
        <p>{business.area} · <a href={business.phoneHref}>{business.phone}</a> · <a href={`mailto:${business.email}`}>{business.email}</a></p>
      </div>
      <p className="rf-disclosure">{disclosure}</p>
    </footer>
  </div>
}
