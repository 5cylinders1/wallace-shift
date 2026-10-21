import { useState } from 'react'
import { savePlan, useBrief } from '../brief'
import { href, onLink } from '../routes'
import { estimate, money, roomOptions, scopes, sizes, tiers, type RoomId, type ScopeId, type TierId } from '../pricing'
import Odometer from '../components/Odometer'
import { ClosingCta, SectionHead } from '../components/Sections'

function Segmented<T extends string>({ legend, name, value, options, onChange }: { legend: string; name: string; value: T; options: { id: T; label: string; detail: string }[]; onChange: (id: T) => void }) {
  return <fieldset className="tb-segmented">
    <legend>{legend}</legend>
    <div className="tb-segmented-row">
      {options.map(option => <label key={option.id} className={option.id === value ? 'is-active' : ''}>
        <input type="radio" name={name} value={option.id} checked={option.id === value} onChange={() => onChange(option.id)} />
        <strong>{option.label}</strong>
        <span>{option.detail}</span>
      </label>)}
    </div>
  </fieldset>
}

const drivers = [
  { title: 'Footage and layout', body: 'Linear feet of cabinetry is the biggest single driver. Corners, angled walls and islands with seating add fitting time.' },
  { title: 'Construction', body: 'Inset doors sit inside the frame with an even gap all round, so every door is fitted by hand. Expect more than overlay.' },
  { title: 'Wood and finish', body: 'Sequence-matched veneer and fluting cost more than paint-grade maple. Conversion-varnish paint is included at every level.' },
  { title: 'Scope', body: 'Cabinetry alone is one line. A full remodel adds demolition, plumbing, electrical, tile, flooring and the permits that go with them.' },
  { title: 'The house itself', body: 'Older homes hide things: out-of-plumb walls, old wiring, a joist where the vent should go. We price a contingency for it.' },
  { title: 'Appliances', body: 'Panel-ready refrigerators and dishwashers need matching panels and precise openings. Appliances themselves are not included.' },
]

export default function InvestmentPage() {
  const [room, setRoom] = useState<RoomId>('kitchen')
  const [size, setSize] = useState('family')
  const [tier, setTier] = useState<TierId>('painted')
  const [scope, setScope] = useState<ScopeId>('cabinetry')
  const brief = useBrief()

  const pickRoom = (next: RoomId) => {
    setRoom(next)
    const options = sizes[next]
    setSize(options[Math.min(1, options.length - 1)].id)
    if (!scopes.find(item => item.id === scope)?.rooms.includes(next)) setScope('surfaces')
  }

  const result = estimate(room, size, tier, scope)
  const roomLabel = roomOptions.find(item => item.id === room)!.label
  const sizeLabel = sizes[room].find(item => item.id === size)!.label
  const tierLabel = tiers.find(item => item.id === tier)!.label
  const scopeLabel = scopes.find(item => item.id === scope)!.label
  const label = `${roomLabel} · ${sizeLabel} · ${tierLabel} · ${scopeLabel}`
  const saved = brief.plan?.label === label
  const top = Math.max(...result.parts.map(part => part.high))

  return <main id="main" className="tb-invest-page">
    <section className="tb-page-head" aria-labelledby="tb-page-title">
      <div className="tb-wrap">
        <p className="tb-label">Investment</p>
        <h1 id="tb-page-title" tabIndex={-1} data-split>A planning range <em>for your room.</em></h1>
        <p className="tb-page-lede">Four questions, one range. It is built from the same per-foot figures we use to plan real projects, and it is not a quote: your proposal comes after we have measured the room.</p>
      </div>
    </section>

    <section className="tb-planner" aria-label="Planner">
      <div className="tb-wrap tb-planner-grid">
        <form className="tb-planner-form" onSubmit={event => event.preventDefault()}>
          <Segmented legend="1. Which room?" name="tb-room" value={room} options={roomOptions} onChange={pickRoom} />
          <Segmented legend="2. How big?" name="tb-size" value={size} options={sizes[room].map(item => ({ id: item.id, label: item.label, detail: item.detail }))} onChange={setSize} />
          <Segmented legend="3. Which construction?" name="tb-tier" value={tier} options={tiers} onChange={setTier} />
          <Segmented legend="4. How much of the room?" name="tb-scope" value={scope} options={scopes.filter(item => item.rooms.includes(room))} onChange={setScope} />
        </form>

        <div className="tb-planner-result" aria-live="polite">
          <p className="tb-label">Planning range</p>
          <p className="tb-planner-range"><Odometer value={money(result.low)} trigger="change" /> <span>to</span> <Odometer value={money(result.high)} trigger="change" /></p>
          <p className="tb-planner-label">{label}</p>
          <ul className="tb-planner-parts">
            {result.parts.map(part => <li key={part.label}>
              <span>{part.label}</span>
              <span className="tb-planner-bar" aria-hidden="true"><i style={{ left: `${part.low / top * 100}%`, width: `${(part.high - part.low) / top * 100}%` }} /></span>
              <span className="tb-planner-money">{money(part.low)}–{money(part.high)}</span>
            </li>)}
          </ul>
          <dl className="tb-planner-weeks">
            {result.weeks.map(week => <div key={week.label}><dt>{week.label}</dt><dd>{week.value}</dd></div>)}
          </dl>
          <div className="tb-planner-actions">
            <button type="button" className="tb-button tb-button-brass" aria-pressed={saved} onClick={() => savePlan({ label, low: result.low, high: result.high })}>
              {saved ? 'Saved to my consultation' : 'Save to my consultation'}
            </button>
            <a className="tb-link-arrow is-light" href={href.page('consultation')} onClick={onLink}>Book a consultation <span aria-hidden="true">→</span></a>
          </div>
          <p className="tb-fine is-light">Illustrative ranges for a fictional Kansas City studio. Appliances, plumbing fixtures and permits outside the scope shown are not included.</p>
        </div>
      </div>
    </section>

    <section className="tb-section" aria-labelledby="tb-drivers-title">
      <div className="tb-wrap">
        <SectionHead kicker="What moves the number" title="Six things that decide" em="where you land." id="tb-drivers-title" />
        <ul className="tb-drivers">
          {drivers.map(item => <li key={item.title} data-reveal><h3>{item.title}</h3><p>{item.body}</p></li>)}
        </ul>
      </div>
    </section>

    <section className="tb-section tb-paper-2" aria-labelledby="tb-sources-title">
      <div className="tb-wrap tb-sources">
        <h2 id="tb-sources-title" className="tb-h3">How these ranges were set</h2>
        <p>Per-foot cabinetry figures sit at the upper end of the national range for custom work, about $500 to $1,200 a linear foot according to <a href="https://www.angi.com/articles/custom-cabinets-cost.htm" target="_blank" rel="noreferrer">Angi</a> and <a href="https://www.homeadvisor.com/cost/cabinets-and-countertops/custom-cabinets/" target="_blank" rel="noreferrer">HomeAdvisor</a>, because every piece here is built to order. Full remodels were checked against Remodeling’s 2025 Cost vs. Value averages, as reported by <a href="https://www.nerdwallet.com/home-ownership/home-improvement/learn/kitchen-remodel-cost" target="_blank" rel="noreferrer">NerdWallet</a>: $82,793 for a major midrange kitchen remodel and $164,104 for an upscale one. A real cabinetmaker would replace all of this with their own numbers.</p>
      </div>
    </section>
    <ClosingCta />
  </main>
}
