/**
 * Structured options for the enquiry form.
 *
 * Every service and package name here is the one already published on the
 * site — they are read from `siteConfig` and `pricing` rather than restated,
 * so a rename in one place cannot leave the form describing something that
 * no longer exists. Budget bands are cut at the published starting prices
 * for the same reason: they are buckets for the enquirer to choose from,
 * not new claims about what anything costs.
 */
import { services } from './siteConfig'
import { siteTiers, engagementGroups } from './pricing'

export type EnquiryOption = { value: string; label: string }

const UNSURE = { value: 'unsure', label: 'Not sure yet' }

export const enquiryServices: EnquiryOption[] = [
  ...services.items.map(item => ({ value: item.enquiryValue, label: `${item.label} — ${item.title}` })),
  UNSURE,
]

export const enquiryPackages: EnquiryOption[] = [
  ...engagementGroups.map(group => ({ value: group.id, label: group.label })),
  ...siteTiers.tiers.map(tier => ({ value: tier.id, label: `${tier.name} — ${tier.category}` })),
  UNSURE,
]

/** Bands cut at the published starting prices, so a choice here lines up
 *  with what the pricing page already says. */
export const enquiryBudgets: EnquiryOption[] = [
  { value: 'under-1k', label: 'Under $1,000' },
  { value: '1k-5k', label: '$1,000 – $5,000' },
  { value: '5k-10k', label: '$5,000 – $10,000' },
  { value: '10k-25k', label: '$10,000 – $25,000' },
  { value: 'over-25k', label: '$25,000+' },
  UNSURE,
]

export const enquiryCopy = {
  websiteLabel: 'Website, if relevant',
  websitePlaceholder: 'yourbusiness.com',
  noWebsiteLabel: "I don't have one yet",
  serviceLabel: 'What needs attention?',
  packageLabel: 'Engagement, if known',
  budgetLabel: 'Budget',
  choosePlaceholder: 'Select one',
  messageLabel: 'Where is work getting stuck?',
  messagePlaceholder: 'What tools do you use, where does work get missed or repeated, and what would you like to change?',
} as const
