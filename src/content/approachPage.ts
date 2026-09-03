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
    // NOT "no handoffs". Bella is sales and routes technical detail to
    // Matthew, so a handoff is exactly what happens — claiming otherwise
    // oversells her remit and sends prospects to her with questions she
    // cannot answer, at the first-contact moment this page exists to
    // protect. The honest version is who does what.
    title: 'One engineer, every project',
    body: 'Bella is who you speak to first. Matthew designs and builds every project himself.',
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
      // The 50% figure is Matthew's own policy, confirmed 2026-09-03. It
      // was deliberately absent until then because pricing.ts publishes
      // only "a deposit to hold the schedule" with no percentage.
      step: 'From $1,000, then 50%',
      note: 'Scope is agreed in writing first. The 50% deposit follows that approval and holds your place in the schedule — nothing is built before both are settled.',
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
  // The old heading — "the people in the meeting are the people doing the
  // work" — promised a plural the copy never delivered, and blurred who
  // does what. Naming both, with real remits, answers the question the
  // heading was gesturing at.
  heading: 'You will only ever deal with two people.',
  people: [
    {
      name: 'Bella Wallace',
      role: 'Sales and first contact',
      // Must never imply she scopes or answers technical questions.
      body: 'The first person you speak to. She handles enquiries and keeps things moving; anything technical goes straight to Matthew rather than through her.',
    },
    {
      name: 'Matthew Wallace',
      role: 'Engineer',
      body: 'Designs and builds every project himself, and has been building production websites and web applications since 2009 — across product development, performance, search, and conversion.',
    },
  ],
  paragraphs: [
    'That is the whole company. Every engagement is senior-led from the first recommendation through to launch, because there is nobody else for it to be passed to.',
    'We limit concurrent projects so every engagement receives direct senior involvement through launch.',
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

export const approachCta = {
  headlineLines: ['Have something', 'you want to'],
  headlineAccent: 'improve?',
  supporting:
    'Tell us what is not working. We will give you an honest recommendation and explain the clearest next step — even if it is smaller than a full rebuild.',
  primaryLabel: 'Book a free fit call',
  secondaryLabel: 'See starting prices',
  secondaryHref: '/pricing',
} as const
