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
  headlineLines: ['AI and systems', 'for your'],
  headlineAccent: 'business.',
  supporting:
    'We help small businesses put AI to work in everyday operations. AI integration, custom CRMs, and workflow automation are our core services.',
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
      'We assess what your existing tools can do before recommending a custom build. Small builds include focused scoping; larger systems or unclear requirements start with a paid definition sprint. Migration and more complex requirements are scoped explicitly.',
    pricingAnchor: '/pricing#web-apps',
    pricingLabel: 'System pricing — definition, build, and partnership',
    example: { href: '/demos/roofers-offer/#dashboard', label: 'See a sample CRM workflow' },
  },
  {
    id: 'automation',
    index: '02',
    label: 'AI & automation',
    title: 'AI integration for small businesses',
    summary:
      'Bring AI into the tools and processes your team already uses, with automation to connect the steps. Start with one useful task, then build from there.',
    problem:
      'Your team spends time reading enquiries, searching for answers, and turning notes into updates. We help you choose where AI fits and connect it to the work: drafting replies, summarising job notes, or finding information in your business documents.',
    outcomes: [
      'A clear first use case chosen around your team, tools, and budget',
      'An AI workflow connected to your existing tools where access allows',
      'Testing with representative examples and agreed checks for accuracy',
      'Clear rules for data access, human review, and what happens when AI cannot help',
      'A walkthrough for your team, documentation, and an agreed support plan',
    ],
    rightFor: [
      'You want to use AI but need help choosing a useful first step',
      'Your team repeatedly reads, drafts, or searches through the same kinds of information',
      'You want AI working inside your existing process, with people reviewing the result',
    ],
    notFor:
      'You can start with one focused integration. We check what your tools support, agree how business data is handled, and quote the build and ongoing usage before work begins. A separate audit is useful when the first step needs investigation.',
    pricingAnchor: '/pricing#automation',
    pricingLabel: 'AI integration scope and pricing',
    example: { href: '/demos/roofers-offer/#collection', label: 'Explore the sample AI roofing concepts' },
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
    'Tell us where your team spends time on repeated tasks, what tools you use, and what you would like AI to help with. We will identify a practical first step.',
  primaryLabel: 'Discuss your system',
  primaryHref: '/contact',
  secondaryLabel: 'See what it costs',
  secondaryHref: '/pricing',
}
