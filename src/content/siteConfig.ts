export const siteMeta = {
  name: 'Wallace Shift',
  tagline: 'Software. Workflows. Progress.',
  title: 'Wallace Shift | Custom CRMs, AI & Automation',
  description:
    'Custom CRM systems, practical AI integrations, and workflow automation built around your business. Connect enquiries, follow-up, and daily operations.',
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

  /** Bella handles sales and new project enquiries. */
  salesEmail: 'bella@wallaceshift.com' as string | null,

  /**
   * Where the studio works from — region only, never a street address.
   * Phrased to read correctly mid-sentence and at the start of one, and
   * every place it renders pairs it with remote work: the studio is not
   * restricted to this area, it is simply where it is run from.
   */
  serviceArea: 'Greater Kansas City' as string | null,

  /** Shown beside the contact form so enquiries carry an expectation. */
  responseTime: 'within one business day',

  /**
   * Real scheduling link. Provider-agnostic — any public booking URL
   * works, including a Google Calendar appointment schedule, Cal.com, or
   * Calendly. While this is null the
   * "Book a free fit call" CTA points at /contact, where a form starts the
   * conversation instead — set it and every such CTA switches to real
   * booking with no other change.
   */
  bookingUrl: null as string | null,
}

export const hero = {
  eyebrow: 'Custom CRMs · AI integrations',
  headlineLines: ['Software for', 'the way', 'you'],
  headlineAccent: 'work.',
  supporting:
    'Capture enquiries, keep follow-up moving, and connect daily operations with custom software and practical automation.',
  primaryCta: { label: 'Discuss your system', href: '/contact' },
  secondaryCta: { label: 'Explore our services', href: '/services' },
}

export const brandStatement = {
  body: 'When customer details, follow-up, and job updates live in different places, work gets missed. We build systems that bring the next action and the current picture together.',
}

export const services = {
  headingLines: ['Connect the work.', 'See what’s next.'],
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
      label: 'Systems',
      enquiryValue: 'experience',
      title: 'Custom CRMs built around your work',
      description:
        'Bring enquiries, customer records, follow-up, and work in progress into a system your team can use and your business can grow with.',
      outcomeWord: 'FLOW',
    },
    {
      index: '02',
      label: 'AI & automation',
      enquiryValue: 'operations',
      title: 'AI and workflows with a clear job',
      description:
        'Connect tools to reduce re-entry and missed handoffs. Add AI to a defined task, with a clear way for people to review its output.',
      outcomeWord: 'TIME',
    },
    {
      index: '03',
      label: 'Websites',
      enquiryValue: 'presence',
      title: 'Websites connected to your business',
      description:
        'Give customers a clear place to understand your work and get in touch. Plan how each enquiry reaches the people and systems handling it.',
      outcomeWord: 'TRUST',
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
    'We start with how work happens today, agree what the system needs to do, then build and test it with you. Support and further improvements have a clear scope from the start.',
}

export const approach = {
  headingLines: ['Understand. Build.', 'Keep improving.'],
  steps: [
    {
      index: '01',
      title: 'Find the gaps',
      description:
        'Trace an enquiry through your team and tools. Find missed follow-up, repeated work, and information that owners cannot easily see.',
    },
    {
      index: '02',
      title: 'Build around the work',
      description:
        'Agree the workflow, connect the right tools, and test the system with the people who will use it.',
    },
    {
      index: '03',
      title: 'Support the next step',
      description:
        'Launch with documentation and a support plan. Scope new workflows and larger improvements as your needs change.',
    },
  ],
} as const

export type ProcessStep = (typeof approach.steps)[number]

export const standards = {
  eyebrow: 'The Wallace Shift Standard',
  headline: 'Useful in the daily work.',
  principles: [
    {
      number: '01',
      title: 'Built around the people using it.',
      description: 'Clear records, responsibilities, and next steps for the team doing the work.',
    },
    {
      number: '02',
      title: 'A scope you can understand.',
      description: 'Know what is included, what depends on other tools, and what happens after launch.',
    },
    {
      number: '03',
      title: 'Technology that earns its place.',
      description: 'We add tools and automation only when they remove friction or create real value.',
    },
  ],
} as const

export type StandardPrincipleItem = (typeof standards.principles)[number]

export const contactCta = {
  headlineLines: ['Where is work', 'getting stuck?'],
  supporting: 'Tell us about the tools you use, the handoffs that fail, and what your team needs to see.',
  primaryCtaLabel: 'Send project details',
  /** Real alternatives for a reader who does not want to fill in a form.
   *  Both destinations already exist, and nothing here promises a response
   *  time or anything else that is not already true. The email link is
   *  rendered only while `business.salesEmail` is set. */
  alternatives: {
    eyebrow: 'Rather not fill in a form?',
    emailLead: 'Email Bella in sales:',
    pricingLabel: 'See what this costs',
    pricingHref: '/pricing',
  },
}

export const footer = {
  tagline: 'Software. Workflows. Progress.',
  // Google's official deeplink and dark English badge keep the same button
  // available in the React site and the script-free blog. Always target the
  // published domain, including when a reader is viewing a local preview.
  // https://developers.google.com/search/docs/appearance/preferred-sources
  preferredSource: {
    href: 'https://www.google.com/preferences/source?q=wallaceshift.com',
    badge: '/brand/google-preferred-source-dark-en.png',
    label: 'Add Wallace Shift as a preferred source on Google (opens in a new tab)',
  },
}
