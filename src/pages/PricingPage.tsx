import { PricingHero } from '../components/Pricing/PricingHero'
import { PricingDeck } from '../components/Pricing/PricingDeck'
import { TierTable } from '../components/Pricing/TierTable'
import { EngagementPanel } from '../components/Pricing/EngagementRows'
import { PricingDiagonal } from '../components/Pricing/PricingDiagonal'
import { PricingFaq } from '../components/Pricing/PricingFaq'
import { PricingCta } from '../components/Pricing/PricingCta'
import { engagementGroups } from '../content/pricing'
import { useRouteMeta } from '../hooks/useDocumentMeta'
import './PricingPage.css'

export function PricingPage() {
  useRouteMeta('/pricing')

  return (
    <>
      <PricingHero />

      {/* The three priced areas are panels of one deck, so the page costs
          the height of the tallest rather than the sum of all three. Panel
          order must match `pricingNav.items`. */}
      <div className="pricing-sections">
        <PricingDeck
          panels={[
            ...engagementGroups.map((group) => (
              <EngagementPanel key={group.id} group={group} />
            )),
            <TierTable key="websites" />,
          ]}
        />
      </div>

      <PricingDiagonal />
      <PricingFaq />
      <PricingCta />
    </>
  )
}
