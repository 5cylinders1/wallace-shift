/** Campaign offers are intentionally separate from the broader custom build menu. */
export type ContractorOfferId = 'website' | 'lead-follow-up'

export const contractorOffers = {
  website: {
    id: 'website',
    path: '/offers/contractor-websites',
    name: 'Website, hosting and care',
    price: '$250',
    interval: '/month',
    priceLabel: '$250/month',
    title: 'Contractor Websites for $250/month | Wallace Shift',
    description: 'A contractor website with hosting, maintenance and basic SEO for $250/month. See demos and the scope before talking with Wallace Shift in Kansas City.',
    heading: 'Your work deserves',
    emphasis: 'a better website.',
    intro: 'Give customers a clear picture of what you do and an easy way to get in touch. We build your website and take care of the hosting, maintenance and basic SEO.',
    priceNote: 'Website build included with the monthly package.',
    cta: 'Discuss my website',
    fit: 'For contractors who need a new website or a better home for their business online.',
    scopeTitle: 'Your website. Taken care of.',
    scope: [
      ['A website for your business', 'Your services, service area and work, presented clearly on phones and computers. The included pages and content are agreed before we build.'],
      ['Hosting and maintenance', 'Hosting, technical upkeep and support for the agreed website. Content changes and maintenance limits are defined in your service agreement.'],
      ['Basic SEO', 'Clear page titles, descriptions, headings and indexable service information. A sound starting point for search, with no ranking promises.'],
      ['A clear way to contact you', 'A working inquiry form and contact details, so a customer who is interested can take the next step.'],
    ],
    exclusions: 'Paid ads, ongoing SEO campaigns, ecommerce, custom CRMs, advanced interactive tools and automated follow up are separate services. Domain registration and any paid services are confirmed before you commit.',
    terms: 'The website build is included in the $250 monthly package. We confirm the page scope, service limits, ownership, minimum term and cancellation terms in writing before you agree. This page does not take payment or start a subscription.',
    faqs: [
      ['Is the website really included?', 'Yes. The agreed website build is included with the $250/month hosting, maintenance and basic SEO package. Any work outside that scope is quoted before we begin.'],
      ['What does basic SEO mean?', 'It means foundational work on your website, including page titles, descriptions, headings and service information that search engines can read. It does not include a monthly content campaign, link building, ongoing local SEO management or guaranteed rankings.'],
      ['Can I keep my existing domain?', 'Yes. We can plan the website around a domain you already own. We review your current setup and agree how the launch will work before changing anything.'],
      ['Are all the demo features included?', 'The demos show design directions and possible customer journeys. Custom estimators, 3D scenes, AI tools and portals are examples of additional work. We agree what your $250/month website includes before you commit.'],
      ['What if I already like my website?', 'You may only need a focused page for a specific service or ad campaign. The $1,500 lead page and follow up offer can sit alongside an existing website.'],
      ['Can I ask questions before deciding?', 'Absolutely. Tell us what you want to understand. You can be comparing options, planning for later or gathering information for someone else.'],
    ],
  },
  'lead-follow-up': {
    id: 'lead-follow-up',
    path: '/offers/lead-page-follow-up',
    name: 'Lead page and automatic follow up',
    price: '$1,500',
    interval: 'one time',
    priceLabel: '$1,500 one time',
    title: 'Lead Page and Follow Up for $1,500 | Wallace Shift',
    description: 'A focused contractor lead page with inquiry capture and automatic follow up for $1,500 one time. Try the demo and see the scope before making an inquiry.',
    heading: 'Give every inquiry',
    emphasis: 'a next step.',
    intro: 'Send people from your ad to one clear offer. Capture the project details, acknowledge the request and give your team a defined way to follow up.',
    priceNote: 'Lead page and one agreed follow up workflow.',
    cta: 'Discuss my lead page',
    fit: 'For contractors promoting a specific service who want a clear path from ad click to follow up.',
    scopeTitle: 'One offer. A connected response.',
    scope: [
      ['One focused lead page', 'A page built around your service, offer and next step. It can work alongside the website you already have.'],
      ['Inquiry capture', 'A form that collects the agreed project details and routes the inquiry to the inbox or compatible tool you use.'],
      ['Automatic follow up setup', 'One agreed workflow with a confirmation, follow up messages and a next step. We confirm the channel, timing and stop conditions with you.'],
      ['Testing and handoff', 'We test the page, inquiry delivery and agreed workflow, then show you how it works and where to manage it.'],
    ],
    exclusions: 'Ad spend and campaign management are not included. Hosting, software subscriptions and email or SMS usage are separate where needed. Custom CRM builds, complex integrations and ongoing management are quoted separately.',
    terms: 'The $1,500 covers the agreed page and workflow setup. We confirm tool compatibility, delivery scope and any recurring costs before work begins. This page does not purchase a package or authorize messages to your customers.',
    faqs: [
      ['Do I need a whole new website?', 'No. A lead page can promote one service alongside your existing website. If you need a complete business website with ongoing care, see the $250/month website package.'],
      ['Does $1,500 include ongoing software costs?', 'No. It covers the agreed page and follow up setup. We identify any hosting, software, email or SMS usage costs before you commit. Those costs depend on the tools and channel we agree to use.'],
      ['Is this an AI agent or a custom CRM?', 'This offer is a focused lead page and one follow up workflow. AI agents, custom CRMs and broader connected systems require a separate scope.'],
      ['Can this work with my current tools?', 'We review the tools you already use first. Compatibility, available integrations and any additional costs are confirmed before you agree to the project.'],
      ['What happens when someone replies?', 'We agree the reply handling and stop conditions as part of your workflow. The aim is a clear handoff to you, with follow up that stops when it should.'],
      ['What if I am not ready to buy?', 'You can ask about the scope, see how it could fit your business or plan for later. An inquiry starts a conversation, not a purchase.'],
    ],
  },
} as const

export function contractorOfferForPath(path: string) {
  return Object.values(contractorOffers).find(offer => offer.path === path)
}
