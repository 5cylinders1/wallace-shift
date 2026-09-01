export const siteMeta = {
  name: 'Wallace Shift',
  tagline: 'Design. Technology. Momentum.',
  title: 'Wallace Shift | Websites, Web Apps & Automation',
  description:
    'Wallace Shift creates distinctive websites, web apps, and automations that help growing businesses earn trust and move forward.',
}

// Root-relative hrefs (rather than bare hashes) so the same list works
// from any route: PageLink routes to the homepage first when needed, then
// scrolls to the anchor.
export const navLinks = [
  { label: 'Services', href: '/#services' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Approach', href: '/#approach' },
  { label: 'About', href: '/#about' },
] as const

export const hero = {
  eyebrow: 'Websites · Web apps · Automation',
  headlineLines: ['Shift how', 'your business', 'is'],
  headlineAccent: 'seen.',
  supporting:
    'Strategy, design, and motion for businesses shifting to their new era.',
  primaryCta: { label: 'Start your shift', href: '#contact' },
  secondaryCta: { label: 'Explore our services', href: '#services' },
}

export const brandStatement = {
  body: 'Your business may already do exceptional work. We align how it looks, works, and communicates so customers recognize that value immediately.',
}

export const services = {
  headingLines: ['Built to move your', 'business forward.'],
  pricingLink: { label: 'See what each of these costs', href: '/pricing' },
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
