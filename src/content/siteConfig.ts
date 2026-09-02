export const siteMeta = {
  name: 'Wallace Shift',
  tagline: 'Design. Technology. Momentum.',
  title: 'Wallace Shift | Websites, Web Apps & Automation',
  description:
    'Wallace Shift creates distinctive websites, web apps, and automations that help growing businesses earn trust and move forward.',
}

/**
 * Business identity.
 *
 * Wallace Shift is run from a home address, so no street address appears
 * anywhere on the site and none is emitted in structured data. The studio
 * is presented as a service-area business: `serviceArea` names the region
 * served, nothing narrower.
 *
 * `email` stays `null` until that mailbox actually receives mail —
 * everywhere it renders omits the surrounding markup while it is null, so
 * the site is correct rather than advertising an address that bounces.
 */
export const business = {
  /** The published address. Live and receiving as of 2026-09-02. */
  email: 'matthew@wallaceshift.com' as string | null,

  /**
   * Where the studio works from — region only, never a street address.
   * Phrased to read correctly mid-sentence and at the start of one, and
   * every place it renders pairs it with remote work: the studio is not
   * restricted to this area, it is simply where it is run from.
   */
  serviceArea: 'Greater Kansas City' as string | null,

  /** Shown beside the contact form so enquiries carry an expectation. */
  responseTime: 'within one business day',
}

export const hero = {
  eyebrow: 'Websites · Web apps · Automation',
  headlineLines: ['Shift how', 'your business', 'is'],
  headlineAccent: 'seen.',
  supporting:
    'Strategy, design, and motion for businesses shifting to their new era.',
  primaryCta: { label: 'Start your shift', href: '/contact' },
  secondaryCta: { label: 'Explore our services', href: '/services' },
}

export const brandStatement = {
  body: 'Your business may already do exceptional work. We align how it looks, works, and communicates so customers recognize that value immediately.',
}

export const services = {
  headingLines: ['Built to move your', 'business forward.'],
  /* The two questions a reader has after "what can I hire you to build?" —
     each gets its own exit rather than a pair of trailing text links. */
  detailLink: {
    eyebrow: 'The detail',
    label: 'What each of these involves',
    href: '/services',
  },
  pricingLink: {
    eyebrow: 'The numbers',
    label: 'See what each of these costs',
    href: '/pricing',
  },
  items: [
    {
      index: '01',
      label: 'Presence',
      title: 'Websites that earn trust',
      description:
        'Positioning, copy, design, and development built to create the right first impression and turn attention into action.',
      outcomeWord: 'TRUST',
    },
    {
      index: '02',
      label: 'Experience',
      title: 'Web apps that remove friction',
      description:
        'Portals, internal tools, and customer experiences that make complex work feel simple.',
      outcomeWord: 'FLOW',
    },
    {
      index: '03',
      label: 'Operations',
      title: 'Automation that gives time back',
      description:
        'Connected workflows that remove repetitive work, prevent missed follow-up, and keep the business moving.',
      outcomeWord: 'TIME',
    },
  ],
} as const

export type ServiceItem = (typeof services.items)[number]

/** Opening block for the /approach page, above the process section. */
export const approachPageHero = {
  eyebrow: 'Approach',
  headlineLines: ['How the work', 'actually'],
  headlineAccent: 'runs.',
  supporting:
    'Three stages, in the same order every time. No mystery phase where nothing visible happens, and no invoice that arrives before you have seen anything.',
}

export const approach = {
  headingLines: ['A clear shift, from', 'first idea to launch.'],
  steps: [
    {
      index: '01',
      title: 'Find the friction',
      description:
        'Understand what customers need, where trust is being lost, and what is slowing the business down.',
    },
    {
      index: '02',
      title: 'Build the shift',
      description:
        'Create the strategy, identity, experience, and technology as one coherent system.',
    },
    {
      index: '03',
      title: 'Launch with momentum',
      description:
        'Refine, test, launch, and leave the business with a platform built to keep working.',
    },
  ],
} as const

export type ProcessStep = (typeof approach.steps)[number]

export const standards = {
  eyebrow: 'The Wallace Shift Standard',
  headline: 'Ambition, with restraint.',
  principles: [
    {
      number: '01',
      title: 'Distinctive, never confusing.',
      description: 'Bold enough to be remembered, clear enough to navigate and trust.',
    },
    {
      number: '02',
      title: 'Fast, never rushed.',
      description: 'Performance is engineered from the start, then every detail is refined to feel effortless.',
    },
    {
      number: '03',
      title: 'Technology with a job to do.',
      description: 'Automation and tooling are added only when they remove friction and create real value.',
    },
  ],
} as const

export type StandardPrincipleItem = (typeof standards.principles)[number]

export const contactCta = {
  headlineLines: ['Ready to stop', 'being overlooked?'],
  supporting: 'Tell us what is not working. We will show you what can shift.',
  primaryCtaLabel: 'Start a project',
}

export const footer = {
  tagline: 'Design. Technology. Momentum.',
}
