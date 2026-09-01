import './PricingDiagonal.css'

/**
 * Bone-to-ink transition on the site's established lower-left-to-
 * upper-right slope. Lives outside the pricing sections so the sticky
 * sub-navigation is never left sitting on the dark wedge.
 */
export function PricingDiagonal() {
  return (
    <div className="pricing-diagonal" aria-hidden="true">
      <div className="pricing-diagonal__plane" />
      <div className="pricing-diagonal__edge" />
    </div>
  )
}
