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

export const pricingHero = {
  eyebrow: 'Pricing',
  headlineLines: ['What a shift'],
  headlineAccent: 'costs.',
  supporting:
    'Custom CRMs, connected workflows and ongoing development start with a clear scope. Use these prices to judge fit, then tell us where work gets held up.',
  note: 'All figures in USD. Nothing here is a quote until we have seen the work.',
}

/** Sticky sub-navigation. Each `id` must match a section id on the page. */
export const pricingNav = {
  label: 'Pricing sections',
  items: [
    { id: 'web-apps', label: 'Systems' },
    { id: 'automation', label: 'AI & automation' },
    { id: 'websites', label: 'Websites' },
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
  headingLines: ['The customer-facing', 'part of your business.'],
  supporting:
    'Help customers understand your services and make an inquiry. A website can stand on its own or connect to a wider business system, with integrations scoped separately.',
  tiers: [
    {
      id: 'foundation',
      index: '01',
      name: 'Foundation',
      category: 'Essential business website',
      tagline: 'Make the first inquiry easy.',
      price: '1,000',
      startsAt: true,
      delivery: ['First working version in as little as 24 hours.'],
      description:
        'A clear website that explains your services and gives customers a straightforward way to get in touch.',
      bestFor:
        'Businesses replacing a dated, templated, DIY, or nonexistent website.',
      scope: [
        'One conversion-focused page',
        'Responsive custom presentation using Wallace Shift’s layout system',
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
      tagline: 'Explain your work with motion.',
      price: '5,000',
      startsAt: true,
      delivery: [
        'First creative direction in as little as 24 hours.',
        'Typical launch in 5–10 business days.',
      ],
      description:
        'Custom art direction and controlled motion that help customers explore your work and understand the service before making an inquiry.',
      bestFor:
        'Businesses whose work benefits from a more visual explanation and a distinctive presentation.',
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
      proof: 'This site is a Motion build.',
      barScale: 0.67,
    },
    {
      id: 'dimension',
      index: '03',
      name: 'Dimension',
      category: 'Immersive 3D experience',
      tagline: 'Show what is hard to explain.',
      price: '10,000',
      startsAt: true,
      delivery: ['Typically 3–6 weeks.'],
      description:
        'Interactive 3D experiences that let customers explore a product, space or process before taking the next step.',
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
  /**
   * Original package-detail provenance:
   * DRAFTED BY CLAUDE ON 2026-09-12 — NOT YET APPROVED.
   *
   * Editorial updates preserve the existing prices, scope, exclusions and
   * terms. They do not constitute approval of new commercial commitments.
   * Keep this flag until the package details have had commercial review.
   */
  category?: string
  tagline?: string
  bestFor?: string
  scope?: string[]
  ctaLabel?: string
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
    label: 'Custom CRMs & business systems',
    heading: 'Start with the workflow. Build from there.',
    supporting:
      'We map how your team handles customers, work and information before agreeing a build price. The focused build below covers one primary workflow; a broader CRM needs its own agreed scope.',
    items: [
      {
        index: '01',
        title: 'System definition sprint',
        description:
          'We map the people, steps, permissions, tool connections and exceptions in your process, then define the technical approach before you commit to a build.',
        price: '2,500',
        startsAt: false,
        window: '1 week',
        note: 'Applied to the project total when the build begins within 30 days.',
        category: 'Discovery and technical plan',
        tagline: 'Understand the work first.',
        bestFor:
          'Businesses that need to define what a system should do, who will use it and how it will fit the tools already in place.',
        scope: [
          'People and permissions mapped',
          'Workflow mapping',
          'Required tool connections identified',
          'Exceptions and failure points identified',
          'Technical approach defined',
          'Costed build plan',
        ],
        ctaLabel: 'Start a definition sprint',
      },
      {
        index: '02',
        title: 'Focused system build',
        description:
          'A focused customer portal, booking system, internal tool, or dashboard built around one primary business workflow.',
        price: '18,000',
        startsAt: true,
        window: '6–10 weeks',
        category: 'Custom portal, tool, or dashboard',
        tagline: 'Put one workflow in order.',
        bestFor:
          'Businesses running a core workflow on spreadsheets, email, or software that was never meant for it.',
        scope: [
          'Everything in the definition sprint',
          'One primary business workflow, built end to end',
          'Customer portal, booking system, internal tool, or dashboard',
          'Interface designed around the people who use it',
          'Responsive across desktop and mobile',
        ],
        ctaLabel: 'Discuss a system build',
        note: 'Multi-tenant SaaS, extensive user roles, legacy data migration, native mobile apps, advanced compliance such as HIPAA or PCI, complex AI systems, and large integration counts are scoped separately.',
      },
      {
        index: '03',
        title: 'Ongoing development',
        description:
          'Reserved design and development capacity to refine your system and add agreed features as the way you work changes.',
        price: '4,500',
        startsAt: true,
        priceUnit: '/month',
        window: '3-month initial term',
        note: 'Rolling monthly after the initial term, with 30 days’ notice.',
        category: 'Reserved ongoing capacity',
        tagline: 'Keep improving the system.',
        bestFor:
          'Businesses that need regular improvements and feature development as their processes evolve.',
        scope: [
          'Reserved design and development capacity',
          'Continued feature work and refinement',
          'Maintenance as the system evolves',
          'Rolling monthly after the initial term',
        ],
        ctaLabel: 'Discuss ongoing development',
      },
    ],
    note: 'Hosting, third-party subscriptions, API usage, payment-processing fees, and advanced compliance requirements are quoted separately.',
  },
  {
    id: 'automation',
    label: 'AI integrations & workflow automation',
    heading: 'Find the repeated work. Connect the steps.',
    supporting:
      'Start with repetitive admin, missed follow-up and disconnected tools. For AI integrations, we confirm the task, data access and human review needed before quoting.',
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
        category: 'Measured opportunity report',
        tagline: 'Know where to start.',
        bestFor:
          'Businesses that know work is being repeated but not what it costs or where to start.',
        scope: [
          'Repetitive work traced across systems',
          'The cost of that work calculated',
          'Failure points identified',
          'Prioritized automation plan returned',
        ],
        ctaLabel: 'Start an automation audit',
      },
      {
        index: '02',
        title: 'Workflow build',
        description:
          'One focused workflow connecting the systems, follow-up, and handoffs that currently consume time or fall through the cracks.',
        price: '2,500',
        startsAt: true,
        window: '1–3 weeks',
        category: 'One connected workflow',
        tagline: 'Connect one repeatable process.',
        bestFor:
          'Businesses losing hours to one repeatable process, or losing customers to follow-up that never happens.',
        scope: [
          'Everything in the automation audit',
          'One focused workflow, built end to end',
          'Systems, follow-up, and handoffs connected',
          'Tested against real business cases',
        ],
        ctaLabel: 'Start a workflow build',
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
        category: 'Monitoring and upkeep',
        tagline: 'Keep existing workflows working.',
        bestFor:
          'Businesses that need someone to monitor and maintain the automations they already use.',
        scope: [
          'Monitoring of running workflows',
          'Maintenance as connected systems change',
          'Failure recovery',
          'Minor adjustments to existing workflows',
        ],
        ctaLabel: 'Start managed automation',
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
      question: 'What does a starting price cover?',
      answer:
        'It covers the scope listed for that engagement. A focused system build covers one primary workflow, while a broader CRM or a more involved integration needs a separate scope. We agree requirements and the final price in writing before building. The definition sprint and automation audit are fixed-fee engagements.',
    },
    {
      question: 'Do the website timelines apply to custom systems?',
      answer:
        'No. Each engagement has its own delivery window. For the website packages, a first working version means a viewable site at a private link with structure, design and content in place. Launch still depends on your content, domain and hosting access, and approval.',
    },
    {
      question: 'What does the website launch warranty cover?',
      answer:
        'Defects in the website we built, within the warranty window listed for that package. We fix those at no cost. New features, redesign requests and ongoing content changes are separate work, quoted before we start.',
    },
    {
      question: 'How does support differ from ongoing development?',
      answer:
        'Managed automation covers monitoring, maintenance, failure recovery and minor adjustments to existing workflows. New workflows and substantial changes are scoped separately. Ongoing development reserves design and development capacity for agreed feature work and continued refinement.',
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
  headlineLines: ['Start with the work', 'that gets held up.'],
  supporting:
    'Tell us where follow-up, handoffs or admin slow your team down, and which tools you use today. We’ll help define a useful starting scope.',
  ctaLabel: 'Discuss your workflow',
  ctaHref: '/contact',
}
