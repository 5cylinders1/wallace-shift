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
 * Workbench artifacts — the sticky panel beside each stage.
 *
 * NON-FABRICATION RULE, restated because this is the easiest place on the
 * site to break it. Nothing here may depict work we have not done. There
 * is no mocked client dashboard, no invented redesign of the visitor's
 * site, and no screenshot of a project that is not live.
 *
 * Stage 02's artifact is therefore not a picture of responsive design — it
 * is a real layout built from this site's own tokens and its real
 * navigation labels, reflowing at a real breakpoint. It demonstrates the
 * behaviour rather than illustrating it, and the visitor can verify it by
 * resizing the window they are already looking at.
 *
 * Stage 03's checks are the ones named in stage 03's own copy. They are
 * process steps we actually run, not a progress bar with invented state.
 */
export const workbench = {
  structure: {
    label: 'Layout, at two widths',
    caption:
      'Real layout using this site’s own type and spacing, reflowing at the same breakpoint the page you are reading uses. Not a picture of responsive design — the behaviour itself.',
    /** Mirrors stage 02's "what happens": structure precedes decoration. */
    blocks: [
      { role: 'Navigation', span: 'full' },
      { role: 'What you do', span: 'wide' },
      { role: 'Proof', span: 'half' },
      { role: 'Offer', span: 'half' },
      { role: 'Next step', span: 'full' },
    ],
  },
  launch: {
    label: 'Before it goes live',
    caption:
      'The checks named in this stage, run in order. Ownership transfers on the last one.',
    /** Every item appears verbatim in stage 03's fields above. */
    checks: [
      'Accessibility review',
      'Performance review',
      'Foundational SEO',
      'Analytics in place',
      'Your domain, your accounts',
      'Ownership and full handover',
    ],
  },
} as const

/**
 * Founder credibility, in place of testimonials the studio does not yet
 * have. No client names, no metrics, no invented results.
 *
 * The 2009 start date and the first-project detail were supplied by
 * Matthew directly. Stating the year rather than a duration keeps the line
 * accurate as time passes and reads as more specific than "X years".
 */
/**
 * Real built work, shown as evidence instead of claimed as credentials.
 *
 * GATING RULE — this list is the only thing that puts a client's site on
 * the public web, so it is deliberately awkward to add to:
 *
 *  1. Only launched, publicly reachable sites. Nothing in "coming soon",
 *     nothing unfinished, nothing behind a holding page. Presenting those
 *     as delivered work is a lie about the work AND about the client.
 *  2. Client sites only with the owner's say-so. Ours to show without
 *     asking are our own ventures and this site.
 *  3. `image` must point at a file that exists in public/work. An entry
 *     whose image is missing is skipped at render rather than showing a
 *     broken frame — see WorkStrip.
 *  4. No metrics, no outcomes, no "increased conversions by". What the
 *     site is, and who it is for. Nothing that cannot be verified by
 *     clicking the link.
 *
 * Empty by default. The section renders no strip at all while this is
 * empty, which is correct: an empty portfolio is better than a padded one.
 */
export interface WorkSample {
  /** Display name. */
  name: string
  /** What it is, in plain terms. No outcome claims. */
  kind: string
  /** Public URL. Must actually resolve. */
  href: string
  /** Path under public/, e.g. "/work/example.jpg". */
  image: string
  /** Alt text describing the screenshot, not selling it. */
  alt: string
}

export const workSamples: WorkSample[] = [
  {
    name: 'reply365.ai',
    // Accurate about what exists. The marketing site is live; the product
    // itself is still in development, and nothing here implies otherwise.
    kind: 'Marketing site for our own product',
    href: 'https://reply365.ai/',
    image: '/work/reply365-ai.jpg',
    alt: 'The reply365.ai homepage.',
  },
]

export const workStrip = {
  /* Two labels because one screenshot is an example, not a portfolio, and
     calling a single item "Recent builds" is the kind of small inflation
     that costs more trust than it buys. */
  labelOne: 'A recent build',
  labelMany: 'Recent builds',
  note: 'Live and open to click. No case study, because there is nothing to add that clicking through does not already show.',
} as const

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
