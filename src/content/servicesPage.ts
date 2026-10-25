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
  example?: { href: string; label: string }
}

export const servicesPageMeta = {
  eyebrow: 'Services',
  headlineLines: ['Systems built', 'around your'],
  headlineAccent: 'business.',
  supporting:
    'Custom CRMs, practical AI integrations, and connected workflows. We start with the work your team needs to do, then agree what to build, connect, or improve.',
}

export const serviceDetails: ServiceDetail[] = [
  {
    id: 'web-apps',
    index: '01',
    label: 'Systems',
    title: 'Custom CRMs and business systems',
    summary:
      'A CRM keeps enquiries, customer records, follow-up, and work in progress together. We tailor the system to the way your team handles that work.',
    problem:
      'A lead arrives in one inbox, the estimate lives in a spreadsheet, and the next step is in someone’s head. When the owner needs an update, they have to ask around. A shared record, clear responsibility, and visible next actions give the team a way to track the work.',
    outcomes: [
      'A map of your workflow, the people involved, and the information each step needs',
      'An agreed scope for customer records, follow-up, reporting, or a focused portal or internal tool',
      'Connections to existing tools where access and the agreed scope allow',
      'Views that help owners see what is open, who is responsible, and what needs attention',
      'Documentation, handover, and a plan for support and separately scoped improvements',
    ],
    rightFor: [
      'Follow-up depends on one person remembering every next step',
      'Your team re-enters information or works around gaps in its current CRM',
      'You need a shared view of customers, jobs, and outstanding work',
    ],
    notFor:
      'Start with a paid definition sprint. We assess what your existing tools can do before recommending a custom build. Migration, integrations, and more complex requirements are scoped explicitly; you keep the resulting plan.',
    pricingAnchor: '/pricing#web-apps',
    pricingLabel: 'System pricing — definition, build, and partnership',
    example: { href: '/demos/roofers-offer/#dashboard', label: 'See a sample CRM workflow' },
  },
  {
    id: 'automation',
    index: '02',
    label: 'AI & automation',
    title: 'AI integrations and connected workflows',
    summary:
      'Connect predictable steps with automation. Give AI a defined task, useful inputs, and a clear point for someone to review the result.',
    problem:
      'An enquiry should not need copying into three tools before anyone can act on it. Rules can route a record or trigger a follow-up. AI can serve a different purpose: our roofing demo, for example, uses it to create a roof-finish preview from a supplied photo. That is an illustrative concept, not a completed customer project or a promise about the finished roof.',
    outcomes: [
      'A map of repeated tasks, handoffs, and the tools involved',
      'A prioritised automation plan based on the work and time at stake',
      'For AI work, an agreed task, sample inputs, review criteria, and data-handling requirements',
      'Scoped connections and checks for missing information or failed steps',
      'An agreed support plan; monitoring and minor adjustments through managed automation, with new workflows scoped separately',
    ],
    rightFor: [
      'The same information is being entered in multiple places',
      'Follow-up or handoffs get missed when the team is busy',
      'You have a specific task to assess for AI, and someone who can judge the output',
    ],
    notFor:
      'Automation starts with a paid audit. AI work and provider costs are scoped for the task; complex AI systems are not included in the standard build packages. We agree what happens when a result needs review or a connection fails.',
    pricingAnchor: '/pricing#automation',
    pricingLabel: 'Automation pricing and AI scope',
    example: { href: '/demos/roofers-offer/#collection', label: 'Explore the AI roofing concepts' },
  },
  {
    id: 'websites',
    index: '03',
    label: 'Websites',
    title: 'The customer-facing part of your system',
    summary:
      'A clear, distinctive website that helps customers understand your work and take the next step.',
    problem:
      'The website is often where an enquiry begins. Its questions, forms, and next steps should make sense to the customer and the team receiving it. We plan that handoff alongside the design, whether you need a standalone site or a connection to a wider business system.',
    outcomes: [
      'A clear explanation of your offer and who it is for',
      'Copy, design, and development built around your business',
      'Responsive pages and a clear way for customers to get in touch',
      'An agreed enquiry handoff, with CRM or other integrations scoped where needed',
      'Ownership, documentation, and a choice of ongoing website care',
    ],
    rightFor: [
      'Your website makes it hard to understand your offer or enquire',
      'You are launching a business or replacing a dated site',
      'You want the customer journey to connect with the way your team works',
    ],
    notFor:
      'Customer accounts, operational dashboards, and custom integrations may need a separate system scope. The published website packages retain their stated inclusions.',
    pricingAnchor: '/pricing#websites',
    pricingLabel: 'Website packages and care',
  },
]

export const servicesPageCta = {
  headline: 'Start with the work that needs to change.',
  supporting:
    'Tell us how things work today, where they get stuck, and what you need to see or do more easily. We will discuss the right first step.',
  primaryLabel: 'Discuss your system',
  primaryHref: '/contact',
  secondaryLabel: 'See what it costs',
  secondaryHref: '/pricing',
}
