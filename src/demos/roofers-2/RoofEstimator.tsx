import { useState, type MouseEvent } from 'react'
import type { LeadContext } from '../roofers/lead'
import { RoofTool } from '../roofers/roof/RoofTool'
import type { RoofAddress, RoofLookup } from '../roofers/roof/types'
import sampleLookup from '../roofers/roof/sampleLookup.json'
import { saveRoofEstimate } from './estimateContext'
import { estatePath } from './routes'
import './RoofEstimator.css'

const SAMPLE: RoofLookup = {
  ...sampleLookup as unknown as RoofLookup,
  imagery: {
    ...sampleLookup.imagery,
    src: '/demos/roofers-2/sample-roof.svg',
  },
}

export default function RoofEstimator() {
  const [estimate, setEstimate] = useState<LeadContext['ballpark']>(null)
  const [address, setAddress] = useState<RoofAddress | null>(null)
  const [storageUnavailable, setStorageUnavailable] = useState(false)
  const source = estimate?.roof?.source
  const estimateDisclaimer = source === 'sample'
    ? 'An illustrative range for the sample property, not your home. Adjust the settings to explore how size, slope and materials affect the budget.'
    : source === 'home-size'
      ? 'A rough planning range based on the home size, stories and pitch you entered. It is not a measured roof or a quote. An inspection confirms the dimensions and scope.'
      : source === 'outline'
        ? 'A planning range based on public building outlines and the pitch you set. Outlines may miss or include a porch. An inspection confirms the dimensions, condition and written scope.'
        : undefined

  function continueToBrief(event: MouseEvent<HTMLAnchorElement>) {
    if (estimate && saveRoofEstimate(estimate, address)) return
    event.preventDefault()
    setStorageUnavailable(true)
  }

  return <section className="er-planner" id="roof-planner" aria-labelledby="er-planner-title">
    <div className="er-wrap">
      <div className="er-planner__heading">
        <div><p className="er-eyebrow">THE ROOF PLANNER</p><h2 id="er-planner-title">Your roof.<br /><em>A clearer starting point.</em></h2></div>
        <div className="er-planner__intro"><p>Find your property, explore the roof’s size and slope, and see what a replacement could cost. A little perspective before the first visit.</p><span>NO CONTACT DETAILS NEEDED TO EXPLORE</span></div>
      </div>
      <div className="er-planner__key" aria-label="How the roof planner works"><span><b>01</b> Locate your property</span><span><b>02</b> Refine your roof</span><span><b>03</b> Plan your investment</span></div>
      <RoofTool onEstimate={setEstimate} onAddress={setAddress} presentation={{
        hideHeading: true,
        sample: SAMPLE,
        addressHelp: 'Your address is used by the map services to locate your property. Continue to your project brief to keep the result in this tab; this demo does not send it to a contractor.',
        estimateDisclaimer,
        ctaHref: estatePath('estimate'),
        ctaLabel: 'Use this estimate in my project brief',
        financingHref: estatePath('cost'),
        financingLabel: 'Explore cost & financing',
        showMonthlyExample: false,
        onContinue: continueToBrief,
      }} />
      {storageUnavailable && <div className="er-planner__storage" role="status">Your browser couldn’t save this estimate. Keep a note of the result, then <a href={estatePath('estimate')}>continue to your project brief</a>.</div>}
      <div className="er-planner__footnote"><span className="er-planner__seal" aria-hidden="true">A & S</span><p>A starting point, thoughtfully considered.<small>Map coverage varies. Roof size and pricing are approximate; an inspection and written scope determine the actual work and cost. Sample properties are illustrations.</small></p><a href={estatePath('cost')}>What shapes the price? <span aria-hidden="true">↗</span></a></div>
    </div>
  </section>
}
