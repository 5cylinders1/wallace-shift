import { faqs, processSteps, sellingSteps } from '../content'
import { href, onLink } from '../routes'
import CrackDecoder from './CrackDecoder'
import ElevationMap from './ElevationMap'

export function DecoderSection() {
  return <section id="decoder" className="dt-panel dt-panel-paper" aria-labelledby="decoder-title">
    <div className="dt-wrap">
      <div className="dt-panel-head">
        <p className="dt-eyebrow">Crack decoder</p>
        <h2 id="decoder-title">Most cracks aren’t emergencies. <em>Here’s how to tell.</em></h2>
        <p className="dt-lede">Pick what you’re seeing. You’ll get the usual cause, how soon to act and what the fix usually involves, plus a few quick checks that can change the answer.</p>
      </div>
      <CrackDecoder />
      <p className="dt-panel-foot"><a className="dt-text-link" href={href.cracks()} onClick={onLink}>Browse all ten symptoms →</a></p>
    </div>
  </section>
}

export function ReportPreview() {
  return <section id="report" className="dt-panel dt-panel-stone" aria-labelledby="report-title">
    <div className="dt-wrap dt-split">
      <div className="dt-split-copy">
        <p className="dt-eyebrow">Your inspection report</p>
        <h2 id="report-title">See what you get before we visit.</h2>
        <p className="dt-lede">Every inspection ends with a written report you can keep, share with an engineer or hand to the other side of a sale.</p>
        <ul className="dt-ticks">
          <li><strong>A floor-level survey</strong> of the whole house, measured against one reference point.</li>
          <li><strong>Every crack mapped</strong>, photographed and sorted by urgency.</li>
          <li><strong>The cause in plain words</strong>, with drainage checked before walls and piers.</li>
          <li><strong>Options side by side</strong>, each with a planning price and what it will not fix.</li>
        </ul>
        <a className="dt-button dt-button-ink" href={href.report()} onClick={onLink}>Open the sample report <span aria-hidden="true">→</span></a>
      </div>
      <div className="dt-split-media">
        <ElevationMap compact />
      </div>
    </div>
  </section>
}

export function LogTeaser() {
  const points = [[0, 0.8], [1, 0.8], [2, 0.8], [3, 1.6], [4, 1.6], [5, 1.6], [6, 2.4]]
  return <section className="dt-panel dt-panel-paper" aria-labelledby="log-title">
    <div className="dt-wrap dt-split dt-split-reverse">
      <div className="dt-split-copy">
        <p className="dt-eyebrow">Crack log</p>
        <h2 id="log-title">Not sure yet? <em>Measure it for a few weeks.</em></h2>
        <p className="dt-lede">For many cracks the honest advice is to watch them. The crack log keeps the dates, widths and photos in one place, tells you if a crack is growing, and attaches the history to your request if you book.</p>
        <a className="dt-button dt-button-ink" href={href.log()} onClick={onLink}>Start a crack log <span aria-hidden="true">→</span></a>
      </div>
      <div className="dt-split-media">
        <figure className="dt-log-teaser">
          <svg viewBox="0 0 320 170" aria-hidden="true">
            <g stroke="var(--dt-rule)" strokeWidth="1">{[30, 70, 110, 150].map(y => <line key={y} x1="30" x2="310" y1={y} y2={y} />)}</g>
            <polyline fill="none" stroke="var(--dt-stress)" strokeWidth="2.5" points={points.map(([x, y]) => `${40 + x * 44},${150 - y * 40}`).join(' ')} />
            {points.map(([x, y]) => <circle key={x} cx={40 + x * 44} cy={150 - y * 40} r="4" fill="var(--dt-paper)" stroke="var(--dt-stress)" strokeWidth="2" />)}
            <g fontFamily="var(--dt-mono)" fontSize="10" fill="var(--dt-ink-2)"><text x="30" y="166">Mar</text><text x="290" y="166">Sep</text><text x="0" y="34">3 mm</text></g>
          </svg>
          <figcaption><span className="dt-tier dt-tier-look">Growing</span> Wider by 1/16 in. since March. Growth is the main warning sign.</figcaption>
        </figure>
      </div>
    </div>
  </section>
}

export function Selling() {
  return <section className="dt-panel dt-panel-ink" aria-labelledby="selling-title">
    <div className="dt-wrap">
      <div className="dt-panel-head">
        <p className="dt-eyebrow">Buying or selling?</p>
        <h2 id="selling-title">A foundation note on an inspection report doesn’t have to stall a sale.</h2>
      </div>
      <ol className="dt-columns">
        {sellingSteps.map((step, index) => <li key={step.title}>
          <span className="dt-mono">{String(index + 1).padStart(2, '0')}</span>
          <h3>{step.title}</h3>
          <p>{step.body}</p>
        </li>)}
      </ol>
      <a className="dt-button dt-button-paper" href="#request">Add your closing date <span aria-hidden="true">→</span></a>
    </div>
  </section>
}

export function Process() {
  return <section className="dt-panel dt-panel-paper" aria-labelledby="process-title">
    <div className="dt-wrap">
      <div className="dt-panel-head">
        <p className="dt-eyebrow">How we work</p>
        <h2 id="process-title">Measured before and after.</h2>
      </div>
      <ol className="dt-columns dt-columns-four">
        {processSteps.map((step, index) => <li key={step.title}>
          <span className="dt-mono">{String(index + 1).padStart(2, '0')}</span>
          <h3>{step.title}</h3>
          <p>{step.body}</p>
        </li>)}
      </ol>
    </div>
  </section>
}

export function Faq() {
  return <section className="dt-panel dt-panel-paper dt-faq" aria-labelledby="faq-title">
    <div className="dt-wrap dt-faq-grid">
      <div>
        <p className="dt-eyebrow">Questions</p>
        <h2 id="faq-title">Straight answers.</h2>
      </div>
      <div>{faqs.map(item => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}</div>
    </div>
  </section>
}
