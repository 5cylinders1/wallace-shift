import { useEffect } from 'react'
import { addToBrief } from '../brief'
import { PRICE_NOTE, money, repairs, type RepairId } from '../pricing'
import { href, navigate, onLink } from '../routes'
import { TierBadge } from '../sections/CrackDecoder'
import CrackFigure from '../sections/CrackFigure'
import ElevationMap from '../sections/ElevationMap'
import type { Figure, Tier } from '../symptoms'

/** A sample report for a fictional home. Every finding and reading below is invented for the concept. */

const findings: { n: number; title: string; tier: Tier; detail: string; figure: Figure; x: number; y: number }[] = [
  { n: 1, title: 'The rear left corner has settled', tier: 'soon', figure: 'step', x: 4, y: 24, detail: 'Floor survey shows −1.42 in. at the rear left bedroom. Stair-step crack in the west basement wall, widest 1/8 in. Two doors on that side stick.' },
  { n: 2, title: 'Horizontal crack in the east wall', tier: 'soon', figure: 'horizontal', x: 40, y: 14, detail: 'Crack along a mortar joint at mid-height, with the wall bowed 3/8 in. at the middle against a string line. Damp at the floor joint below.' },
  { n: 3, title: 'Water is being sent toward the east wall', tier: 'look', figure: 'cove', x: 37, y: 3, detail: 'Two downspouts discharge at the wall. The soil falls 2 in. toward the house over the first 10 ft, where code asks for 6 in. of fall away.' },
  { n: 4, title: 'Thin vertical cracks in the north wall', tier: 'watch', figure: 'vertical', x: 22, y: 28, detail: 'Two dry shrinkage cracks in the poured section. Added to the crack log to check monthly.' },
]

const options: { name: string; title: string; items: [RepairId, number][]; fixes: string; leaves: string }[] = [
  { name: 'Option A', title: 'Water first', items: [['extension', 3], ['regrade', 1]], fixes: 'The water reaching the east wall.', leaves: 'The settled corner and the bowed wall. We would measure again in six months.' },
  { name: 'Option B', title: 'Stabilize', items: [['extension', 3], ['regrade', 1], ['straps', 1], ['piers', 6]], fixes: 'Water outside, the bowed east wall, and the settled corner, lifted back toward level.', leaves: 'Any water that still reaches the footing in long wet spells.' },
  { name: 'Option C', title: 'Stabilize and drain', items: [['extension', 3], ['regrade', 1], ['straps', 1], ['piers', 6], ['drain', 1], ['battery', 1]], fixes: 'Everything in B, plus water at the east floor joint.', leaves: 'Nothing we found, though clay will keep moving with the seasons.' },
]

const total = (items: [RepairId, number][]) => items.reduce((sum, [id, count]) => ({ low: sum.low + repairs[id].low * count, high: sum.high + repairs[id].high * count }), { low: 0, high: 0 })

export default function ReportPage() {
  useEffect(() => { document.title = 'Sample foundation inspection report | Datum Foundation & Waterproofing' }, [])
  const book = () => {
    addToBrief({ symptoms: [], source: 'Sample report', note: 'Saw the sample report' })
    navigate(href.home('#request'))
  }
  return <main id="main" className="dt-page dt-report">
    <div className="dt-wrap">
      <nav className="dt-crumbs" aria-label="Breadcrumb"><a href={href.home()} onClick={onLink}>Home</a><span aria-hidden="true">/</span><span aria-current="page">Sample report</span></nav>
      <header className="dt-report-head">
        <div>
          <p className="dt-eyebrow">Sample inspection report</p>
          <h1>What you get after we visit.</h1>
          <p className="dt-lede">This is the report for a fictional ranch house with a block basement. Yours would follow the same order: what we found, the floor survey, the cracks, and your options.</p>
        </div>
        <dl className="dt-report-meta">
          <div><dt>Report</dt><dd className="dt-mono">D-SAMPLE-0417</dd></div>
          <div><dt>Home</dt><dd>Fictional · Kansas City area</dd></div>
          <div><dt>Type</dt><dd>Ranch, block basement</dd></div>
          <div><dt>Weather</dt><dd>Dry, after a wet spring</dd></div>
        </dl>
      </header>

      <section className="dt-report-section" aria-labelledby="found-title">
        <h2 id="found-title"><span className="dt-mono">01</span> What we found</h2>
        <ol className="dt-findings">{findings.map(item => <li key={item.n}>
          <span className="dt-finding-n dt-mono">{item.n}</span>
          <div><h3>{item.title}</h3><p>{item.detail}</p></div>
          <TierBadge tier={item.tier} />
        </li>)}</ol>
      </section>

      <section className="dt-report-section" aria-labelledby="survey-title">
        <h2 id="survey-title"><span className="dt-mono">02</span> Floor-level survey</h2>
        <p className="dt-section-lede">We measure the floor every 4 ft against one reference point at the front door. Here the floor falls toward the rear left corner. The second view shows the level we would aim for after lifting.</p>
        <ElevationMap />
      </section>

      <section className="dt-report-section" aria-labelledby="cracks-title">
        <h2 id="cracks-title"><span className="dt-mono">03</span> Basement crack map</h2>
        <div className="dt-crack-map">
          <svg viewBox="-6 -6 52 40" role="img" aria-label="Basement plan with four numbered findings">
            <rect x="0" y="0" width="40" height="28" fill="var(--dt-figure-fill)" stroke="var(--dt-ink)" strokeWidth="0.8" />
            <g fontFamily="var(--dt-mono)" fontSize="1.8" fill="var(--dt-ink-2)">
              <text x="20" y="-2" textAnchor="middle">North · rear</text><text x="20" y="32.6" textAnchor="middle">South · front</text>
              <text x="-2" y="14" textAnchor="middle" transform="rotate(-90 -2 14)">West</text><text x="42.6" y="14" textAnchor="middle" transform="rotate(90 42.6 14)">East</text>
            </g>
            <rect x="2" y="2" width="5" height="12" fill="none" stroke="var(--dt-ink)" strokeWidth="0.3" strokeDasharray="0.8 0.6" />
            <text x="4.5" y="9" fontSize="1.4" textAnchor="middle" fontFamily="var(--dt-mono)" fill="var(--dt-ink-2)">stairs</text>
            {findings.map(item => <g key={item.n}>
              <circle cx={item.x} cy={28 - item.y} r="2.2" fill={item.tier === 'watch' ? 'var(--dt-paper)' : 'var(--dt-stress)'} stroke="var(--dt-ink)" strokeWidth="0.3" />
              <text x={item.x} y={28 - item.y + 0.7} fontSize="2" textAnchor="middle" fontFamily="var(--dt-mono)" fill={item.tier === 'watch' ? 'var(--dt-ink)' : '#fff'}>{item.n}</text>
            </g>)}
          </svg>
          <ul className="dt-photo-grid">{findings.map(item => <li key={item.n}>
            <CrackFigure figure={item.figure} />
            <p><span className="dt-mono">{item.n}</span> {item.title}</p>
          </li>)}</ul>
        </div>
        <p className="dt-fine">In a real report these are photographs with measurements marked on them. Drawings are used here because the house is fictional.</p>
      </section>

      <section className="dt-report-section" aria-labelledby="options-title">
        <h2 id="options-title"><span className="dt-mono">04</span> Your options</h2>
        <div className="dt-options">{options.map(option => {
          const sum = total(option.items)
          return <article key={option.name} className="dt-option">
            <p className="dt-label">{option.name}</p>
            <h3>{option.title}</h3>
            <p className="dt-option-price">{money(sum.low)}–{money(sum.high)}</p>
            <ul>{option.items.map(([id, count]) => <li key={id}>{repairs[id].name}{count > 1 ? ` × ${count}` : ''}</li>)}</ul>
            <p><strong>Fixes:</strong> {option.fixes}</p>
            <p><strong>Leaves:</strong> {option.leaves}</p>
          </article>
        })}</div>
        <p className="dt-fine">{PRICE_NOTE} Warranty terms and any engineer’s notes would appear here in a real report.</p>
      </section>

      <div className="dt-report-actions">
        <button type="button" className="dt-button dt-button-ink" onClick={book}>Book an inspection</button>
        <button type="button" className="dt-button dt-button-line" onClick={() => window.print()}>Print this sample</button>
      </div>
    </div>
  </main>
}
