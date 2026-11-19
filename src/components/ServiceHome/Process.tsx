import { useEffect, useState, type KeyboardEvent } from 'react'
import { contractorOffers } from '../../content/contractorOffers'
import './process.css'

const steps = [
  { short: 'Agree', title: 'Agree the work', description: 'We confirm the deliverables, costs, responsibilities and terms. Your questions help shape the scope. Your agreement and invoices stay together in your private client portal.' },
  { short: 'Review', title: 'Review the working example', description: 'See the design and test the agreed inquiry path before launch.' },
  { short: 'Launch', title: 'Launch with a clear handoff', description: 'Know where inquiries arrive, what the tools do and how to ask for support.' },
]

export default function Process() {
  const [stage, setStage] = useState(0)
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)')
    const update = () => setCompact(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number | undefined
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % steps.length
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + steps.length - 1) % steps.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = steps.length - 1
    if (next !== undefined) {
      event.preventDefault()
      setStage(next)
      document.getElementById(`process-step-${next}`)?.focus()
    }
  }

  return <section className="r-section process-section" id="process" aria-labelledby="process-heading">
    <div className="r-wrap process-layout">
      <div className="process-intro">
        <h2 id="process-heading">Know what you get.<br /><em>Know what happens next.</em></h2>
        <p className="process-invitation">Explore what each step means for your project.</p>
      </div>
      <div className="process-steps" role="tablist" aria-label="Project steps" aria-orientation={compact ? 'horizontal' : 'vertical'}>
        {steps.map((step, index) => <button
          key={step.short}
          type="button"
          role="tab"
          id={`process-step-${index}`}
          aria-label={`${index + 1}. ${step.title}`}
          aria-selected={stage === index}
          aria-controls="process-example"
          tabIndex={stage === index ? 0 : -1}
          onClick={() => setStage(index)}
          onKeyDown={event => navigate(event, index)}
        >
          <span className="process-number" aria-hidden="true">{index + 1}</span>
          <span className="process-step-copy"><strong>{step.title}</strong><span>{step.description}</span></span>
          <span className="process-step-short" aria-hidden="true">{step.short}</span>
          <svg className="process-step-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
        </button>)}
      </div>
      <div className="process-sheet" id="process-example" role="tabpanel" tabIndex={0} aria-labelledby={`process-step-${stage}`}>
        <header className="process-sheet-heading">
          <h3>{['Your scope, in writing.', 'Try the customer’s path.', 'Who handles what.'][stage]}</h3>
          <p>Illustrative project · Business website</p>
        </header>
        <div className="process-sheet-body">
          <p className="process-mobile-description">{steps[stage].description}</p>
          {stage === 0 && <>
            <dl className="process-scope">
              <div><dt>Website & content</dt><dd>Agree the pages, services, service area and content to include.</dd></div>
              <div><dt>Inquiry delivery</dt><dd>Choose the inbox and confirm who on your team will reply.</dd></div>
              <div><dt>Care & terms</dt><dd>Define the update allowance, support limits, ownership, minimum term and cancellation.</dd></div>
            </dl>
            <p className="process-package-note"><strong>{contractorOffers.website.priceLabel}</strong> includes the agreed website build, hosting, technical maintenance and basic SEO.</p>
            <p className="process-cost-note">Domain registration and paid services may cost extra. These are confirmed before you commit.</p>
          </>}
          {stage === 1 && <>
            <ol className="process-review">
              <li><strong>Check the business details</strong><p>Are your services, service area and contact details right?</p></li>
              <li><strong>Use it on your phone</strong><p>Can a customer read the page and find how to get in touch?</p></li>
              <li><strong>Follow a test inquiry</strong><p>Send a sample through the form and confirm it reaches the agreed inbox.</p></li>
            </ol>
            <a className="process-example-link" href="#examples">Explore the website examples <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12" /></svg></a>
          </>}
          {stage === 2 && <dl className="process-responsibilities">
            <div><dt>Your team</dt><dd>Receives and replies to customer inquiries in the agreed inbox.</dd></div>
            <div><dt>Wallace Shift</dt><dd>Handles hosting and technical maintenance within your agreed website care scope.</dd></div>
            <div><dt>Confirm at handoff</dt><dd>Where to manage the agreed tools, how to request support and which changes are included.</dd></div>
          </dl>}
        </div>
        <footer className="process-sheet-footer">
          <strong>{['Your part', 'Before launch', 'Keep it clear'][stage]}</strong>
          <p>{[
            'Share what the website needs to explain and where you want inquiries to arrive.',
            'Use the working example to flag changes and check the agreed inquiry path with us.',
            'Your team handles the customer conversation. Automatic follow up is a separate service.',
          ][stage]}</p>
        </footer>
      </div>
    </div>
  </section>
}
