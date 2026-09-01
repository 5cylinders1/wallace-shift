/**
 * Every price, scope line, and timeline on the pricing page lives here so
 * figures can be changed without touching layout, and so no number is ever
 * duplicated into markup.
 *
 * Two rules the components rely on:
 *  - `startsAt: true` means the figure is a floor and renders with a
 *    "Starts at" label. Fixed-fee work (the definition sprint, the
 *    automation audit) sets it false and shows the number alone.
 *  - Anything the starting price does not cover belongs in a `note`, not
 *    in the scope list. The lists are promises; the notes are the limits.
 */

export const pricingMeta = {
  title: 'Pricing | Wallace Shift',
  description:
    'Wallace Shift pricing for websites, web apps, and automation. Three website levels starting at $1,000, plus product definition and workflow engagements.',
}

export const pricingHero = {
  eyebrow: 'Pricing',
  headlineLines: ['What a shift'],
  headlineAccent: 'costs.',
  supporting:
    'The price changes with the complexity — not the quality. Published so you can judge fit before spending an hour on a call.',
  note: 'All figures in USD. Nothing here is a quote until we have seen the work.',
}

/** Sticky sub-navigation. Each `id` must match a section id on the page. */
export const pricingNav = {
  label: 'Pricing sections',
  items: [
    { id: 'websites', label: 'Websites' },
    { id: 'web-apps', label: 'Web Apps' },
    { id: 'automation', label: 'Automation' },
  ],
} as const

export type PricingNavItem = (typeof pricingNav.items)[number]

export interface SiteTier {
  id: string
  index: string
  name: string
  /** Plain-English category, for visitors who do not read tier names. */
  category: string
  tagline: string
  price: string
  startsAt: boolean
  /** One or more delivery expectations, shown directly under the price. */
  delivery: string[]
  description: string
  bestFor: string
  scope: string[]
  scopeNote?: string
  ctaLabel: string
  /** Marks the recommended column. Carried by a text label as well as the
   *  wash, so the recommendation is never colour-only. */
  badge?: string
  /** A claim the visitor can verify without leaving the page. */
  proof?: string
  /** Relative rule length in the hero's price index only. */
  barScale: number
}

export const siteTiers: {
  eyebrow: string
  headingLines: string[]
  supporting: string
  tiers: SiteTier[]
} = {
  eyebrow: 'Websites',
  headingLines: ['Three levels of', 'the same standard.'],
  supporting:
    'Every Wallace Shift site is designed, written, and built with the same care. Pricing changes with the complexity—not the quality.',
  tiers: [
    {
      id: 'foundation',
      index: '01',
      name: 'Foundation',
      category: 'Essential business website',
      tagline: 'The essential shift.',
      price: '1,000',
      startsAt: true,
      delivery: ['First working version in as little as 24 hours.'],
      description:
        'A clear, polished website for businesses that need to look credible, explain what they do, and make it easy for customers to respond.',
      bestFor:
        'Businesses replacing a dated, templated, DIY, or nonexistent website.',
      scope: [
        'One conversion-focused page',
        'Responsive custom presentation using Wallace Shift’s proven layout system',
        'Content structure and light copy refinement',
        'Enquiry form and clear conversion path',
        'One consolidated revision round',
        '14-day launch warranty',
      ],
      scopeNote:
        'Additional pages, ecommerce, booking, advanced copywriting, and integrations are scoped separately.',
      ctaLabel: 'Start a Foundation project',
      barScale: 0.34,
    },
    {
      id: 'motion',
      index: '02',
      name: 'Motion',
      category: 'Signature animated website',
      tagline: 'The signature shift.',
      price: '5,000',
      startsAt: true,
      delivery: [
        'First creative direction in as little as 24 hours.',
        'Typical launch in 5–10 business days.',
      ],
      description:
        'Custom art direction and controlled motion for businesses that need their website to be part of what makes them memorable.',
      bestFor:
        'Businesses in a crowded market that need to become the one customers remember.',
      scope: [
        'Everything in Foundation',
        'Up to approximately five pages at the starting scope',
        'Custom visual direction',
        'One signature motion experience',
        'Scroll-controlled or pointer-controlled interaction where appropriate',
        'Content management where appropriate',
        'Reduced-motion and keyboard-accessible alternatives',
        'Two consolidated revision rounds',
        '30-day launch warranty',
      ],
      ctaLabel: 'Start a Motion project',
      badge: 'Most chosen',
      proof: 'This site is a Motion build.',
      barScale: 0.67,
    },
    {
      id: 'dimension',
      index: '03',
      name: 'Dimension',
      category: 'Immersive 3D experience',
      tagline: 'The immersive shift.',
      price: '10,000',
      startsAt: true,
      delivery: ['Typically 3–6 weeks.'],
      description:
        'Interactive 3D experiences for products, spaces, and processes that become more convincing when customers can explore them.',
      bestFor:
        'Businesses selling something physical, spatial, or complex enough to be worth exploring.',
      scope: [
        'Everything in Motion',
        'One focused real-time 3D scene',
        'Interactive product, space, or process presentation',
        'Preparation and optimization of a suitable client-provided model',
        'Custom lighting and material treatment',
        'Device-tiered performance',
        'Accessible 2D fallback',
        '30-day launch warranty',
      ],
      scopeNote:
        'Custom modeling, configurators, complex product logic, and multi-scene experiences are scoped separately.',
      ctaLabel: 'Start a Dimension project',
      barScale: 1,
    },
  ],
}

/** The floor under all three levels, stated once instead of three times. */
export const websiteStandard = {
  eyebrow: 'Every website includes',
  items: [
    'Strategy and content structure',
    'Responsive design',
    'Foundational SEO and analytics',
    'Accessibility and performance review',
    'Launch support',
  ],
} as const

export const websiteCare = {
  eyebrow: 'Optional',
  title: 'Website Care',
  price: '149',
  priceUnit: '/month',
  startsAt: true,
  description:
    'Hosting, monitoring, backups, technical updates, and dependable help after launch.',
  notes: [
    'New pages, redesigns, and substantial feature work are quoted separately.',
    'Entirely optional, and never folded into a project price.',
  ],
  ctaLabel: 'Ask about Website Care',
} as const

export interface EngagementItem {
  index: string
  title: string
  description: string
  price: string
  startsAt: boolean
  priceUnit?: string
  window: string
  note?: string
}

export interface EngagementGroup {
  id: string
  label: string
  heading: string
  supporting: string
  items: EngagementItem[]
  /** Costs that sit outside every row in the group. */
  note: string
}

export const engagementGroups: EngagementGroup[] = [
  {
    id: 'web-apps',
    label: 'Web apps',
    heading: 'Priced around the problem—not the page count.',
    supporting:
      'Every app begins with definition. We map the users, workflows, integrations, and edge cases before committing to a build price.',
    items: [
      {
        index: '01',
        title: 'Product definition sprint',
        description:
          'We map the users, workflows, roles, integrations, edge cases, and technical approach before anyone commits to a full build.',
        price: '2,500',
        startsAt: false,
        window: '1 week',
        note: 'Applied to the project total when the build begins within 30 days.',
      },
      {
        index: '02',
        title: 'Focused web app',
        description:
          'A focused customer portal, booking system, internal tool, or dashboard built around one primary business workflow.',
        price: '18,000',
        startsAt: true,
        window: '6–10 weeks',
        note: 'Multi-tenant SaaS, extensive user roles, legacy data migration, native mobile apps, advanced compliance such as HIPAA or PCI, complex AI systems, and large integration counts are scoped separately.',
      },
      {
        index: '03',
        title: 'Ongoing product partnership',
        description:
          'Reserved design and development capacity for a product that continues to evolve.',
        price: '4,500',
        startsAt: true,
        priceUnit: '/month',
        window: '3-month initial term',
        note: 'Rolling monthly after the initial term, with 30 days’ notice.',
      },
    ],
    note: 'Hosting, third-party subscriptions, API usage, payment-processing fees, and advanced compliance requirements are quoted separately.',
  },
  {
    id: 'automation',
    label: 'Automation',
    heading: 'Priced against the hours it gives back.',
    supporting:
      'We start by measuring the repetitive work and the cost it creates. If the savings do not justify a build, we will say so—and the map is still yours.',
    items: [
      {
        index: '01',
        title: 'Automation audit',
        description:
          'We trace the repetitive work, calculate its cost, identify failure points, and return a prioritized automation plan.',
        price: '1,000',
        startsAt: false,
        window: '3–5 business days',
        note: 'Credited toward qualifying automation builds of $5,000 or more.',
      },
      {
        index: '02',
        title: 'Workflow build',
        description:
          'One focused workflow connecting the systems, follow-up, and handoffs that currently consume time or fall through the cracks.',
        price: '2,500',
        startsAt: true,
        window: '1–3 weeks',
        note: 'Multi-system, business-critical, and custom-coded workflows are scoped separately.',
      },
      {
        index: '03',
        title: 'Managed automation',
        description:
          'Monitoring, maintenance, failure recovery, and minor adjustments for the workflows already running your business.',
        price: '750',
        startsAt: true,
        priceUnit: '/month',
        window: 'Rolling',
        note: 'New workflows and substantial changes are scoped separately.',
      },
    ],
    note: 'Automation platform subscriptions, API usage, and third-party service costs are billed separately.',
  },
]

export const pricingFaq = {
  eyebrow: 'How this works',
  heading: 'The questions worth asking first.',
  items: [
    {
      question: 'Why does everything say "Starts at"?',
      answer:
        'A one-page site for a single service and a ten-page site for six locations are not the same job. The starting price is a genuine floor rather than bait — it buys a complete, launched site at that level. Anything beyond it is scope we agree on together, in writing, before it is built.',
    },
    {
      question: 'What does "a first working version in 24 hours" mean?',
      answer:
        'A real, viewable site at a private link — structure, design, and your content in place — not a mockup. It is the start of the conversation, not the launch. Going live still depends on your content, your domain and hosting access, and your approval.',
    },
    {
      question: 'What does the launch warranty cover?',
      answer:
        'Defects. If something we built is broken, behaves incorrectly, or breaks on a device it should support, we fix it inside the warranty window at no cost. New features, redesign requests, and ongoing content changes are separate work, quoted before we start.',
    },
    {
      question: 'Can I start at one level and move up later?',
      answer:
        'Yes. Every level is built on the same foundations, so adding pages, motion, or a 3D section afterwards is an extension of what exists rather than a rebuild.',
    },
    {
      question: 'How does payment work?',
      answer:
        'Split across the project: a deposit to hold the schedule, a payment at design approval, and the balance before launch. Care plans and retainers are billed monthly.',
    },
  ],
} as const

export type FaqItem = (typeof pricingFaq.items)[number]

export const pricingCta = {
  headlineLines: ['Not sure which', 'level fits?'],
  supporting:
    'Tell us what is not working and what you are working with. We will tell you which level makes sense — or that you do not need us yet.',
  ctaLabel: 'Start a project',
  ctaHref: '/#contact',
}
