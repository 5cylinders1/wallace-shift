import { useState, type ReactNode } from 'react'
import { estatePath } from './routes'
import './Guides.css'

type Guide = 'process' | 'insurance' | 'cost'

const guides = {
  process: {
    number: '01', label: 'The process', title: <>Good work starts<br />with a <em>clear plan.</em></>,
    lead: 'From the first inspection to the final walk-through. Know what happens, what to prepare, and what to ask before a crew arrives.',
    sections: [
      ['before-work', 'Before work begins'], ['installation', 'During installation'],
      ['at-home', 'Life around the work'], ['warranties', 'The final handover'],
    ],
  },
  insurance: {
    number: '02', label: 'Insurance, explained', title: <>Know the damage.<br /><em>Know the coverage.</em></>,
    lead: 'A roofing inspection and an insurance decision answer different questions. Here is how to prepare for both.',
    sections: [
      ['coverage', 'What may be covered'], ['your-share', 'Your share of the cost'],
      ['claim-steps', 'The claim, step by step'], ['commercial', 'Commercial properties'],
    ],
  },
  cost: {
    number: '03', label: 'Costs & payment', title: <>A considered roof.<br />A <em>clear investment.</em></>,
    lead: 'A useful estimate explains the work behind the number. Start with the scope, then compare how you would pay for it.',
    sections: [
      ['price-drivers', 'What shapes the price'], ['estimate', 'Read the whole estimate'],
      ['payment', 'Compare payment options'], ['calculator', 'Explore a monthly budget'],
    ],
  },
} satisfies Record<Guide, { number: string; label: string; title: ReactNode; lead: string; sections: string[][] }>

function Section({ id, number, title, children }: { id: string; number: string; title: string; children: ReactNode }) {
  return <section id={id} className="er-guide-section" aria-labelledby={`${id}-title`}>
    <p className="er-guide-section__number">{number}</p>
    <div className="er-guide-section__body">
      <h2 id={`${id}-title`}>{title}</h2>
      {children}
    </div>
  </section>
}

function FurtherReading({ children }: { children: ReactNode }) {
  return <details className="er-guide-sources">
    <summary>Further reading <span aria-hidden="true">+</span></summary>
    <div><p>Independent guidance and manufacturer explanations. Your own policy, contract, and written warranty determine what applies.</p>
      <ul>{children}</ul>
    </div>
  </details>
}

function ProcessGuide() {
  return <>
    <Section id="before-work" number="01" title="Inspect first. Agree on the scope.">
      <p>Start with the roof’s condition, drainage, ventilation, flashing, and any signs of water inside. The recommendation should explain whether repair or replacement makes sense—and why.</p>
      <p>Before work begins, agree on materials, permits, access, protection, disposal, payment stages, and how concealed damage will be priced. Ask who will be your contact on site.</p>
      <p className="er-guide-note">The homepage film compresses a project into 48 illustrative hours. Your schedule depends on roof size, pitch, layers, access, weather, inspections, and repairs found after tear-off.</p>
    </Section>
    <Section id="installation" number="02" title="The work beneath the finish.">
      <ol className="er-guide-sequence">
        <li><strong>Protect & prepare.</strong><span>Set up access and material staging; agree how landscaping and the building will be protected.</span></li>
        <li><strong>Open & inspect.</strong><span>Remove the agreed layers and inspect the deck. Document unexpected repairs and approve changes before proceeding.</span></li>
        <li><strong>Build the system.</strong><span>Install the specified water-control layers, flashing, roof covering, and ventilation for the chosen assembly.</span></li>
        <li><strong>Check & clean.</strong><span>Inspect the finished work, remove debris, and walk the property together. Confirm any outstanding items in writing.</span></li>
      </ol>
    </Section>
    <Section id="at-home" number="03" title="Plan around the disruption.">
      <p>Ask your contractor whether staying home suits your project. Expect noise, vibration, dust, and activity outside. A quieter place may be better for remote work, young children, or noise-sensitive pets.</p>
      <ul className="er-guide-bullets">
        <li>Move vehicles and outdoor belongings clear of the work area.</li>
        <li>Protect attic and garage storage; secure fragile wall items.</li>
        <li>Agree on safe entry, exit, and areas children and pets must avoid.</li>
        <li>Stay reachable if the crew finds something that needs your decision.</li>
      </ul>
      <p>For an occupied business, plan tenant notices, customer access, delivery times, and any equipment or air-intake precautions with the project team.</p>
    </Section>
    <Section id="warranties" number="04" title="Leave with the paperwork.">
      <div className="er-guide-comparison">
        <div><h3>Material coverage</h3><p>A manufacturer’s warranty addresses specified product defects. Check what materials and labor it includes, exclusions, and whether coverage reduces over time.</p></div>
        <div><h3>Workmanship coverage</h3><p>Installation coverage may come from the contractor or an eligible manufacturer program. Get the provider, term, claim process, and exclusions in writing.</p></div>
      </div>
      <p>Keep your contract, change orders, final invoice, product details, inspection records, and warranty documents. Confirm registration, transfer rules, and maintenance requirements. A warranty term is not a promise of roof life.</p>
    </Section>
    <FurtherReading>
      <li><a href="https://www.gaf.com/en-us/blog/your-home/the-ultimate-homeowners-checklist-for-your-next-roofing-project-cefef7dd-4d95-4fdf-b80f-9c47bc2e09b6" target="_blank" rel="noreferrer">GAF · Preparing for a roofing project ↗</a></li>
      <li><a href="https://www.gaf.com/en-us/blog/your-home/interested-in-a-roof-warranty-heres-what-to-know-e951f1f7-ccd6-4bf4-9602-39a1b9cad488" target="_blank" rel="noreferrer">GAF · Understanding roof warranties ↗</a></li>
    </FurtherReading>
  </>
}

function InsuranceGuide() {
  return <>
    <Section id="coverage" number="01" title="Damage is the starting point.">
      <p>Sudden storm damage may be covered. Age, wear, and maintenance problems generally are not. Your policy and endorsements determine what applies; a roof inspection cannot guarantee an insurance decision.</p>
      <p>Ask about roof-age payment schedules, wind or hail exclusions, and restrictions on particular materials. Damage to one section does not automatically mean the insurer will pay to replace the entire roof.</p>
      <p className="er-guide-note">A contractor can document the condition and explain repair costs. Your insurer determines coverage under your policy.</p>
    </Section>
    <Section id="your-share" number="02" title="Understand what stays with you.">
      <div className="er-guide-comparison">
        <div><span className="er-guide-abbreviation">RCV</span><h3>Replacement cost</h3><p>Considers repair or replacement with materials of similar kind and quality, subject to policy terms. Some eligible depreciation may be released after completed work.</p></div>
        <div><span className="er-guide-abbreviation">ACV</span><h3>Actual cash value</h3><p>Subtracts depreciation for age and condition. The payment may leave a larger gap between the insurance settlement and the cost of a new roof.</p></div>
      </div>
      <p>Your deductible is your share of a covered claim. It may be a fixed amount or a percentage of the insured dwelling value. Wind and hail can have a separate deductible.</p>
      <p>Also allow for items outside coverage, limits, and upgrades you choose. Ask your agent to explain the roof-specific terms before assuming what you will pay.</p>
    </Section>
    <Section id="claim-steps" number="03" title="A sequence, not a promised deadline.">
      <ol className="er-guide-sequence">
        <li><strong>Document & report.</strong><span>Photograph visible damage from a safe place and contact your insurer promptly. Ask about reporting and repair deadlines.</span></li>
        <li><strong>Protect the property.</strong><span>Arrange appropriate temporary protection and keep receipts. Coordinate permanent repairs with your insurer’s inspection.</span></li>
        <li><strong>Review the findings.</strong><span>Compare the adjuster’s scope with the contractor’s documented work. Ask how omitted or newly discovered damage should be submitted.</span></li>
        <li><strong>Complete & document.</strong><span>Keep invoices and completion records. Ask what is needed for any remaining eligible payment; a mortgage company may also be involved.</span></li>
      </ol>
      <p>Timing varies by claim, policy, and state requirements. Storm demand and requests for more information can affect the process. Ask your adjuster for the next step and expected update.</p>
    </Section>
    <Section id="commercial" number="04" title="A business building needs its own review.">
      <p>For commercial property, confirm the building owner, lease responsibilities, insured parties, and applicable policy. Roof repair coverage and business interruption coverage address different losses; neither is automatic.</p>
      <p>Share access limits and operating hours early. The inspection and work plan should account for tenants, customers, stock, and equipment.</p>
    </Section>
    <FurtherReading>
      <li><a href="https://insurance.mo.gov/raising-roof-insurance-coverage" target="_blank" rel="noreferrer">Missouri insurance regulator · Roof coverage ↗</a></li>
      <li><a href="https://content.naic.org/article/whats-difference-between-actual-cash-value-coverage-and-replacement-cost-coverage" target="_blank" rel="noreferrer">NAIC · Replacement cost and actual cash value ↗</a></li>
      <li><a href="https://www.tdi.texas.gov/pubs/consumer/cb025.html" target="_blank" rel="noreferrer">Texas insurance regulator · Claims and payments (Texas guidance) ↗</a></li>
      <li><a href="https://content.naic.org/consumer/small-business.htm" target="_blank" rel="noreferrer">NAIC · Small-business insurance ↗</a></li>
    </FurtherReading>
  </>
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const exampleBudget = [
  { item: 'Roof covering & installation', amount: 12_500, note: 'Covering, underlayment, edge materials, and installation labor; the work below is separate.' },
  { item: 'Tear-off & disposal', amount: 2_500, note: 'Removal of agreed existing layers, hauling, and disposal.' },
  { item: 'Flashing & ventilation', amount: 2_000, note: 'The specified flashing and ventilation materials and labor.' },
  { item: 'Access & property protection', amount: 1_500, note: 'Access equipment, staging, and protection of the property.' },
  { item: 'Permit & tax allowance', amount: 1_500, note: 'A placeholder for this illustration; actual requirements and charges vary.' },
]
const exampleTotal = exampleBudget.reduce((sum, item) => sum + item.amount, 0)

function SampleBudget() {
  return <div className="er-guide-budget">
    <p className="er-guide-eyebrow">Illustrative amounts only</p>
    <h3>A sample itemized budget.</h3>
    <p>These amounts were chosen to demonstrate a {money.format(exampleTotal)} budget. They are not contractor prices or an estimate for the pictured roof or your property.</p>
    <table>
      <caption className="er-guide-budget__caption">Illustrative project budget</caption>
      <thead><tr><th scope="col">Included work</th><th scope="col">Sample amount</th></tr></thead>
      <tbody>{exampleBudget.map(item => <tr key={item.item}>
        <th scope="row">{item.item}<span>{item.note}</span></th><td>{money.format(item.amount)}</td>
      </tr>)}</tbody>
      <tfoot><tr><th scope="row">Illustrative total</th><td>{money.format(exampleTotal)}</td></tr></tfoot>
    </table>
    <p className="er-guide-budget__footnote">Concealed deck repairs and optional upgrades are excluded. A real proposal should state unit prices or allowances and require written approval for extra work.</p>
  </div>
}

function PaymentCalculator() {
  const [budget, setBudget] = useState(String(exampleTotal))
  const [apr, setApr] = useState('9.9')
  const [months, setMonths] = useState('60')
  const amount = Number(budget)
  const rate = Number(apr)
  const term = Number(months)
  const budgetValid = budget.trim() !== '' && Number.isFinite(amount) && amount > 0 && amount <= 1_000_000
  const aprValid = apr.trim() !== '' && Number.isFinite(rate) && rate >= 0 && rate <= 100
  const termValid = months.trim() !== '' && Number.isInteger(term) && term >= 1 && term <= 360
  const valid = budgetValid && aprValid && termValid
  const monthlyRate = rate / 1200
  // log1p/expm1 keep a small nonzero rate stable instead of rounding the
  // amortization denominator to zero. No interest uses equal principal.
  const payment = valid ? monthlyRate === 0 ? amount / term
    : amount * monthlyRate / -Math.expm1(-term * Math.log1p(monthlyRate)) : 0
  const total = payment * term

  return <div className="er-payment-tool">
    <div className="er-payment-tool__fields">
      <p className="er-payment-tool__eyebrow">Change the assumptions</p>
      <div className="er-payment-tool__field">
        <label htmlFor="er-finance-budget">Amount you would borrow <span>USD</span></label>
        <input id="er-finance-budget" type="number" inputMode="decimal" value={budget} min="0.01" max="1000000" step="0.01"
          aria-invalid={!budgetValid} aria-describedby={!budgetValid ? 'er-budget-error' : 'er-finance-assumptions'} onChange={event => setBudget(event.target.value)} />
        {!budgetValid && <p className="er-payment-tool__error" id="er-budget-error">Enter an amount above $0 and no more than $1,000,000.</p>}
      </div>
      <div className="er-payment-tool__pair">
        <div className="er-payment-tool__field">
          <label htmlFor="er-finance-apr">Illustrative APR <span>%</span></label>
          <input id="er-finance-apr" type="number" inputMode="decimal" value={apr} min="0" max="100" step="0.1"
            aria-invalid={!aprValid} aria-describedby={!aprValid ? 'er-apr-error' : 'er-finance-assumptions'} onChange={event => setApr(event.target.value)} />
          {!aprValid && <p className="er-payment-tool__error" id="er-apr-error">Enter a rate from 0% to 100%.</p>}
        </div>
        <div className="er-payment-tool__field">
          <label htmlFor="er-finance-months">Repayment term <span>months</span></label>
          <input id="er-finance-months" type="number" inputMode="numeric" value={months} min="1" max="360" step="1"
            aria-invalid={!termValid} aria-describedby={!termValid ? 'er-term-error' : 'er-finance-assumptions'} onChange={event => setMonths(event.target.value)} />
          {!termValid && <p className="er-payment-tool__error" id="er-term-error">Enter a whole number from 1 to 360.</p>}
        </div>
      </div>
    </div>
    <div className="er-payment-tool__result" role="status" aria-live="polite" aria-atomic="true">
      <p className="er-payment-tool__eyebrow">Illustrative monthly payment</p>
      <p className="er-payment-tool__amount">{valid ? money.format(payment) : '—'}</p>
      {valid ? <dl>
        <div><dt>Amount borrowed</dt><dd>{money.format(amount)}</dd></div>
        <div><dt>Estimated interest</dt><dd>{money.format(Math.max(0, total - amount))}</dd></div>
        <div><dt>Total of payments</dt><dd>{money.format(total)}</dd></div>
      </dl> : <p className="er-payment-tool__invalid">Check the inputs to see a payment illustration.</p>}
      <p className="er-payment-tool__disclaimer">A math illustration only. Not a roof quote, credit application, approval, or lender offer.</p>
    </div>
    <p id="er-finance-assumptions" className="er-payment-tool__assumptions">Assumes fixed APR equals the interest rate, no fees, equal monthly payments, and the first payment after one month. Amounts are rounded. Actual lender terms can differ.</p>
  </div>
}

function CostGuide() {
  return <>
    <Section id="price-drivers" number="01" title="The roof sets the scope.">
      <p>Floor area alone cannot price a roof. Roof surface, pitch, height, valleys, penetrations, layers, access, and the condition underneath all matter. Materials and local labor add another layer.</p>
      <p>An inspection and measurement turn a planning conversation into a written proposal. For commercial roofs, drainage, insulation, rooftop equipment, and occupied-building logistics also shape the work.</p>
    </Section>
    <Section id="estimate" number="02" title="Compare the same work.">
      <p>A complete estimate makes inclusions and assumptions visible. Ask each contractor to identify:</p>
      <ul className="er-guide-bullets">
        <li>The measured scope, tear-off layers, and specified roof system.</li>
        <li>Flashing, ventilation, edge details, disposal, and property protection.</li>
        <li>Permits, taxes, warranty terms, and payment stages.</li>
        <li>Decking or concealed-damage allowances, unit prices, and how you approve changes.</li>
      </ul>
      <p className="er-guide-note">An allowance is a stated assumption, not unlimited work. Ask what happens if the actual quantity is higher or lower.</p>
      <SampleBudget />
    </Section>
    <Section id="payment" number="03" title="Compare the whole cost of borrowing.">
      <p>Start with the cash price and an amount you are comfortable funding. If borrowing, compare lenders’ APRs, fees, repayment terms, total payments, and whether the debt is secured by your home.</p>
      <p>A smaller monthly payment can mean a longer commitment. Deferred-interest promotions can add interest back to the purchase date if their conditions are not met; they are different from a true zero-interest period.</p>
      <p>No lender program is offered through this demonstration. For business property, request terms appropriate to the borrowing entity and project.</p>
    </Section>
    <Section id="calculator" number="04" title="Try a borrowing scenario.">
      <p>These are hypothetical inputs, not available financing terms. Change the amount, rate, and repayment period to see how the monthly payment and total change.</p>
      <PaymentCalculator />
    </Section>
    <FurtherReading>
      <li><a href="https://consumer.ftc.gov/articles/how-avoid-home-improvement-scam" target="_blank" rel="noreferrer">FTC · Contracts, estimates, and financing ↗</a></li>
      <li><a href="https://www.consumerfinance.gov/ask-cfpb/what-is-a-personal-installment-loan-en-2114/" target="_blank" rel="noreferrer">CFPB · Personal installment loans ↗</a></li>
      <li><a href="https://www.consumerfinance.gov/archive/blog/how-understand-special-promotional-financing-offers-credit-cards/" target="_blank" rel="noreferrer">CFPB · Deferred interest and promotional offers ↗</a></li>
    </FurtherReading>
  </>
}

export default function GuidePage({ page }: { page: Guide }) {
  const guide = guides[page]
  return <div className="er-guide">
    <header className="er-guide-intro">
      <a className="er-guide-back" href={estatePath()}><span aria-hidden="true">←</span> Back to the roof</a>
      <p className="er-guide-eyebrow">The roofing field guide <span>/ {guide.number}</span></p>
      <h1>{guide.title}</h1>
      <p className="er-guide-intro__lead">{guide.lead}</p>
    </header>
    <div className="er-guide-layout">
      <aside className="er-guide-aside">
        <nav aria-label="On this page">
          <p className="er-guide-eyebrow">In this guide</p>
          <ol>{guide.sections.map(([id, label], index) => <li key={id}>
            <a href={`#${id}`}><span>0{index + 1}</span>{label}</a>
          </li>)}</ol>
        </nav>
        <nav className="er-guide-related" aria-label="More roofing guides">
          <p className="er-guide-eyebrow">Continue reading</p>
          {(Object.keys(guides) as Guide[]).filter(key => key !== page).map(key =>
            <a href={estatePath(key)} key={key}>{guides[key].label} <span aria-hidden="true">↗</span></a>)}
        </nav>
      </aside>
      <article className="er-guide-article" aria-label={guide.label}>
        {page === 'process' ? <ProcessGuide /> : page === 'insurance' ? <InsuranceGuide /> : <CostGuide />}
      </article>
    </div>
    <section className="er-guide-next" aria-labelledby="er-guide-next-title">
      <div><p className="er-guide-eyebrow">Your roof. Your next step.</p><h2 id="er-guide-next-title">Bring the questions.<br /><em>Start with a plan.</em></h2></div>
      <div><p>Share the property, the concern, and your timing. See what a well-prepared roofing enquiry looks like.</p><a href={estatePath('estimate')}>Plan your project <span aria-hidden="true">↗</span></a></div>
    </section>
  </div>
}
