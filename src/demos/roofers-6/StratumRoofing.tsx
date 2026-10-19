import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { colorFor, defaultRoof, finishById, noUpgrades, upgradeList } from './catalog'
import { damagePins, inspectionPins, layers, upgradePins, type HeroMode, type ServiceValue } from './content'
import { measureRoof } from './engine/measure'
import type { RoofEngine } from './engine/RoofEngine'
import { money, planningRange } from './pricing'
import { directTarget, upgradeShown, type Layout, type StageName } from './stage/director'
import Labels, { type LabelSet } from './stage/Labels'
import Stage from './stage/Stage'
import Anatomy from './sections/Anatomy'
import Booking, { type Brief, type DesignSummary } from './sections/Booking'
import { Faq, Footer, Process } from './sections/Closing'
import Header from './sections/Header'
import HealthCheck from './sections/HealthCheck'
import Hero from './sections/Hero'
import Services from './sections/Services'
import StormDesk from './sections/StormDesk'
import Studio, { type StudioState } from './sections/Studio'

const none: LabelSet = { kind: 'none', pins: [], layers: [], focus: -1, highlight: -1 }

function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const change = () => setMatches(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [query])
  return matches
}

/** Where we are in a section: the block crossing the middle of the screen. */
function locate(section: HTMLElement, height: number): { step: number; progress: number } {
  const blocks = section.querySelectorAll<HTMLElement>('[data-step]')
  const middle = height / 2
  let step = 0
  let progress = 0
  for (const block of blocks) {
    const rect = block.getBoundingClientRect()
    if (rect.top <= middle) {
      step = Number(block.dataset.step)
      progress = Math.max(0, Math.min(1, (middle - rect.top) / Math.max(1, rect.height)))
    }
  }
  return { step, progress }
}

export default function StratumRoofing() {
  const [engine, setEngine] = useState<RoofEngine | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [heroMode, setHeroMode] = useState<HeroMode>('overview')
  const [studio, setStudio] = useState<StudioState>({ config: { ...defaultRoof }, upgrades: { ...noUpgrades }, tod: 0.62, view: 'street' })
  const [anatomyStep, setAnatomyStep] = useState(-1)
  const [service, setService] = useState({ step: -1, progress: 0 })
  const [labels, setLabels] = useState<LabelSet>(none)
  const [highlight, setHighlight] = useState(-1)
  const [brief, setBrief] = useState<Brief & { version: number }>({ version: 0 })
  const [design, setDesign] = useState<DesignSummary | null>(null)
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)')
  const wide = useMedia('(min-width: 900px)')
  const layout: Layout = wide ? 'wide' : 'narrow'

  const heroRef = useRef<HTMLElement>(null)
  const anatomyRef = useRef<HTMLElement>(null)
  const servicesRef = useRef<HTMLElement>(null)
  const studioRef = useRef<HTMLElement>(null)
  const ui = useRef({ heroMode, studio, layout, highlight })
  useEffect(() => { ui.current = { heroMode, studio, layout, highlight } }, [heroMode, studio, layout, highlight])

  const onEngine = useCallback((next: RoofEngine | null) => setEngine(next), [])
  const onUnavailable = useCallback(() => setUnavailable(true), [])

  // One house for the whole page: the studio's roof is the hero's roof.
  useEffect(() => { engine?.configure(studio.config) }, [engine, studio.config])

  // The director: every frame, find the section on screen and direct the model.
  useEffect(() => {
    let raf = 0
    const seen = { stage: '' as StageName | '', anatomy: -1, service: '', labels: '' }
    const sections: [StageName, RefObject<HTMLElement | null>][] = [['hero', heroRef], ['anatomy', anatomyRef], ['services', servicesRef], ['studio', studioRef]]
    const start = performance.now()

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const height = window.innerHeight
      let active: StageName | null = null
      let activeElement: HTMLElement | null = null
      let best = 0
      let anyVisible = false
      for (const [name, ref] of sections) {
        const element = ref.current
        if (!element) continue
        const rect = element.getBoundingClientRect()
        const visible = Math.min(rect.bottom, height) - Math.max(rect.top, 0)
        if (visible <= 0) continue
        anyVisible = true
        const containsMiddle = rect.top <= height / 2 && rect.bottom >= height / 2
        const score = visible + (containsMiddle ? height * 2 : 0)
        if (score > best) { best = score; active = name; activeElement = element }
      }
      engine?.setActive(anyVisible)
      if (!active || !activeElement) return
      const { step, progress } = active === 'anatomy' || active === 'services' ? locate(activeElement, height) : { step: 0, progress: 0 }
      const state = ui.current
      engine?.setTarget(directTarget({ stage: active, step, stepProgress: progress, layout: state.layout, time: (now - start) / 1000, heroMode: state.heroMode, studio: state.studio }))
      if (seen.stage !== active) { seen.stage = active; engine?.setOrbitEnabled(active === 'studio') }

      const anatomy = active === 'anatomy' ? step : -1
      if (seen.anatomy !== anatomy) { seen.anatomy = anatomy; setAnatomyStep(anatomy) }
      const serviceKey = active === 'services' ? `${step}:${Math.round(progress * 40)}` : 'off'
      if (seen.service !== serviceKey) {
        seen.service = serviceKey
        setService(active === 'services' ? { step, progress: Math.round(progress * 40) / 40 } : previous => ({ ...previous, step: previous.step >= 4 ? 5 : -1 }))
      }

      // Which labels belong on the model right now.
      let next: LabelSet = none
      if (active === 'hero' && state.heroMode === 'tuneup') next = { ...none, kind: 'pins', pins: inspectionPins }
      else if (active === 'hero' && state.heroMode === 'upgrades') next = { ...none, kind: 'pins', pins: upgradePins }
      else if (active === 'anatomy' && step >= 1 && step <= 9) next = { ...none, kind: 'layers', layers: layers.map(layer => ({ key: layer.key, name: layer.short })), focus: step - 1 }
      else if (active === 'services' && step === 1 && progress > 0.08) next = { ...none, kind: 'pins', pins: damagePins, highlight: state.highlight }
      else if (active === 'services' && step === 2 && progress > 0.04) next = { ...none, kind: 'pins', pins: inspectionPins, highlight: state.highlight }
      else if (active === 'services' && step === 4) next = { ...none, kind: 'pins', pins: upgradePins.filter((_, index) => upgradeShown(progress, index) && upgradeShown(progress - 0.08, index)) }
      const key = `${next.kind}|${next.pins.map(pin => pin.anchor).join(',')}|${next.focus}|${next.highlight}`
      if (key !== seen.labels) { seen.labels = key; setLabels(next) }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [engine])

  const metrics = useMemo(() => measureRoof(studio.config), [studio.config])
  const finish = finishById(studio.config.finish)

  const goToBooking = () => {
    requestAnimationFrame(() => document.getElementById('book')?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' }))
  }
  const onService = (value: ServiceValue) => {
    setBrief(previous => ({ version: previous.version + 1, service: value }))
    goToBooking()
  }
  const onBrief = (next: Brief) => {
    setBrief(previous => ({ ...next, version: previous.version + 1 }))
    goToBooking()
  }
  const onUseDesign = () => {
    const range = planningRange(studio.config, metrics.areaFt2, studio.upgrades)
    const extras = upgradeList.filter(item => studio.upgrades[item.id] > 0.5).map(item => item.name.toLowerCase())
    setDesign({
      title: `${finish.name}, ${colorFor(studio.config).name}`,
      detail: `${studio.config.style === 'hip' ? 'Hip' : 'Gable'} roof at ${studio.config.pitch}/12, ${Math.round(metrics.areaFt2).toLocaleString('en-US')} sq ft${extras.length ? `, with ${extras.join(', ')}` : ''}`,
      range: `planning range ${money(range.low)} to ${money(range.high)}`,
    })
    setBrief(previous => ({ version: previous.version + 1, service: 'replace', source: 'Roof studio' }))
    goToBooking()
  }

  return <div className={`st-site ${unavailable ? 'is-static' : ''} ${engine ? 'is-live' : ''}`}>
    <a className="st-skip" href="#main">Skip to content</a>
    <Stage reducedMotion={reducedMotion} onEngine={onEngine} onUnavailable={onUnavailable} />
    <Labels engine={engine} set={labels} />
    <Header />
    <main id="main">
      <Hero sectionRef={heroRef} mode={heroMode} onMode={setHeroMode} metrics={metrics} finish={finish.short} live={Boolean(engine) && !unavailable} />
      <Anatomy sectionRef={anatomyRef} step={anatomyStep} finish={finish.name} />
      <Services sectionRef={servicesRef} step={service.step} stepProgress={service.progress} highlight={highlight} onHighlight={setHighlight} onService={onService} />
      <StormDesk onBrief={onBrief} />
      <HealthCheck onBrief={onBrief} />
      <Studio sectionRef={studioRef} engine={engine} live={Boolean(engine) && !unavailable} state={studio} metrics={metrics} onChange={setStudio} onUse={onUseDesign} />
      <Process />
      <Faq />
      <Booking brief={brief} design={design} onClearDesign={() => setDesign(null)} />
    </main>
    <Footer />
  </div>
}
