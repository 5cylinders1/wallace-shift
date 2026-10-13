import { useState } from 'react'
import './investment.css'

type Material = 'asphalt' | 'metal'
type ReportYear = 2024 | 2025

const reports: Record<ReportYear, Record<Material, { cost: number; value: number; recovery: number }>> = {
  2024: {
    asphalt: { cost: 30680, value: 17461, recovery: 57 },
    metal: { cost: 49928, value: 24034, recovery: 48 },
  },
  2025: {
    asphalt: { cost: 31871, value: 21501, recovery: 68 },
    metal: { cost: 51865, value: 25972, recovery: 50 },
  },
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

function SourceArrow() {
  return <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 12 12 4M4 4h8v8" stroke="currentColor" strokeWidth="1.2" /></svg>
}

export default function Investment() {
  const [material, setMaterial] = useState<Material>('asphalt')
  const [year, setYear] = useState<ReportYear>(2025)
  const selected = reports[year][material]
  const source = `https://www.jlconline.com/cost-vs-value/${year}/`

  return (
    <section className="velar-investment" id="investment" aria-labelledby="velar-investment-heading">
      <div className="velar-investment-inner">
        <div className="velar-investment-editorial">
          <p className="velar-investment-eyebrow"><span /> THE LONG VIEW</p>
          <h2 id="velar-investment-heading">An investment in<br /><em>everything beneath it.</em></h2>
          <p className="velar-investment-intro">The right roof belongs to the architecture. Its value is felt in the character of your home, the comfort of its rooms, and the years you spend within them.</p>

          <div className="velar-investment-lifetime">
            <div className="velar-investment-note-heading"><span>01</span><h3>Think in decades.</h3></div>
            <p>Material choice sets a long-term planning horizon. These general service-life estimates offer a useful place to begin.</p>
            <div className="velar-investment-lifespans">
              <div><span>Architectural asphalt</span><strong>30<small> years</small></strong></div>
              <div><span>Metal</span><strong>40–80<small> years</small></strong></div>
              <div><span>Natural slate</span><strong>60–150<small> years</small></strong></div>
            </div>
            <p className="velar-investment-small">Climate, installation and maintenance affect life; these are planning guidelines, not warranties. <a href="https://www.nachi.org/life-expectancy.htm" target="_blank" rel="noreferrer">InterNACHI guidance <SourceArrow /></a></p>
          </div>

          <div className="velar-investment-climate">
            <div className="velar-investment-note-heading"><span>02</span><h3>Comfort, considered.</h3></div>
            <p>Reflective roof finishes can reduce heat entering a home and the need for cooling in warm climates. Your climate, insulation and roof assembly determine the benefit; cooler climates can bring a winter heating tradeoff.</p>
            <a href="https://www.energy.gov/sites/prod/files/guide_to_cool_roofs.pdf" target="_blank" rel="noreferrer" className="velar-investment-source">U.S. Department of Energy <SourceArrow /></a>
          </div>
        </div>

        <div className="velar-investment-evidence">
          <div className="velar-investment-card-heading">
            <div><p className="velar-investment-eyebrow">THE RESALE PERSPECTIVE</p><h3>What the reports say.</h3></div>
            <svg className="velar-investment-card-mark" viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M5 29V18l13-11 13 11v11H5Z" stroke="currentColor" strokeWidth="1"/><path d="M11 29V20h14v9M18 7v9M8 15h20" stroke="currentColor" strokeWidth="1"/></svg>
          </div>
          <p className="velar-investment-card-intro">Explore national roof-replacement estimates from the Journal of Light Construction’s Cost vs. Value reports.</p>

          <div className="velar-investment-materials" role="group" aria-label="Roof material in published report">
            <button type="button" aria-pressed={material === 'asphalt'} onClick={() => setMaterial('asphalt')}>Asphalt shingles</button>
            <button type="button" aria-pressed={material === 'metal'} onClick={() => setMaterial('metal')}>Standing-seam metal</button>
          </div>

          <div className="velar-investment-years" role="group" aria-label="Report year">
            {([2024, 2025] as const).map((reportYear) => (
              <button type="button" key={reportYear} aria-pressed={year === reportYear} onClick={() => setYear(reportYear)}>
                <span><i />{reportYear} REPORT</span>
                <strong>{reports[reportYear][material].recovery}<small>%</small></strong>
                <span className="velar-investment-year-caption">estimated cost recovery</span>
              </button>
            ))}
          </div>

          <div className="velar-investment-result" aria-live="polite" aria-atomic="true">
            <div className="velar-investment-result-title"><span>{year} NATIONAL SNAPSHOT</span><span>{material === 'asphalt' ? 'ASPHALT' : 'METAL'}</span></div>
            <div className="velar-investment-data-row">
              <div><span>Report project cost</span><strong>{money.format(selected.cost)}</strong></div>
              <div className="velar-investment-bar velar-investment-bar-cost" aria-hidden="true"><span /></div>
            </div>
            <div className="velar-investment-data-row">
              <div><span>Estimated value at resale</span><strong>{money.format(selected.value)}</strong></div>
              <div className="velar-investment-bar velar-investment-bar-value" aria-hidden="true"><span style={{ width: `${selected.value / selected.cost * 100}%` }} /></div>
            </div>
            <p className="velar-investment-result-note">The estimated resale contribution is {selected.recovery}% of the report’s project cost.</p>
          </div>

          <div className="velar-investment-card-footer">
            <a href={source} target="_blank" rel="noreferrer">Read the {year} report <SourceArrow /></a>
            <span>Published percentages rounded.</span>
          </div>

          <details className="velar-investment-methodology">
            <summary>Putting these numbers in context <span aria-hidden="true">+</span></summary>
            <div>
              <p>Resale values are real estate professionals’ survey estimates for specified projects, rather than observed sale prices. Report years are separate market snapshots; they do not follow one home over time.</p>
              <p>Location, scope, roof condition and buyer preferences affect results. These national figures do not predict your home’s appreciation or establish a premium for luxury materials.</p>
              <a href="https://www.jlconline.com/cost-vs-value/2025/methodology/" target="_blank" rel="noreferrer">Report methodology <SourceArrow /></a>
            </div>
          </details>
          <p className="velar-investment-qualification">National report examples. Your project requires a site-specific proposal, and your local real estate adviser can help assess resale implications.</p>
        </div>
      </div>
    </section>
  )
}
