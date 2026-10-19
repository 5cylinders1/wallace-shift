import { useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'
import { colorFor, finishById, finishes, upgradeList, type RoofConfig, type Upgrades } from '../catalog'
import type { RoofMetrics } from '../engine/measure'
import type { RoofEngine } from '../engine/RoofEngine'
import { money, planningRange } from '../pricing'
import type { StudioView } from '../stage/director'

export interface StudioState {
  config: RoofConfig
  upgrades: Upgrades
  tod: number
  view: StudioView
}

interface StudioProps {
  sectionRef: RefObject<HTMLElement | null>
  engine: RoofEngine | null
  live: boolean
  state: StudioState
  metrics: RoofMetrics
  onChange: (next: StudioState) => void
  onUse: () => void
}

type Tab = 'shape' | 'finish' | 'upgrades' | 'light'
const tabs: { id: Tab; label: string }[] = [
  { id: 'shape', label: 'Shape' },
  { id: 'finish', label: 'Finish' },
  { id: 'upgrades', label: 'Upgrades' },
  { id: 'light', label: 'Light & view' },
]

const hour = (tod: number) => (tod < 0.15 ? 'Dawn' : tod < 0.38 ? 'Morning' : tod < 0.58 ? 'Midday' : tod < 0.76 ? 'Golden hour' : tod < 0.9 ? 'Dusk' : 'Night')

export default function Studio({ sectionRef, engine, live, state, metrics, onChange, onUse }: StudioProps) {
  const [tab, setTab] = useState<Tab>('shape')
  const drag = useRef<{ x: number; y: number; id: number } | null>(null)
  const pitchId = useId()
  const lightId = useId()
  const { config, upgrades } = state
  const finish = finishById(config.finish)
  const color = colorFor(config)
  const range = planningRange(config, metrics.areaFt2, upgrades)
  const degrees = Math.round((Math.atan(config.pitch / 12) * 180) / Math.PI)

  const set = (patch: Partial<StudioState>) => onChange({ ...state, ...patch })
  const setConfig = (patch: Partial<RoofConfig>) => onChange({ ...state, config: { ...config, ...patch } })

  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (!engine) return
    drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const last = drag.current
    if (!last || last.id !== event.pointerId) return
    engine?.orbitBy(event.clientX - last.x, event.clientY - last.y)
    drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
  }
  const up = () => { drag.current = null }

  const tabId = (id: Tab) => `st-studio-tab-${id}`
  const panelId = (id: Tab) => `st-studio-panel-${id}`
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]
    setTab(next.id)
    document.getElementById(tabId(next.id))?.focus()
  }

  return <section ref={sectionRef} id="studio" className="st-studio st-stage-section" aria-labelledby="st-studio-title">
    <div className={`st-orbit ${live ? 'is-live' : ''}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-hidden="true" />
    <div className="st-wrap st-studio-inner">
      <div className="st-panel st-studio-panel">
        <p className="st-kicker"><span>05</span>Roof studio</p>
        <h2 id="st-studio-title">Design the roof. <em>Watch it measure itself.</em></h2>
        <div className="st-tabs" role="tablist" aria-label="Studio controls">
          {tabs.map((item, index) => <button key={item.id} id={tabId(item.id)} type="button" role="tab" aria-selected={tab === item.id} aria-controls={panelId(item.id)} tabIndex={tab === item.id ? 0 : -1} onClick={() => setTab(item.id)} onKeyDown={event => onTabKey(event, index)}>{item.label}</button>)}
        </div>

        <div className="st-tab-panel" role="tabpanel" id={panelId(tab)} aria-labelledby={tabId(tab)}>
          {tab === 'shape' && <>
            <fieldset className="st-field">
              <legend>Roof form</legend>
              <div className="st-segmented st-segmented-icons">
                {(['gable', 'hip'] as const).map(style => <label key={style}>
                  <input type="radio" name="st-style" checked={config.style === style} onChange={() => setConfig({ style })} />
                  <span><svg viewBox="0 0 40 24" aria-hidden="true">{style === 'gable' ? <path d="M3 20 20 5l17 15M8 20V14M32 20V14" /> : <path d="M3 20 12 6h16l9 14M8 20v-5M32 20v-5" />}</svg>{style === 'gable' ? 'Gable' : 'Hip'}</span>
                </label>)}
              </div>
            </fieldset>
            <div className="st-field">
              <label htmlFor={pitchId}>Pitch <output htmlFor={pitchId}>{config.pitch}/12 <small>· {degrees}°</small></output></label>
              <input id={pitchId} type="range" min={4} max={12} step={1} value={config.pitch} onChange={event => setConfig({ pitch: Number(event.target.value) })} style={{ '--fill': `${((config.pitch - 4) / 8) * 100}%` } as CSSProperties} />
              <div className="st-range-scale" aria-hidden="true"><span>Low 4/12</span><span>8/12</span><span>Steep 12/12</span></div>
            </div>
            <p className="st-hint">Steeper roofs shed water faster and have more area to cover. Watch the measurements change.</p>
          </>}

          {tab === 'finish' && <>
            <fieldset className="st-field">
              <legend>Finish</legend>
              <div className="st-finishes">
                {finishes.map(item => <label key={item.id} className="st-finish">
                  <input type="radio" name="st-finish" checked={config.finish === item.id} onChange={() => setConfig({ finish: item.id, color: item.colors[0].id })} />
                  <span><i style={{ background: item.colors[0].swatch }} aria-hidden="true" />{item.short}</span>
                </label>)}
              </div>
            </fieldset>
            <fieldset className="st-field">
              <legend>Colour <span className="st-legend-value">{color.name}</span></legend>
              <div className="st-swatches">
                {finish.colors.map(item => <label key={item.id} className="st-swatch" title={item.name}>
                  <input type="radio" name="st-color" checked={config.color === item.id} onChange={() => setConfig({ color: item.id })} aria-label={item.name} />
                  <span style={{ background: item.swatch }} />
                </label>)}
              </div>
            </fieldset>
            <p className="st-hint">{finish.summary}</p>
          </>}

          {tab === 'upgrades' && <ul className="st-toggles">
            {upgradeList.map(item => <li key={item.id}>
              <label className="st-toggle">
                <input type="checkbox" role="switch" checked={upgrades[item.id] > 0.5} onChange={event => set({ upgrades: { ...upgrades, [item.id]: event.target.checked ? 1 : 0 } })} />
                <span className="st-toggle-track" aria-hidden="true" />
                <span><strong>{item.name}</strong>{item.note}</span>
              </label>
            </li>)}
          </ul>}

          {tab === 'light' && <>
            <div className="st-field">
              <label htmlFor={lightId}>Time of day <output htmlFor={lightId}>{hour(state.tod)}</output></label>
              <input id={lightId} type="range" min={0} max={1} step={0.01} value={state.tod} onChange={event => set({ tod: Number(event.target.value) })} style={{ '--fill': `${state.tod * 100}%` } as CSSProperties} />
              <div className="st-range-scale" aria-hidden="true"><span>Dawn</span><span>Noon</span><span>Night</span></div>
            </div>
            <fieldset className="st-field">
              <legend>Camera</legend>
              <div className="st-segmented">
                {(['street', 'aerial', 'detail'] as const).map(view => <label key={view}><input type="radio" name="st-view" checked={state.view === view} onChange={() => { engine?.resetOrbit(); set({ view }) }} /><span>{view === 'street' ? 'Street' : view === 'aerial' ? 'Aerial' : 'Close-up'}</span></label>)}
              </div>
            </fieldset>
            <p className="st-hint">{live ? 'Drag the model to walk around it.' : 'The live model is unavailable here; measurements and prices still update.'}</p>
          </>}
        </div>

        <div className="st-readout" aria-live="polite">
          <dl>
            <div><dt>Roof area</dt><dd>{Math.round(metrics.areaFt2).toLocaleString('en-US')}<small> sq ft</small></dd></div>
            <div><dt>Squares</dt><dd>{metrics.squares.toFixed(1)}</dd></div>
            <div><dt>Ridges & hips</dt><dd>{Math.round(metrics.ridgeFt)}<small> ft</small></dd></div>
            <div><dt>Gutter runs</dt><dd>{Math.round(metrics.eaveFt)}<small> ft</small></dd></div>
          </dl>
          <div className="st-range">
            <p>Planning range</p>
            <strong>{money(range.low)} – {money(range.high)}</strong>
            <span>{finish.lifespan} · {finish.weight}</span>
            {range.notes.map(note => <span key={note} className="st-range-note">{note}</span>)}
          </div>
          <button type="button" className="st-button st-button-copper st-button-wide" onClick={onUse}>Add this design to my request <span aria-hidden="true">→</span></button>
          <p className="st-fine">Sample home, illustrative rates. Not a quote. Garage roof held at {metrics.garagePitch}/12 to stay under the main eave.</p>
        </div>
      </div>
    </div>
  </section>
}
