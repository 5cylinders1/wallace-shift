import type { RefObject } from 'react'
import { upgradeList } from '../catalog'
import { buildPhases, damagePins, inspectionPins, stormSteps, tuneupItems, type ServiceValue } from '../content'
import { upgradeShown } from '../stage/director'

interface ServicesProps {
  sectionRef: RefObject<HTMLElement | null>
  step: number
  stepProgress: number
  highlight: number
  onHighlight: (index: number) => void
  onService: (service: ServiceValue) => void
}

function PinList({ pins, highlight, onHighlight, compact = false }: { pins: { anchor: string; label: string; note: string }[]; highlight: number; onHighlight: (index: number) => void; compact?: boolean }) {
  return <ol className={`st-pin-list ${compact ? 'st-pin-list-compact' : ''}`}>
    {pins.map((pin, index) => <li key={pin.anchor + pin.label} className={highlight === index ? 'is-active' : ''} onPointerEnter={() => onHighlight(index)} onPointerLeave={() => onHighlight(-1)}>
      <span>{index + 1}</span><div><strong>{pin.label}</strong><p>{pin.note}</p></div>
    </li>)}
  </ol>
}

export default function Services({ sectionRef, step, stepProgress, highlight, onHighlight, onService }: ServicesProps) {
  const build = step === 3 ? stepProgress : step > 3 ? 1 : 0
  const phase = buildPhases.reduce((found, item, index) => (Math.max(0, (build - 0.08) / 0.78) >= item.at ? index : found), 0)
  const upgradesProgress = step === 4 ? stepProgress : 0
  const current = (index: number) => (step === index ? 'is-current' : '')

  return <section ref={sectionRef} className="st-services st-stage-section" aria-labelledby="st-services-title">
    <h2 id="st-services-title" className="st-visually-hidden">Four ways we take care of a roof</h2>

    <div id="storm" className={`st-step ${current(0)}`} data-step="0">
      <div className="st-wrap">
        <article className="st-card">
          <p className="st-kicker"><span>02</span>Storm & insurance restoration</p>
          <h3 className="st-card-title">When the storm leaves, we arrive with evidence.</h3>
          <p>Hail bruises shingles you can’t see from the driveway. Wind breaks seal strips that hold for a season, then leak. We document every hit, write a scope your adjuster can follow and meet them on the roof.</p>
          <ol className="st-steps">
            {stormSteps.map((item, index) => <li key={item.title}><span>{index + 1}</span><div><strong>{item.title}</strong><p>{item.text}</p></div></li>)}
          </ol>
        </article>
      </div>
    </div>

    <div className={`st-step ${current(1)}`} data-step="1">
      <div className="st-wrap">
        <article className="st-card">
          <p className="st-kicker"><span>02</span>The morning after</p>
          <h3 className="st-card-title">Every hit, marked up.</h3>
          <p>This is what a Stratum storm report shows you: each kind of damage, where it is and why it matters.</p>
          <PinList pins={damagePins} highlight={step === 1 ? highlight : -1} onHighlight={onHighlight} />
          <p className="st-fine">Your insurer decides coverage. We document damage and explain the process; we never promise an outcome.</p>
          <button type="button" className="st-button st-button-copper" onClick={() => onService('storm')}>Book a storm inspection <span aria-hidden="true">→</span></button>
        </article>
      </div>
    </div>

    <div id="tune-ups" className={`st-step ${current(2)}`} data-step="2">
      <div className="st-wrap">
        <article className="st-card">
          <p className="st-kicker"><span>03</span>Roof tune-ups</p>
          <h3 className="st-card-title">A tune-up adds years. A leak takes them.</h3>
          <p>Most roofs fail at the details long before the shingles wear out. A tune-up checks the places leaks begin and fixes the small things on the spot.</p>
          <PinList pins={inspectionPins} highlight={step === 2 ? highlight : -1} onHighlight={onHighlight} compact />
          <div className="st-includes"><p>Every visit includes</p><ul>{tuneupItems.map(item => <li key={item}>{item}</li>)}</ul></div>
          <button type="button" className="st-button st-button-copper" onClick={() => onService('tuneup')}>Schedule a tune-up <span aria-hidden="true">→</span></button>
        </article>
      </div>
    </div>

    <div id="new-builds" className={`st-step st-step-long ${current(3)}`} data-step="3">
      <div className="st-wrap st-step-sticky">
        <article className="st-card">
          <p className="st-kicker"><span>04</span>New construction</p>
          <h3 className="st-card-title">Trusses to ridge cap, in the right order.</h3>
          <p>We work with your builder or architect from framing day. Deck, barriers, ventilation and finish go on in sequence, and every layer is photographed before it’s covered.</p>
          <ol className="st-phases" aria-label="Construction sequence">
            {buildPhases.map((item, index) => <li key={item.label} className={step < 3 ? '' : index < phase || step > 3 ? 'is-done' : index === phase ? 'is-current' : ''}>
              <span aria-hidden="true" />{item.label}
            </li>)}
          </ol>
          <button type="button" className="st-button st-button-copper" onClick={() => onService('build')}>Plan a new build <span aria-hidden="true">→</span></button>
        </article>
      </div>
    </div>

    <div id="upgrades" className={`st-step st-step-long ${current(4)}`} data-step="4">
      <div className="st-wrap st-step-sticky">
        <article className="st-card">
          <p className="st-kicker"><span>05</span>Roof enhancements</p>
          <h3 className="st-card-title">Make a good roof better.</h3>
          <p>Upgrades go best when they’re planned with the roof, not added after it. Each one is flashed and detailed as part of the roofing system.</p>
          <ul className="st-upgrade-list">
            {upgradeList.map((item, index) => <li key={item.id} className={upgradeShown(upgradesProgress, index) || step > 4 ? 'is-on' : ''}>
              <span aria-hidden="true" /><div><strong>{item.name}</strong><p>{item.note}</p></div>
            </li>)}
          </ul>
          <a className="st-button st-button-copper" href="#studio">Design yours in the studio <span aria-hidden="true">↓</span></a>
        </article>
      </div>
    </div>
  </section>
}
