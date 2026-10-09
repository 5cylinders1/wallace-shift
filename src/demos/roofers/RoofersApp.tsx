import { useRef, useState } from 'react'
import type { LeadContext } from './lead'
import type { RoofAddress } from './roof/types'
import { useReveal } from './useReveal'
import { SiteHeader } from './components/SiteHeader'
import { QuickAnswers } from './components/QuickAnswers'
import { Insurance } from './components/Insurance'
import { Cost } from './components/Cost'
import { Financing } from './components/Financing'
import { DuringTheJob } from './components/DuringTheJob'
import { Warranty } from './components/Warranty'
import { Faq } from './components/Faq'
import { EstimateForm } from './components/EstimateForm'
import { SiteFooter } from './components/SiteFooter'
import { MobileActionBar } from './components/MobileActionBar'
import { TimelapseHero } from './timelapse/TimelapseHero'

/**
 * The roofing demo, top to bottom: the job (timelapse), the short answers,
 * then each answer in depth in the order prospects ask — insurance, cost,
 * financing, living through it, warranty — and the qualifying form.
 *
 * The roof a visitor prices (and the address it was found at) and the
 * payment they work out are carried into their lead, so the contractor
 * knows what they have already seen.
 */
export function RoofersApp() {
  const mainRef = useRef<HTMLElement>(null)
  const [ballpark, setBallpark] = useState<LeadContext['ballpark']>(null)
  const [payment, setPayment] = useState<LeadContext['payment']>(null)
  const [roofAddress, setRoofAddress] = useState<RoofAddress | null>(null)
  useReveal(mainRef)

  return (
    <>
      <a className="rf-skip-link" href="#answers">
        Skip to the answers
      </a>
      <span id="top" />
      <SiteHeader />
      <main id="main" ref={mainRef}>
        <TimelapseHero />
        <QuickAnswers />
        <Insurance />
        <Cost onBallpark={setBallpark} onAddress={setRoofAddress} />
        <Financing ballpark={ballpark} onPayment={setPayment} />
        <DuringTheJob />
        <Warranty />
        <EstimateForm context={{ ballpark, payment }} prefill={roofAddress} />
        <Faq />
      </main>
      <SiteFooter />
      <MobileActionBar />
    </>
  )
}
