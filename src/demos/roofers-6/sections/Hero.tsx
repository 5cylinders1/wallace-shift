import type { RefObject } from 'react'
import { brand, heroModes, type HeroMode } from '../content'
import type { RoofMetrics } from '../engine/measure'

interface HeroProps {
  sectionRef: RefObject<HTMLElement | null>
  mode: HeroMode
  onMode: (mode: HeroMode) => void
  metrics: RoofMetrics
  finish: string
  live: boolean
}

const icons: Record<HeroMode, string> = {
  overview: 'M4 13 12 6l8 7M7 11v8h10v-8',
  storm: 'M7 15a4 4 0 0 1 .5-8 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 17 15M11 15l-2 4h3l-1.5 3M15 17l-1 2',
  tuneup: 'M12 3v3M12 18v3M3 12h3M18 12h3M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6',
  build: 'M3 20h18M5 20V11l7-5 7 5v9M9 20v-5h6v5',
  upgrades: 'M12 3l2.2 5.5L20 9l-4.5 3.8L17 19l-5-3.2L7 19l1.5-6.2L4 9l5.8-.5z',
}

export default function Hero({ sectionRef, mode, onMode, metrics, finish, live }: HeroProps) {
  const active = heroModes.find(item => item.id === mode)
  return <section ref={sectionRef} id="top" className="st-hero st-stage-section" aria-labelledby="st-hero-title">
    <div className="st-hero-scrim" aria-hidden="true" />
    <div className="st-wrap st-hero-inner">
      <div className="st-hero-copy">
        <p className="st-eyebrow st-rise" style={{ animationDelay: '80ms' }}>Storm restoration · Tune-ups · New builds · Upgrades</p>
        <h1 id="st-hero-title" className="st-rise" style={{ animationDelay: '160ms' }}>Every layer, <em>accounted for.</em></h1>
        <p className="st-hero-lede st-rise" style={{ animationDelay: '260ms' }}>
          Stratum restores storm-damaged roofs, tunes up tired ones, builds new ones and makes good roofs better. And we show you every layer before we lift a shingle.
        </p>
        <div className="st-hero-actions st-rise" style={{ animationDelay: '340ms' }}>
          <a className="st-button st-button-copper" href="#book">Book a free inspection <span aria-hidden="true">→</span></a>
          <a className="st-button st-button-ghost" href="#anatomy">Take the roof apart <span aria-hidden="true">↓</span></a>
        </div>
        <p className="st-hero-area st-rise" style={{ animationDelay: '420ms' }}>{brand.area} · <a href={brand.phoneHref}>{brand.phone}</a></p>
      </div>

      <div className="st-hero-foot st-rise" style={{ animationDelay: '520ms' }}>
        <div className="st-modes">
          <p className="st-modes-label" id="st-modes-label">See it happen <span aria-hidden="true">—</span> the roof responds</p>
          <div className="st-mode-buttons" role="group" aria-labelledby="st-modes-label">
            {heroModes.map(item => <button
              key={item.id}
              type="button"
              aria-pressed={mode === item.id}
              onClick={() => onMode(mode === item.id ? 'overview' : item.id)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d={icons[item.id]} /></svg>
              {item.label}
            </button>)}
          </div>
          <p className="st-mode-caption" aria-live="polite">
            {active ? <>{active.caption} <a href={active.href}>{active.link} <span aria-hidden="true">↓</span></a></> : 'Choose a service to watch it play out on the model.'}
          </p>
        </div>
        <dl className="st-hud" aria-label="Sample home measurements">
          <div><dt>Roof area</dt><dd>{Math.round(metrics.areaFt2).toLocaleString('en-US')} <small>sq ft</small></dd></div>
          <div><dt>Pitch</dt><dd>{metrics.pitch}<small>/12</small></dd></div>
          <div><dt>Finish</dt><dd>{finish}</dd></div>
          <div className="st-hud-live"><dt>Model</dt><dd>{live ? <><i aria-hidden="true" />Live 3D</> : 'Still image'}</dd></div>
        </dl>
      </div>
    </div>
  </section>
}
