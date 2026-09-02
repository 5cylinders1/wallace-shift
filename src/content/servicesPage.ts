/**
 * Services-page content.
 *
 * This page answers "what is this and is it for me". `pricing.ts` answers
 * "what does it cost" — the two must not drift into each other. Scope
 * bullets and figures belong on the pricing page; the material here is
 * the problem each service solves, who it suits, and what actually
 * happens during it.
 *
 * Every claim is about process, not results. No metrics, no client
 * outcomes, and no case studies appear here until real ones exist.
 */

export interface ServiceDetail {
  id: string
  index: string
  label: string
  title: string
  /** One sentence, used as the section lede. */
  summary: string
  /** The situation a visitor recognises themselves in. */
  problem: string
  /** Concrete deliverables, phrased as what you end up with. */
  outcomes: string[]
  /** Plain-language signals that this is the right service. */
  rightFor: string[]
  /** Honest signals that it is not. */
  notFor: string
  pricingAnchor: string
  pricingLabel: string
}

export const servicesPageMeta = {
  eyebrow: 'Services',
  headlineLines: ['Three ways to', 'move a business'],
  headlineAccent: 'forward.',
  supporting:
    'Most projects start as one of these and grow into another. You do not need to know which one you need before getting in touch.',
}

export const serviceDetails: ServiceDetail[] = [
  {
    id: 'websites',
    index: '01',
    label: 'Presence',
    title: 'Websites that earn trust',
    summary:
      'A website whose job is to make a business look as credible as it actually is, and make responding easy.',
    problem:
      'Customers look you up before they call. If what they find is dated, slow, hard to read on a phone, or indistinguishable from every competitor, they have already made a decision — and you never hear about it.',
    outcomes: [
      'A clear structure that says what you do and who it is for, in the first screen',
      'Copy shaped around what customers actually ask, not internal job titles',
      'A design built for your business rather than adapted from a template',
      'Fast, accessible pages that work properly on a phone',
      'One obvious way to get in touch, on every page',
      'A site you own outright and can hand to anyone',
    ],
    rightFor: [
      'Replacing a dated, templated, or DIY site',
      'Launching a business that has no site yet',
      'A business whose reputation is better than its website suggests',
    ],
    notFor:
      'If you need customer accounts, bookings tied to inventory, or logic that changes per user, that is a web app — the next section.',
    pricingAnchor: '/pricing#websites',
    pricingLabel: 'Website pricing — three levels from $1,000',
  },
  {
    id: 'web-apps',
    index: '02',
    label: 'Experience',
    title: 'Web apps that remove friction',
    summary:
      'Software built around one workflow your business actually runs, instead of five tools bolted together.',
    problem:
      'The work happens in a spreadsheet, three inboxes, and someone’s head. It works until a person is away, a step is skipped, or the business grows — and then every gap costs a customer or an afternoon.',
    outcomes: [
      'A mapped picture of the users, roles, and edge cases before anything is built',
      'One focused tool — a portal, booking system, dashboard, or internal tool',
      'The integrations that keep it in step with what you already use',
      'A build that can be extended rather than replaced when things change',
      'Documentation and handover, so the system is not a black box',
    ],
    rightFor: [
      'A workflow that breaks when one person is unavailable',
      'Customers asking for something your current tools cannot do',
      'Paying for several tools that each solve part of the problem',
    ],
    notFor:
      'Every app starts with a paid definition sprint. If that work shows the build is not worth it, we say so — and the map is still yours to take elsewhere.',
    pricingAnchor: '/pricing#web-apps',
    pricingLabel: 'Web app pricing — definition, build, and partnership',
  },
  {
    id: 'automation',
    index: '03',
    label: 'Operations',
    title: 'Automation that gives time back',
    summary:
      'Connecting the systems you already pay for, so repetitive work stops needing a person.',
    problem:
      'Someone re-types the same information into a second system. Follow-up depends on remembering. The work is not hard — it is just constant, and it quietly consumes the hours that should go into the business.',
    outcomes: [
      'A traced map of the repetitive work and what it currently costs you',
      'A prioritised plan, ordered by hours returned rather than by novelty',
      'Workflows connecting the tools you already use',
      'Follow-up that happens whether or not anyone remembers',
      'Monitoring, so a silent failure does not go unnoticed for a month',
    ],
    rightFor: [
      'The same information being entered in two places',
      'Leads or follow-ups falling through the cracks',
      'A process that only works because one person babysits it',
    ],
    notFor:
      'Automation starts with a paid audit that calculates the hours at stake. If the savings do not justify a build, that is the finding — and you keep the plan.',
    pricingAnchor: '/pricing#automation',
    pricingLabel: 'Automation pricing — audit, build, and managed',
  },
]

export const servicesPageCta = {
  headline: 'Not sure which one you need?',
  supporting:
    'Most people are not, and it is not your job to diagnose it. Answer three questions, or just describe what is not working.',
  primaryLabel: 'Start a project',
  primaryHref: '/contact',
  secondaryLabel: 'See what it costs',
  secondaryHref: '/pricing',
}
