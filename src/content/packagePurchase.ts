/**
 * Self-service purchase terms for the two homepage packages.
 * Commercial terms come from Matthew (2026-11-18). Scope and exclusions reuse the approved offer copy in
 * contractorOffers.ts. Changing anything here changes what new buyers sign, so bump the version as well.
 */
export const PACKAGE_TERMS_VERSION = '2026-11-19.1'

export type PurchasePackageId = 'website' | 'lead'

type PackagePurchase = {
  id: PurchasePackageId
  name: string
  accent: string
  /** Each invoice amount in cents. */
  amount: number
  cadence: 'monthly' | 'once'
  todayLabel: string
  thenLabel: string
  /** Card summaries, not signed text: how the price is paid, what is included, and three short
   *  "Good to know" rows. Keep them true to `terms` and the agreement; they don't need a version bump. */
  schedule: string
  included: string[]
  goodToKnow: { label: 'Cancelling' | 'Ownership' | 'Extra costs'; text: string }[]
  /** Plain-language summary shown before buying. The agreement carries the binding text. */
  terms: string[]
  scope: string
  exclusions: string
  delivery: string
}

export const packagePurchases: Record<PurchasePackageId, PackagePurchase> = {
  website: {
    id: 'website', name: 'Business website', accent: '& care',
    amount: 25000, cadence: 'monthly',
    todayLabel: '$250 today', thenLabel: 'then $250 each month, cancel any time',
    schedule: 'First $250 when you sign, then on that date each month.',
    included: [
      'Up to 8 pages for your business',
      'An inquiry form routed to you',
      'Hosting, maintenance and basic on page SEO',
      'Up to 2 hours of small edits a month',
    ],
    goodToKnow: [
      { label: 'Cancelling', text: 'Cancel in the first 30 days and your first payment is refunded. After that, service runs to the end of that billing month, then the site comes down unless you restart.' },
      { label: 'Ownership', text: 'Yours after 12 monthly payments. Until then it belongs to Wallace Shift.' },
      { label: 'Extra costs', text: 'Domain registration and paid services, confirmed before you commit.' },
    ],
    terms: [
      'Your first $250 is charged when you sign and save a card, then $250 each month on the same date.',
      'Cancel within the first 30 days and that first payment is refunded.',
      'After 30 days, cancelling takes effect at the end of that month. Your site stays online until then and comes down when the month ends, unless you restart service.',
      'The website belongs to Wallace Shift until 12 monthly payments are made. After that it is yours.',
    ],
    scope: [
      'A business website of up to 8 pages presenting Client\'s services, service area and work on phones and computers. The page list and content are agreed with Client before the build.',
      'A working inquiry form and contact details, with inquiries routed to the destination Client agrees.',
      'Hosting, technical upkeep and support for the website.',
      'Basic on page SEO: page titles, descriptions, headings and indexable service information. No search ranking is promised.',
      'Up to two hours a month of small content edits, such as text, photo and contact detail changes. Larger changes are quoted before work begins.',
    ].join('\n'),
    exclusions: 'Paid ads, ongoing SEO campaigns, ecommerce, custom CRMs, advanced interactive tools and automated follow up are separate services. Domain registration and any paid third-party services are not included and are confirmed with Client before they are used.',
    delivery: 'Work begins after the agreement is signed and the first payment is made. Client provides the content, access and decisions the build needs; timing depends on them. The website is complete when the agreed pages are live and Client has reviewed them.',
  },
  lead: {
    id: 'lead', name: 'Lead page', accent: '& automatic follow up',
    amount: 75000, cadence: 'once',
    todayLabel: '$750 today', thenLabel: 'then $750 when your page goes live',
    schedule: '$750 when you sign, $750 when it goes live.',
    included: [
      'One focused page for one service or offer',
      'Inquiry capture, routed to your inbox or tool',
      'One agreed automatic follow up workflow',
      'Testing and a handoff',
    ],
    // Cancelling summarises section 5 and Ownership section 4 of the lead page agreement; Matthew approved both on 2026-11-19.
    goodToKnow: [
      { label: 'Cancelling', text: 'End it in writing. We refund anything you’ve paid beyond completed work and approved costs.' },
      { label: 'Ownership', text: 'Yours once both payments are made.' },
      { label: 'Extra costs', text: 'Hosting, software and message usage, confirmed before work begins. Advertising is separate.' },
    ],
    terms: [
      'The $1,500 is paid in two halves: $750 when you sign, and $750 when the page and workflow go live.',
      'Hosting, software and any email or text message usage are separate where needed. We confirm them with you before work begins.',
      'You can end the work in writing. We refund anything you have paid beyond completed work and approved costs.',
      'Once both payments are made, the delivered page and workflow are yours.',
    ],
    scope: [
      'One focused lead page built around Client\'s service, offer and next step. It can work alongside Client\'s existing website.',
      'Inquiry capture: a form that collects the agreed project details and routes each inquiry to the inbox or compatible tool Client uses.',
      'One automatic follow up workflow with a confirmation, follow up messages and a next step. The channel, timing and stop conditions are agreed with Client before setup.',
      'Testing of the page, inquiry delivery and workflow, then a handoff showing Client how it works and where to manage it.',
    ].join('\n'),
    exclusions: 'Ad spend and campaign management are not included. Hosting, software subscriptions and email or SMS usage are separate where needed and are confirmed with Client before work begins. Custom CRM builds, complex integrations and ongoing management are quoted separately. Automated texts to US customers from a local 10 digit number require A2P 10DLC registration before sending; approval can take several business days and may delay an SMS launch.',
    delivery: 'Work begins after the agreement is signed and the first $750 is paid. Client provides the offer details, access to the tools to be connected and timely decisions; timing depends on them. The work is complete when the page and workflow are live, tested and handed off.',
  },
}

export const packageTotal = (id: PurchasePackageId) => id === 'lead' ? packagePurchases.lead.amount * 2 : packagePurchases.website.amount
