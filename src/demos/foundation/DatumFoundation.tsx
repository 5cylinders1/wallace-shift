import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { repairSteps, yearSteps, type Pin, type StormFix } from './content'
import type { FoundationEngine } from './engine/FoundationEngine'
import CrackLogPage from './pages/CrackLogPage'
import { CrackPage, CracksPage } from './pages/CrackPages'
import ReportPage from './pages/ReportPage'
import { usePage } from './routes'
import { Footer, Header } from './sections/Chrome'
import { DecoderSection, Faq, LogTeaser, Process, ReportPreview, Selling } from './sections/Panels'
import Request from './sections/Request'
import { Hero, Repairs, Storm, Year } from './sections/Story'
import { directTarget, type Layout, type StageName, type StormState } from './stage/director'
import Labels from './stage/Labels'
import Stage from './stage/Stage'

const HOME_TITLE = 'See what’s happening under your house | Datum Foundation & Waterproofing · Wallace Shift Demo'

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

/** The step block crossing the middle of the screen, and how far through it we are. */
function locate(section: HTMLElement, height: number): { step: number; progress: number } {
  const middle = height / 2
  let step = 0
  let progress = 0
  for (const block of section.querySelectorAll<HTMLElement>('[data-step]')) {
    const rect = block.getBoundingClientRect()
    if (rect.top <= middle) {
      step = Number(block.dataset.step)
      progress = Math.max(0, Math.min(1, (middle - rect.top) / Math.max(1, rect.height)))
    }
  }
  return { step, progress }
}

const noFixes: Record<StormFix, boolean> = { extension: false, regrade: false, drain: false, battery: false, membrane: false }

function Home() {
  const [engine, setEngine] = useState<FoundationEngine | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)')
  const wide = useMedia('(min-width: 900px)')
  const layout: Layout = wide ? 'wide' : 'narrow'
  const [month, setMonth] = useState(4)
  const [playing, setPlaying] = useState(!reducedMotion)
  const [yearStep, setYearStep] = useState(-1)
  const [repairStep, setRepairStep] = useState(-1)
  const [storm, setStorm] = useState<StormState>({ power: true, fixes: { ...noFixes } })
  const [pins, setPins] = useState<Pin[]>([])

  const heroRef = useRef<HTMLElement>(null)
  const yearRef = useRef<HTMLElement>(null)
  const repairsRef = useRef<HTMLElement>(null)
  const stormRef = useRef<HTMLElement>(null)
  const ui = useRef({ layout, storm, playing, month })
  useEffect(() => { ui.current = { ...ui.current, layout, storm, playing } }, [layout, storm, playing])

  const onEngine = useCallback((next: FoundationEngine | null) => setEngine(next), [])
  const onUnavailable = useCallback(() => setUnavailable(true), [])
  const pickSeason = (value: number) => { ui.current.month = value; setMonth(value); setPlaying(false) }

  useEffect(() => {
    document.title = HOME_TITLE
    // Lets the poster stills be re-rendered from the same shots in development.
    if (import.meta.env.DEV) (window as unknown as { datumDirect?: typeof directTarget }).datumDirect = directTarget
  }, [])

  // The director: each frame, find the section on screen and direct the model.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let lastMonthPaint = 0
    let painted = -1
    const seen = { year: -2, repair: -2, pins: '' }
    const sections: [StageName, RefObject<HTMLElement | null>][] = [['hero', heroRef], ['year', yearRef], ['repairs', repairsRef], ['storm', stormRef]]

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const state = ui.current
      if (state.playing) state.month = (state.month + dt / 2.3) % 12
      if (now - lastMonthPaint > 200 && state.month !== painted) { lastMonthPaint = now; painted = state.month; setMonth(state.month) }

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
      const { step, progress } = active === 'year' || active === 'repairs' ? locate(element, height) : { step: 0, progress: 0 }
      engine?.setTarget(directTarget({ stage: active, step, progress, layout: state.layout, month: state.month, storm: state.storm }))

      const year = active === 'year' ? step : -1
      if (seen.year !== year) { seen.year = year; setYearStep(year) }
      const repair = active === 'repairs' ? step : -1
      if (seen.repair !== repair) { seen.repair = repair; setRepairStep(repair) }

      let next: Pin[] = []
      if (active === 'year' && progress > 0.08) next = yearSteps[step]?.pins ?? []
      else if (active === 'repairs' && progress > 0.12) next = repairSteps[step]?.pins ?? []
      else if (active === 'storm') next = [{ anchor: 'waterTable', label: 'Water table', tone: 'water' }, ...(state.storm.fixes.drain ? [{ anchor: 'sump', label: 'Sump pit' } as Pin] : [])]
      const key = next.map(pin => pin.anchor + pin.label).join('|')
      if (key !== seen.pins) { seen.pins = key; setPins(next) }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [engine])

  const live = Boolean(engine) && !unavailable
  return <div className={`dt-home ${live ? 'is-live' : ''} ${unavailable ? 'is-static' : ''}`}>
    <Stage reducedMotion={reducedMotion} onEngine={onEngine} onUnavailable={onUnavailable} />
    <Labels engine={engine} pins={pins} />
    <Header />
    <main id="main">
      <Hero sectionRef={heroRef} month={month} playing={playing} onSeason={pickSeason} onPlay={() => setPlaying(value => !value)} live={live} />
      <Year sectionRef={yearRef} step={yearStep} />
      <DecoderSection />
      <Repairs sectionRef={repairsRef} step={repairStep} />
      <Storm sectionRef={stormRef} state={storm} onChange={setStorm} live={live} />
      <ReportPreview />
      <LogTeaser />
      <Selling />
      <Process />
      <Faq />
      <Request />
    </main>
    <Footer />
  </div>
}

export default function DatumFoundation() {
  const page = usePage()
  return <div className="dt-site">
    <a className="dt-skip" href="#main">Skip to content</a>
    {page.kind === 'home' ? <Home /> : <>
      <Header solid />
      {page.kind === 'cracks' && <CracksPage />}
      {page.kind === 'crack' && <CrackPage slug={page.slug} />}
      {page.kind === 'log' && <CrackLogPage />}
      {page.kind === 'report' && <ReportPage />}
      <Footer />
    </>}
  </div>
}
