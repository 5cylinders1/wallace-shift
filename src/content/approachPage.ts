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

/**
 * Stages 02 and 03 only.
 *
 * Stage 01 is not here: it is the live first-check section, which performs
 * the stage rather than describing it. Listing it again below the tool made
 * the page restart itself — the visitor ran the check, then immediately met
 * a fresh "01 Find the friction" heading.
 */
export const approachStages: ApproachStage[] = [
  {
    index: '02',
    title: 'Make the shift',
    summary:
      'Strategy, identity, experience, and technology built as one coherent system.',
    fields: [
      {
        label: 'What happens',
        body: 'Positioning and content structure come first, so the design is built around something to say. Design and build then run together as one piece of work.',
      },
      {
        label: 'What you see',
        body: 'You review a working version through a private link, with structure, design, and real content already in place.',
      },
      {
        label: 'You leave with',
        body: 'An approved design and a working build. Feedback is gathered at agreed checkpoints so decisions stay clear and the project keeps moving.',
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
      // CONFIRM: the deposit is described in pricing.ts only as "a deposit
      // to hold the schedule" — no percentage is published anywhere. A
      // figure was suggested in review but is not stated as policy, so it
      // is deliberately absent here rather than invented.
      step: 'From $1,000, then a deposit',
      note: 'Scope is agreed in writing first; the deposit holds your place in the schedule. Nothing is built before both are settled.',
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
  heading: 'The people in the meeting are the people doing the work.',
  paragraphs: [
    'Matthew has been building and maintaining production websites and web applications since 2009, across product development, performance, search, and conversion. Every engagement is senior-led from the first recommendation through to launch.',
    'Wallace Shift stays deliberately small so that stays true. Concurrent builds are limited — a constraint of the size rather than a scarcity tactic — which is what keeps the person shaping the recommendation involved when it is built.',
  ],
  /** Factual, checkable, and about depth rather than any one technology. */
  credentials: [
    'Building production web products since 2009',
    'Strategy, design, development, and optimisation',
    'Direct senior involvement through launch',
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
  /**
   * Four, not six. Payment is already covered by the paid-step section and
   * direct access by the founder section — repeating them here made the
   * page feel like it was reassuring the reader twice.
   */
  items: [
    {
      title: 'Clear scope before work begins',
      body: 'The starting price buys a complete, launched project at that level, and what it covers is written down first.',
    },
    {
      title: 'Working previews at agreed checkpoints',
      body: 'You see the real thing at a private link, at points agreed in advance.',
    },
    {
      title: 'Changes approved before they are billed',
      body: 'Anything beyond the agreed scope is priced and approved in writing before it is built.',
    },
    {
      title: 'Ownership and handoff at launch',
      body: 'The finished build and its code are yours, along with the accounts set up in your name. Third-party licences are transferred where they can be, and named where they cannot.',
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
