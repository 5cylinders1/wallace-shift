import type { EngagementItem, SiteTier } from '../../content/pricing'

/**
 * One priced package. Extracted from the website tiers so Web Apps and
 * Automation present through the same component rather than through a copy
 * of it — parity is then structural, and a change to one is a change to all
 * three. The markup and class names are the tiers' own, unchanged, so the
 * desktop table renders exactly as it did.
 */
export interface PricingPackageData {
  id: string
  index: string
  name: string
  category?: string
  tagline?: string
  proof?: string
  badge?: string
  startsAt: boolean
  price: string
  priceUnit?: string
  delivery: string[]
  ctaLabel: string
  description: string
  bestFor?: string
  scope?: string[]
  scopeNote?: string
}

export const packageFromTier = (tier: SiteTier): PricingPackageData => ({
  id: tier.id,
  index: tier.index,
  name: tier.name,
  category: tier.category,
  tagline: tier.tagline,
  proof: tier.proof,
  badge: tier.badge,
  startsAt: tier.startsAt,
  price: tier.price,
  delivery: tier.delivery,
  ctaLabel: tier.ctaLabel,
  description: tier.description,
  bestFor: tier.bestFor,
  scope: tier.scope,
  scopeNote: tier.scopeNote,
})

/** An engagement item in the tiers' shape. The fields it has always had map
 *  directly; the rest are the drafted additions, and each block simply does
 *  not render while its field is absent. */
export const packageFromEngagement = (
  groupId: string,
  item: EngagementItem,
): PricingPackageData => ({
  id: `${groupId}-${item.index}`,
  index: item.index,
  name: item.title,
  category: item.category,
  tagline: item.tagline,
  startsAt: item.startsAt,
  price: item.price,
  priceUnit: item.priceUnit,
  // The tiers call this delivery and carry several lines; an engagement
  // carries one window, which is the same thing said once.
  delivery: [item.window],
  ctaLabel: item.ctaLabel ?? `Start a ${item.title.toLowerCase()} project`,
  description: item.description,
  bestFor: item.bestFor,
  scope: item.scope,
  scopeNote: item.note,
})
