import { useRef, useState } from 'react'
import type { LeadContext } from '../lead'
import type { RoofAddress } from '../roof/types'
import { useReveal } from '../useReveal'
import { TimelapseHero } from '../timelapse/TimelapseHero'
import { Estimator } from '../components/Estimator'
import { Financing } from '../components/Financing'
import { QuickAnswers } from '../components/QuickAnswers'
import { Guides } from '../components/PageLinks'
import { EstimateForm } from '../components/EstimateForm'
import { SiteFooter } from '../components/SiteFooter'
import { MobileActionBar } from '../components/MobileActionBar'

/**
 * The home page, top to bottom: the job (timelapse), the roof priced, how to
 * pay for it, the short answers with the way into each deeper page, and the
 * qualifying form. The roof a visitor prices (and the address it was found
 * at) and the payment they work out are carried into their lead, so the
 * contractor knows what they have already seen.
 */
export function HomePage() {
  const mainRef = useRef<HTMLElement>(null)
  const [ballpark, setBallpark] = useState<LeadContext['ballpark']>(null)
  const [payment, setPayment] = useState<LeadContext['payment']>(null)
  const [roofAddress, setRoofAddress] = useState<RoofAddress | null>(null)
  useReveal(mainRef)

  return (
    <>
      <main id="main" ref={mainRef}>
        <TimelapseHero />
        <Estimator onBallpark={setBallpark} onAddress={setRoofAddress} />
        <Financing ballpark={ballpark} onPayment={setPayment} />
        <QuickAnswers />
        <Guides />
        <EstimateForm context={{ ballpark, payment }} prefill={roofAddress} />
      </main>
      <SiteFooter />
      <MobileActionBar ballpark={ballpark} estimator />
    </>
  )
}
