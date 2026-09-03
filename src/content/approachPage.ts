/**
 * `/approach` content.
 *
 * Structure follows the reviewed order: compact hero, assurance strip,
 * three stages with tangible outputs, service-specific starting paths,
 * founder credibility, what to expect, standards, transition, one CTA.
 *
 * SOURCING RULE — every figure and commitment here must already exist in
 * an approved source (`pricing.ts`, `about.ts`, `siteConfig.ts`) or have
 * been supplied directly by the client. Nothing describes a timeline,
 * guarantee, or deliverable invented to fill a slot. Three lines below are
 * marked CONFIRM: they were supplied in review and are stated as fact, but
 * they are commercial commitments the site had not made before.
 */

export interface StageField {
  label: string
  body: string
}

export interface ApproachStage {
  index: string
  title: string
  summary: string
  fields: [StageField, StageField, StageField]
}

/** Short assurances, directly under the hero. Each is verifiable on the
 *  site itself rather than a claim about outcomes. */
export const approachAssurances = [
  {
    title: 'Two people, no handoffs',
    body: 'The person you talk to and the person who builds it are the only two involved.',
  },
  {
    title: 'Prices published',
    body: 'Every starting figure is on the pricing page before you speak to anyone.',
  },
  {
    title: 'Nothing built before it is agreed',
    body: 'Scope is written down and approved before work starts, and again if it changes.',
  },
] as const

export const approachStages: ApproachStage[] = [
  {
    index: '01',
    title: 'Find the friction',
    summary:
      'What customers need, where trust is being lost, and what is slowing the business down.',
    fields: [
      {
        label: 'What happens',
        body: 'A conversation about what is not working. We ask what you sell, who hesitates, and where the current setup gets in the way. It is not a sales call and it costs nothing.',
      },
      {
        label: 'What you see',
        body: 'The problem written back to you in plain language, with the realistic options and what each one would take.',
      },
      {
        label: 'You leave with',
        body: 'A written recommendation and an agreed next step — even if that step is smaller than a rebuild, or nothing at all.',
      },
    ],
  },
  {
    index: '02',
    title: 'Make the shift',
    summary:
      'Strategy, identity, experience, and technology built as one coherent system.',
    fields: [
      {
        label: 'What happens',
        body: 'Positioning and content structure come first, so the design is built around something to say. Then design and build run together, not as separate handovers.',
      },
      {
        label: 'What you see',
        body: 'A real, viewable version at a private link — structure, design, and your content in place. Not a mockup, and not a slide deck.',
      },
      {
        label: 'You leave with',
        body: 'An approved design and a working build, with feedback consolidated into agreed revision rounds rather than drip-fed one note at a time.',
      },
    ],
  },
  {
    index: '03',
    title: 'Launch with momentum',
    summary:
      'Refined, tested, launched, and handed over as a platform built to keep working.',
    fields: [
      {
        label: 'What happens',
        body: 'Accessibility and performance review, foundational SEO, and analytics are done before launch rather than bolted on after it.',
      },
      {
        label: 'What you see',
        body: 'The pre-launch checks, then the site live on your own domain and your own accounts.',
      },
      {
        label: 'You leave with',
        body: 'Ownership and a full handover, plus a launch warranty: if something we built is broken or fails on a device it should support, we fix it inside the window at no cost.',
      },
    ],
  },
]

/**
 * Where each service actually becomes paid. Figures must match
 * `pricing.ts` exactly — the definition sprint and the automation audit
 * are both fixed-fee there, not "starts at".
 */
export const servicePaths = {
  eyebrow: 'Where it becomes paid',
  heading: 'The first paid step, by service.',
  supporting:
    'The first conversation is free in every case. This is the point after it where money changes hands.',
  items: [
    {
      service: 'Website',
      step: 'Approved scope and deposit',
      note: 'The deposit holds the schedule. Nothing is built before the scope is agreed in writing.',
      href: '/pricing',
    },
    {
      service: 'Web app',
      step: '$2,500 definition sprint',
      note: 'One week. Users, workflows, roles, integrations, and edge cases mapped before anyone commits to a build price. Applied to the project total if the build begins within 30 days.',
      href: '/pricing',
    },
    {
      service: 'Automation',
      step: '$1,000 automation audit',
      note: 'Three to five business days. The repetitive work traced and costed, with a prioritized plan. Credited toward qualifying builds of $5,000 or more.',
      href: '/pricing',
    },
  ],
} as const

/**
 * Founder credibility, in place of testimonials the studio does not yet
 * have. No client names, no metrics, no invented results.
 *
 * The 2009 start date and the first-project detail were supplied by
 * Matthew directly. Stating the year rather than a duration keeps the line
 * accurate as time passes and reads as more specific than "X years".
 */
export const approachProof = {
  eyebrow: 'Why trust the build',
  heading: 'The person in the meeting is the person writing the code.',
  paragraphs: [
    'Wallace Shift is deliberately small. Matthew has been building production websites and applications since 2009 — the first was a Groupon-style marketplace, written in PHP from scratch — and every project the studio ships is designed and built by him. No subcontractors, no offshore build teams, and no template resold as custom work.',
    'That is also why concurrent builds are limited. It is a constraint of the size rather than a scarcity tactic, and it is what keeps the person in the meeting the same person doing the work.',
  ],
  /** Verifiable without leaving the page. */
  proofNote: 'This site is a Motion build — the same tier, the same process.',
  proofHref: '/pricing',
} as const

/** Renamed from "The terms": buyer benefits first, obligations second. */
export const approachExpectations = {
  eyebrow: 'What you can expect',
  heading: 'The parts people are least comfortable asking about.',
  supporting: 'Stated before you have to ask.',
  items: [
    {
      title: 'Clear scope before work begins',
      body: 'The starting price buys a complete, launched project at that level. What it covers is written down first.',
    },
    {
      title: 'Working previews at agreed checkpoints',
      body: 'You see the real thing at a private link, not a status report describing it.',
    },
    {
      title: 'Scope changes approved in writing',
      body: 'Anything beyond the agreed scope is priced and approved before it is built. No surprise line items.',
    },
    {
      title: 'Payment split across the project',
      body: 'A deposit to hold the schedule, a payment at design approval, and the balance before launch. Care plans are billed monthly.',
    },
    {
      // Deliberately scoped. The original wording ("accounts, assets, and
      // code") would have promised ownership of licensed fonts and stock,
      // which is not the studio's to give — a licence is transferred or
      // named, not owned.
      title: 'You own what we build',
      body: 'The finished build and its code are yours at handover, along with the accounts set up in your name. Third-party licences are transferred where they can be, and named where they cannot.',
    },
    {
      title: 'Direct access to the person doing the work',
      body: 'We limit concurrent builds so the person in the meeting remains the person building it.',
    },
  ],
} as const

export const approachCta = {
  headlineLines: ['Have something', 'you want to'],
  headlineAccent: 'improve?',
  supporting:
    'Tell us what is not working. We will give you an honest recommendation and explain the clearest next step — even if it is smaller than a full rebuild.',
  primaryLabel: 'Book a free fit call',
  secondaryLabel: 'See starting prices',
  secondaryHref: '/pricing',
} as const
