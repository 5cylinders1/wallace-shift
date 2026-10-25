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

import { business } from './siteConfig'

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
    title: 'Starting prices published',
    body: 'Definition, build, and support starting points are published. Your full scope and price are agreed in writing.',
  },
  {
    title: 'Nothing built before it is agreed',
    body: 'Scope is written down and approved before work starts, and again if it changes.',
  },
] as const

/**
 * Stages 02 and 03 only.
 *
 * Stage 01 is the introduction to workflow discovery. The optional website
 * check beside it remains a website diagnostic, not a CRM or process audit.
 */
export const approachStages: ApproachStage[] = [
  {
    index: '02',
    title: 'Build around the work',
    summary:
      'Turn an agreed workflow into a system your team can use and review.',
    fields: [
      {
        label: 'What happens',
        body: 'We define the records, steps, access, and connections the system needs, then build around them. AI has a specific task where it is part of the agreed scope; routine rules and handoffs use ordinary automation.',
      },
      {
        label: 'What you see',
        body: 'A working preview and agreed checkpoints. Review the workflow from the information entered to what the team sees next. Where AI is included, we review its outputs and where a person needs to check them.',
      },
      {
        label: 'You leave with',
        body: 'A working build against the agreed scope. Feedback and changes are recorded so you can see what is included, what is ready, and what needs a separate decision.',
      },
    ],
  },
  {
    index: '03',
    title: 'Support the next step',
    summary:
      'Test the work, hand it over, and agree how it will be supported and improved.',
    fields: [
      {
        label: 'What happens',
        body: 'We review agreed workflows and connections, accessibility, and performance before launch. Website work also includes foundational SEO and analytics. The checks follow what we have agreed to build.',
      },
      {
        label: 'What you see',
        body: 'The pre-launch checks, your own accounts, and the handover. We distinguish maintenance and minor adjustments from new workflows and larger features, which need a separate scope or development partnership.',
      },
      {
        label: 'You leave with',
        body: 'Ownership and a full handover, with support terms agreed for the project. Where a website package includes a launch warranty, faults in our build are fixed within that window at no cost.',
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
  heading: 'Define the work before the build.',
  supporting:
    'The first conversation is free. We discuss the problem and the tools involved, then agree the appropriate starting point. These are the published first steps, not a quote for a complete custom system.',
  items: [
    {
      service: 'CRMs & systems',
      step: '$2,500 system definition sprint',
      note: 'One week. Users, workflows, roles, integrations, and edge cases mapped before anyone commits to a build price. Applied to the project total if the build begins within 30 days.',
      href: '/pricing#web-apps',
    },
    {
      service: 'AI & automation',
      step: '$1,000 automation audit',
      note: 'Three to five business days. The repetitive work traced and costed, with a prioritized plan. Credited toward qualifying builds of $5,000 or more. AI requirements are scoped explicitly; complex AI systems are separate work.',
      href: '/pricing#automation',
    },
    {
      service: 'Websites',
      // The 50% figure is Matthew's own policy, confirmed 2026-09-03. It
      // was deliberately absent until then because pricing.ts publishes
      // only "a deposit to hold the schedule" with no percentage.
      step: 'From $1,000, then 50%',
      note: 'Scope is agreed in writing first. The 50% deposit follows that approval and holds your place in the schedule — nothing is built before both are settled. CRM connections or other system work are included only when specified in that scope.',
      href: '/pricing#websites',
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
      'A layout demonstration using this site’s own type and spacing. It shows how an interface adapts to its space, not a client system or a completed CRM.',
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
      'The review areas for an agreed build. The list illustrates the process; it is not a live test report for a client system.',
    /** These review areas match stage 03; website checks remain scoped. */
    checks: [
      'Agreed workflows and connections',
      'Accessibility review',
      'Performance review',
      'Website SEO and analytics',
      'Your accounts and support scope',
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
  note: 'A website for our own venture. It demonstrates the public-facing work, not client CRM results.',
} as const

export const approachProof = {
  eyebrow: 'Why trust the build',
  // The old heading — "the people in the meeting are the people doing the
  // work" — promised a plural the copy never delivered, and blurred who
  // does what. Naming both, with real remits, answers the question the
  // heading was gesturing at.
  heading: 'Work directly with the people responsible.',
  people: [
    {
      name: 'Bella Wallace',
      role: 'Sales and first contact',
      email: business.salesEmail,
      // Must never imply she scopes or answers technical questions.
      body: 'The first person you speak to. She handles enquiries and keeps things moving; anything technical goes straight to Matthew rather than through her.',
    },
    {
      name: 'Matthew Wallace',
      role: 'Engineer',
      email: null,
      body: 'Scopes, designs, and builds each project. Matthew has been building production websites and web applications since 2009; technical decisions and questions about your workflows go directly to him.',
    },
  ],
  paragraphs: [
    'Bella handles first contact and coordination. Matthew takes responsibility for technical scope, the build, and the handover.',
    'We limit concurrent projects so the person defining your system stays involved in building it. Ongoing development and maintenance have their own agreed scope.',
  ],
  /** Factual, checkable, and about depth rather than any one technology. */
  credentials: [
    'Building production web products since 2009',
    'Workflow definition, design, and development',
    'Direct engineering involvement through handover',
  ],
  /** Verifiable without leaving the page. */
  proofNote: 'See definition, build, and ongoing support',
  proofHref: '/pricing',
} as const

export const approachCta = {
  headlineLines: ['Have something', 'you want to'],
  headlineAccent: 'improve?',
  supporting:
    'Tell us where work gets stuck, what your team uses today, and what you need to see more clearly. We will discuss whether to adapt, connect, or build, then agree the next step.',
  primaryLabel: 'Discuss your workflow',
  secondaryLabel: 'See starting prices',
  secondaryHref: '/pricing',
} as const
