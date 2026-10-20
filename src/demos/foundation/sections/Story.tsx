import type { RefObject } from 'react'
import { repairSteps, stormFixes, stormReading, yearSteps, type StormFix } from '../content'
import { MONTHS, seasonAt } from '../engine/state'
import { PRICE_NOTE, bandLabel, range, repairs } from '../pricing'
import { href, onLink } from '../routes'
import type { StormState } from '../stage/director'

/* Hero --------------------------------------------------------------- */

const SEASONS = [
  { label: 'Spring', month: 4 },
  { label: 'Summer', month: 8 },
  { label: 'Fall', month: 10.3 },
  { label: 'Winter', month: 0.6 },
]

function describeMonth(month: number): string {
  const soil = seasonAt(month)
  const ground = soil.frost > 0.5 ? 'Ground frozen near the surface' : soil.dry > 0.55 ? 'Clay drying and shrinking' : soil.wet > 0.7 ? 'Soil saturated' : 'Soil settled'
  const table = soil.table > -3.2 ? 'water table high' : soil.table < -6 ? 'water table low' : 'water table normal'
  return `${ground} · ${table}`
}

interface HeroProps {
  sectionRef: RefObject<HTMLElement | null>
  month: number
  playing: boolean
  onSeason: (month: number) => void
  onPlay: () => void
  live: boolean
}

export function Hero({ sectionRef, month, playing, onSeason, onPlay, live }: HeroProps) {
  const active = SEASONS.reduce((best, season) => {
    const d = (m: number) => Math.min(Math.abs(month - m), 12 - Math.abs(month - m))
    return d(season.month) < d(best.month) ? season : best
  }, SEASONS[0])
  return <section ref={sectionRef} className="dt-hero" aria-labelledby="hero-title">
    <div className="dt-wrap dt-hero-inner">
      <div className="dt-hero-copy">
        <p className="dt-eyebrow">Foundation repair &amp; waterproofing · Kansas City</p>
        <h1 id="hero-title">See what’s happening <em>under your house.</em></h1>
        <p className="dt-lede">Most foundation trouble starts in ground you can’t see. <span className="dt-wide-only">We show you what the soil is doing, help you sort the cracks that matter from the ones that don’t, and fix only what needs fixing, least invasive first.</span><span className="dt-narrow-only">We show you what the soil is doing, then fix only what needs fixing.</span></p>
        <div className="dt-actions">
          <a className="dt-button dt-button-ink" href={href.cracks()} onClick={onLink}>Check a crack <span aria-hidden="true">→</span></a>
          <a className="dt-button dt-button-line" href="#request">Book an inspection</a>
        </div>
      </div>
      <div className="dt-hero-window" aria-hidden="true" />
      <div className="dt-hud" role="group" aria-label="A year under this house">
        <div className="dt-hud-head">
          <p className="dt-label">A year under this house</p>
          {live && <button type="button" className="dt-hud-play" onClick={onPlay} aria-pressed={playing}>{playing ? 'Pause' : 'Play'}</button>}
        </div>
        <div className="dt-hud-seasons">
          {SEASONS.map(season => <button key={season.label} type="button" aria-pressed={active.label === season.label} onClick={() => onSeason(season.month)}>{season.label}</button>)}
        </div>
        <div className="dt-hud-track" aria-hidden="true">
          {MONTHS.map((name, index) => <span key={name} className={Math.floor(month) % 12 === index ? 'is-now' : ''}>{name[0]}</span>)}
          <i style={{ left: `${(month / 12) * 100}%` }} />
        </div>
        <p className="dt-hud-read"><span className="dt-mono">{MONTHS[Math.floor(month) % 12].toUpperCase()}</span> {describeMonth(month)}</p>
      </div>
    </div>
    <p className="dt-hero-note dt-mono">Live section · movement exaggerated so you can see it</p>
  </section>
}

/* The year ------------------------------------------------------------ */

export function Year({ sectionRef, step }: { sectionRef: RefObject<HTMLElement | null>; step: number }) {
  return <section ref={sectionRef} id="year" className="dt-story" aria-labelledby="year-title">
    <div className="dt-story-intro">
      <div className="dt-wrap">
        <p className="dt-eyebrow">How it moves</p>
        <h2 id="year-title">A year in the ground under a Kansas City house.</h2>
      </div>
    </div>
    {yearSteps.map((item, index) => <div key={item.title} className={`dt-step ${step === index ? 'is-active' : ''}`} data-step={index}>
      <div className="dt-wrap">
        <article className="dt-card">
          <p className="dt-kicker"><span>{String(index + 1).padStart(2, '0')}</span>{item.kicker}</p>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
          {item.note && <p className="dt-card-note">{item.note}</p>}
        </article>
      </div>
    </div>)}
  </section>
}

/* Repairs ------------------------------------------------------------- */

export function Repairs({ sectionRef, step }: { sectionRef: RefObject<HTMLElement | null>; step: number }) {
  return <section ref={sectionRef} id="repairs" className="dt-story" aria-labelledby="repairs-title">
    <div className="dt-story-intro">
      <div className="dt-wrap">
        <p className="dt-eyebrow">Repairs</p>
        <h2 id="repairs-title">Every fix, shown on the house it fixes.</h2>
        <p className="dt-lede">In the order we would suggest them: least invasive first. Wall and pier options are alternatives, not a package.</p>
      </div>
    </div>
    {repairSteps.map((item, index) => <div key={item.title} className={`dt-step ${step === index ? 'is-active' : ''}`} data-step={index}>
      <div className="dt-wrap">
        <article className="dt-card">
          <p className="dt-kicker"><span>{String(index + 1).padStart(2, '0')}</span>{item.kicker}</p>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
          <ul className="dt-card-prices">{item.repairs.map(id => <li key={id}><span>{repairs[id].name}</span><span className="dt-mono">{range(repairs[id])}</span></li>)}</ul>
          {index === repairSteps.length - 1 && <p className="dt-fine">{PRICE_NOTE}</p>}
        </article>
      </div>
    </div>)}
  </section>
}

/* Storm mode ---------------------------------------------------------- */

interface StormProps {
  sectionRef: RefObject<HTMLElement | null>
  state: StormState
  onChange: (state: StormState) => void
  live: boolean
}

export function Storm({ sectionRef, state, onChange, live }: StormProps) {
  const reading = stormReading(state.fixes, state.power)
  const toggle = (id: StormFix) => onChange({ ...state, fixes: { ...state.fixes, [id]: !state.fixes[id] } })
  const reset = () => onChange({ power: true, fixes: { extension: false, regrade: false, drain: false, battery: false, membrane: false } })
  return <section ref={sectionRef} id="storm" className="dt-storm" aria-labelledby="storm-title">
    <div className="dt-storm-sticky">
      <div className="dt-wrap dt-storm-inner">
        <div className="dt-storm-panel">
          <p className="dt-eyebrow">Storm mode</p>
          <h2 id="storm-title">Watch where the water goes.</h2>
          <p className="dt-storm-intro">A long wet spell, at night. Try the fixes in the order we’d suggest them, cheapest first, and watch the basement.</p>
          <ol className="dt-fixes">
            {stormFixes.map((fix, index) => {
              const disabled = fix.id === 'battery' && !state.fixes.drain
              return <li key={fix.id}>
                <button type="button" aria-pressed={state.fixes[fix.id]} disabled={disabled} onClick={() => toggle(fix.id)}>
                  <span className="dt-fix-index dt-mono">{index + 1}</span>
                  <span className="dt-fix-text"><strong>{fix.label}</strong><span>{disabled ? 'Needs a sump first.' : fix.detail}</span></span>
                  <span className="dt-fix-band dt-mono" aria-label={`Cost band ${repairs[fix.id].band} of 4`}>{bandLabel(repairs[fix.id].band)}</span>
                </button>
              </li>
            })}
          </ol>
          <div className="dt-storm-controls">
            <button type="button" className="dt-power" aria-pressed={!state.power} onClick={() => onChange({ ...state, power: !state.power })}>{state.power ? 'Cut the power' : 'Restore power'}</button>
            <button type="button" className="dt-text-button" onClick={reset}>Reset</button>
          </div>
          <dl className="dt-readout" aria-live="polite">
            <div><dt>Water reaching the basement</dt><dd className={`is-${reading.level.toLowerCase()}`}>{reading.level}</dd></div>
            <div><dt>Sump pump</dt><dd>{reading.pump}</dd></div>
          </dl>
          <p className="dt-storm-note">{reading.note}</p>
          {!live && <p className="dt-fine">The live model is not available in this browser; the readout above still reflects each fix.</p>}
        </div>
      </div>
    </div>
  </section>
}
