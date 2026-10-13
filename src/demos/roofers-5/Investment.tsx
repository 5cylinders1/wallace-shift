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

const lifeGuidelines = [
  { label: 'Architectural asphalt', years: '30 years', start: 0, length: 20 },
  { label: 'Metal', years: '40–80 years', start: 26.667, length: 26.667 },
  { label: 'Natural slate', years: '60–150 years', start: 40, length: 60 },
]

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

function SourceArrow() {
  return <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 12 12 4M4 4h8v8" stroke="currentColor" strokeWidth="1.2" /></svg>
}

export default function Investment() {
  const [material, setMaterial] = useState<Material>('asphalt')
  const [year, setYear] = useState<ReportYear>(2025)
  const selected = reports[year][material]
  const source = `https://www.jlconline.com/cost-vs-value/${year}/`

  return <section className="velar-investment" id="investment" aria-labelledby="velar-investment-heading">
    <div className="velar-investment-inner">
      <header className="velar-investment-heading">
        <div><p className="velar-investment-eyebrow">THE OWNERSHIP HORIZON</p><h2 id="velar-investment-heading">Designed for<br />the decades ahead.</h2></div>
        <p>Architectural character is only part of the decision. Consider the life of the roof assembly, the conditions it will face and the way your plans for the property may change.</p>
      </header>

      <div className="velar-investment-panels">
        <article className="velar-investment-evidence" aria-labelledby="velar-investment-resale-heading">
          <div className="velar-investment-card-heading"><div><p className="velar-investment-eyebrow">01 / PUBLISHED RESALE ESTIMATES</p><h3 id="velar-investment-resale-heading">A measured view of resale.</h3></div><span className="velar-investment-report-tag">JLC / NATIONAL DATA</span></div>
          <p className="velar-investment-card-intro">Compare roof replacements in the Journal of Light Construction’s Cost vs. Value reports.</p>

          <div className="velar-investment-controls">
            <div className="velar-investment-materials" role="group" aria-label="Roof material in published report">
              <button type="button" aria-pressed={material === 'asphalt'} onClick={() => setMaterial('asphalt')}>Asphalt shingles</button>
              <button type="button" aria-pressed={material === 'metal'} onClick={() => setMaterial('metal')}>Metal roof</button>
            </div>
            <div className="velar-investment-years" role="group" aria-label="Report year">
              {([2024, 2025] as const).map(reportYear => <button type="button" key={reportYear} aria-pressed={year === reportYear} onClick={() => setYear(reportYear)}>{reportYear}</button>)}
            </div>
          </div>

          <div className="velar-investment-result" aria-live="polite" aria-atomic="true">
            <div className="velar-investment-recovery"><strong>{selected.recovery}<small>%</small></strong><span>Published cost recovery<br />{year} national estimate</span></div>
            <div className="velar-investment-chart">
              <div className="velar-investment-data-row"><div><span>Replacement cost</span><strong>{money.format(selected.cost)}</strong></div><div className="velar-investment-bar velar-investment-bar-cost" aria-hidden="true"><span /></div></div>
              <div className="velar-investment-data-row"><div><span>Estimated resale contribution</span><strong>{money.format(selected.value)}</strong></div><div className="velar-investment-bar velar-investment-bar-value" aria-hidden="true"><span style={{ width: `${selected.value / selected.cost * 100}%` }} /></div></div>
            </div>
          </div>

          <div className="velar-investment-comparison"><span>REPORT SNAPSHOTS</span><p><b>2024</b> {reports[2024][material].recovery}%<i aria-hidden="true" /><b>2025</b> {reports[2025][material].recovery}%</p><small>Published percentages rounded.</small></div>
          <p className="velar-investment-context">Survey estimates for specified projects. These figures describe separate markets in time, not one home’s appreciation or a premium for luxury roofing.</p>
          <div className="velar-investment-card-footer"><a href={source} target="_blank" rel="noreferrer">View the {year} source <SourceArrow /></a><a href="https://www.jlconline.com/cost-vs-value/2025/methodology/" target="_blank" rel="noreferrer">How the report is made <SourceArrow /></a></div>
          <details className="velar-investment-methodology"><summary>What does this mean for your residence? <span aria-hidden="true">+</span></summary><div><p>Real estate professionals estimate resale value for the report’s defined scope; the values are not recorded home-sale outcomes. Condition, location and buyer preferences influence the result.</p><p>Use a site-specific proposal to establish your project cost and local real estate advice to consider resale implications. The data does not forecast your return.</p></div></details>
        </article>

        <article className="velar-investment-lifecycle" aria-labelledby="velar-investment-lifecycle-heading">
          <p className="velar-investment-eyebrow">02 / MATERIAL LONGEVITY</p><h3 id="velar-investment-lifecycle-heading">Plan beyond the installation.</h3>
          <p className="velar-investment-card-intro">General service-life guidelines help put today’s material decision into a longer frame.</p>
          <div className="velar-investment-lifespans">
            {lifeGuidelines.map(item => <div className="velar-investment-life-row" key={item.label}><div><span>{item.label}</span><strong>{item.years}</strong></div><div className="velar-investment-life-track" aria-hidden="true"><span style={{ marginLeft: `${item.start}%`, width: `${item.length}%` }} /></div></div>)}
            <div className="velar-investment-life-axis" aria-hidden="true"><span>0</span><span>50</span><span>100</span><span>150 YEARS</span></div>
          </div>
          <p className="velar-investment-small">Guidelines assume normal wear and recommended maintenance. Exposure, workmanship and care can change service life; the ranges are not warranties.</p>
          <a href="https://www.nachi.org/life-expectancy.htm" target="_blank" rel="noreferrer" className="velar-investment-source">InterNACHI life-expectancy guidance <SourceArrow /></a>
          <div className="velar-investment-climate"><span className="velar-investment-climate-mark" aria-hidden="true"><svg viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="5" stroke="currentColor" /><path d="M14 2v4m0 16v4M2 14h4m16 0h4M5.5 5.5l3 3m11 11 3 3m0-17-3 3m-11 11-3 3" stroke="currentColor" /></svg></span><div><h4>Performance depends on place.</h4><p>Reflective finishes can reduce cooling needs in warm climates. Climate, insulation and the roof assembly determine the benefit; cold climates can bring a winter heating penalty.</p><a href="https://www.energy.gov/sites/prod/files/guide_to_cool_roofs.pdf" target="_blank" rel="noreferrer" className="velar-investment-source">U.S. Department of Energy <SourceArrow /></a></div></div>
        </article>
      </div>
    </div>
  </section>
}
