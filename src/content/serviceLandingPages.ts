/** Distinct buying questions belong on distinct pages. Prices stay in pricing.ts. */
export interface ServiceLandingContent {
  path: string
  title: string
  description: string
  name: string
  serviceType: string
  headlineLines: string[]
  headlineAccent: string
  supporting: string
  introduction: { heading: string; paragraphs: string[] }
  examplesHeading: string
  examples: { title: string; body: string }[]
  deliverables: string[]
  process: { title: string; body: string }[]
  scope: string
  pricingHref: string
  questions: { question: string; answer: string }[]
  guides: { title: string; href: string }[]
  cta: string
}

export const serviceLandingPages: ServiceLandingContent[] = [
  {
    path: '/services/ai-integration',
    title: 'AI Integration for Small Businesses | Wallace Shift',
    description: 'AI consulting and integration for small businesses in Kansas City and remotely. Choose a useful task, connect your tools, test the workflow, and train your team.',
    name: 'AI integration',
    serviceType: 'AI consulting and integration for small businesses',
    headlineLines: ['AI integration', 'for small'],
    headlineAccent: 'businesses.',
    supporting: 'Put AI to work in the tools and processes your team already uses. We help small businesses choose a useful starting point, build the integration, and test it with the people doing the work.',
    introduction: {
      heading: 'AI consulting that leads to a working integration',
      paragraphs: [
        'You may know which repeated task needs attention, or you may still be deciding where AI would help. We start with the work, the information available, and what a useful result looks like. That gives the project a clear purpose before anyone chooses a model or a new subscription.',
        'AI implementation can be one focused connection to an existing system. It can also be part of a CRM integrated with AI. We check what your tools support, define the points where someone reviews a result, and use ordinary automation for predictable steps.',
      ],
    },
    examplesHeading: 'Possible starting points for small business AI',
    examples: [
      { title: 'Customer enquiries and draft replies', body: 'Assess a workflow that extracts useful details from an enquiry and prepares a reply for your team to check. Agree which messages need a person and what information the system may use.' },
      { title: 'Job notes and customer updates', body: 'Turn supplied notes into a draft summary, a list of next actions, or a customer update. Test for missing details and unsupported statements before using the output.' },
      { title: 'Finding business information', body: 'Explore an assistant that retrieves answers from approved documents. Define source access, show where an answer comes from, and provide a way to escalate questions it cannot answer.' },
    ],
    deliverables: [
      'An agreed use case, intended users, and examples of a successful result',
      'A scoped integration with your existing tools where their access and capabilities allow',
      'Rules for permitted data, access, human review, and failed or uncertain results',
      'Testing with representative inputs and agreed acceptance criteria',
      'Team walkthrough, documentation, and a separately agreed support plan',
    ],
    process: [
      { title: 'Choose the first task', body: 'Review the repeated work, available information, and current tools. Decide whether AI, a simpler automation, or a process change is the right starting point.' },
      { title: 'Build and evaluate', body: 'Connect the agreed inputs and outputs, then test useful, incomplete, and difficult examples with your team. Refine the workflow before relying on it.' },
      { title: 'Introduce it to the team', body: 'Walk through normal use, review responsibilities, and the fallback when something goes wrong. Agree who will maintain the integration as the tools change.' },
    ],
    scope: 'AI projects receive an individual scope and quote. The work depends on the task, data, integrations, and review requirements. We explain provider subscriptions and usage costs separately. A paid audit is useful when the starting point needs investigation; a clearly defined task can begin with focused scoping.',
    pricingHref: '/pricing#automation',
    questions: [
      { question: 'Can we use AI without replacing our current CRM?', answer: 'Often the first step is to connect a task to the tools you already use. We review API access, permissions, and the quality of the available data before agreeing what can be integrated. A replacement CRM is a separate decision.' },
      { question: 'How is AI integration different from workflow automation?', answer: 'Automation follows defined rules, such as assigning a record or sending an approved reminder. AI can help interpret or draft unstructured information. A useful workflow may use both, with checks appropriate to the task.' },
      { question: 'Do you help with AI adoption and team training?', answer: 'The agreed integration includes a walkthrough and documentation so the team knows how to use it, review the output, and respond to problems. Wider training or additional use cases are scoped separately.' },
    ],
    guides: [
      { title: 'AI or rules based automation for enquiries?', href: '/blog/ai-vs-rules-based-automation-inquiries' },
      { title: 'What an automation audit should include', href: '/blog/automation-audit-scope-deliverables-cost' },
      { title: 'Connecting a website form to your CRM', href: '/blog/connect-website-form-to-crm' },
    ],
    cta: 'Discuss your AI integration',
  },
  {
    path: '/services/custom-crm-development',
    title: 'Custom CRM Development for Small Businesses | Wallace Shift',
    description: 'Custom CRM development for small businesses in Kansas City and remotely. Bring customer records, follow up, reporting, and daily work into one tailored system.',
    name: 'Custom CRM development',
    serviceType: 'Custom CRM development',
    headlineLines: ['Custom CRM', 'development for'],
    headlineAccent: 'your business.',
    supporting: 'Build a shared view of customers, enquiries, and work in progress around the way your team operates. We design custom CRM systems, focused internal tools, and customer portals with a clear scope.',
    introduction: {
      heading: 'A CRM built around your actual workflow',
      paragraphs: [
        'A spreadsheet can work until it becomes difficult to see who owns the next step, which record is current, or what happened to an enquiry. A custom CRM brings those decisions into a shared system with agreed records, permissions, and views.',
        'Custom software is one option. We first assess whether your existing CRM can be configured or extended. If a build is justified, we define the smallest useful system and the information it needs before adding more features.',
      ],
    },
    examplesHeading: 'What your CRM could bring together',
    examples: [
      { title: 'Customer records and follow up', body: 'Keep the relevant contact details, history, responsibilities, and next actions together. Define how new enquiries become owned work and when the team needs a reminder.' },
      { title: 'Operational views and reporting', body: 'Create views around the questions your team needs to answer: what is open, where work is held up, and who needs to act. Reporting starts with reliable records and agreed definitions.' },
      { title: 'Portals and connected tools', body: 'Scope customer access or connections to existing systems when they help the workflow. Permissions, migration, integrations, and a CRM integrated with AI are defined explicitly.' },
    ],
    deliverables: [
      'A workflow map and agreed requirements for the first release',
      'Defined customer records, permissions, responsibilities, and key views',
      'A working system reviewed against the tasks your team needs to complete',
      'An explicit plan for integrations, migration, and testing where included',
      'Project code, documentation, handover, and agreed ongoing support options',
    ],
    process: [
      { title: 'Map the records and decisions', body: 'Trace the customer journey, record ownership, and handoffs. Use real tasks to decide what the system must support and what can wait.' },
      { title: 'Build and review in stages', body: 'Review working screens and workflows with your team. Test permissions, key actions, and the edge cases agreed in the scope.' },
      { title: 'Prepare the handover', body: 'Check the launch data and daily workflow, document the system, and agree how support and future development will be handled.' },
    ],
    scope: 'Focused builds can begin with a clearly defined scope. Larger systems or unclear requirements start with a paid definition sprint. Migration, complex integrations, hosting, and provider subscriptions are scoped separately; the pricing page explains the current starting points.',
    pricingHref: '/pricing#web-apps',
    questions: [
      { question: 'When is a custom CRM worth considering?', answer: 'Consider it when important work repeatedly falls outside the capabilities of your current tools and those gaps are understood. Compare configuration, extensions, and a custom build against the same tasks before deciding.' },
      { question: 'Can you move our existing customer data?', answer: 'Migration can be included after we assess the source records, access, duplicates, and required history. A migration plan should define what is being moved, how it will be checked, and how the team will switch systems.' },
      { question: 'Who owns the finished system?', answer: 'The project code and accounts are yours, with documentation and handover. Third party services retain their own terms and fees. Ongoing improvements are agreed separately rather than assumed to be included indefinitely.' },
    ],
    guides: [
      { title: 'Custom CRM or an existing platform?', href: '/blog/custom-crm-vs-off-the-shelf' },
      { title: 'CRM requirements for a service business', href: '/blog/crm-requirements-template-service-business' },
      { title: 'Planning your CRM implementation budget', href: '/blog/crm-implementation-cost-service-business' },
    ],
    cta: 'Discuss your CRM project',
  },
  {
    path: '/services/workflow-automation',
    title: 'Workflow Automation Services for Small Business | Wallace Shift',
    description: 'Workflow automation services for small businesses. Connect enquiries, follow up, onboarding, and existing tools with clear rules, testing, and support.',
    name: 'Workflow automation',
    serviceType: 'Workflow automation consulting and implementation',
    headlineLines: ['Workflow automation', 'for small'],
    headlineAccent: 'businesses.',
    supporting: 'Connect repeated steps so your team has a clear next action. We plan and build business process automation for enquiries, customer onboarding, updates, and the handoffs between your tools.',
    introduction: {
      heading: 'Connect the steps your team keeps repeating',
      paragraphs: [
        'Copying an enquiry into another system, assigning an owner, and remembering to follow up can involve several separate actions. Workflow automation connects those steps with agreed triggers, conditions, and a record of what happened.',
        'We start by mapping the process and checking the tools involved. A small setup may only need one reminder sequence. A wider project may connect several systems, handle exceptions, and provide a clear way to recover when a step fails.',
      ],
    },
    examplesHeading: 'Where workflow automation can help',
    examples: [
      { title: 'Enquiry capture and follow up', body: 'Plan how a form submission reaches the right record and person. Define reminders, duplicate checks, and stop conditions so a follow up does not continue after the work has moved on.' },
      { title: 'Client onboarding', body: 'Connect the agreed steps after a customer says yes: gather information, create tasks, and make the handoff visible. Keep approvals and exceptions with the people responsible.' },
      { title: 'Updates between systems', body: 'Scope the information that should move between tools and which record is authoritative. Test missing fields, permission changes, and interrupted connections.' },
    ],
    deliverables: [
      'A map of the steps, systems, and people involved',
      'Agreed triggers, conditions, field mappings, and stop rules',
      'A working automation within the capabilities and access of your tools',
      'Checks for incomplete information, repeated events, and failed steps',
      'Documentation, a team walkthrough, and a recovery and support plan',
    ],
    process: [
      { title: 'Trace the repeated work', body: 'Identify what starts the process, who owns each step, and where a handoff fails. Use an audit when the opportunity needs investigation.' },
      { title: 'Connect and test', body: 'Build the agreed sequence and check it with normal inputs and likely failures. Confirm what should happen once and what can safely be retried.' },
      { title: 'Keep it understandable', body: 'Document the workflow and show the team how to check its status. Agree monitoring, maintenance, and how new workflows will be scoped.' },
    ],
    scope: 'A clearly defined follow up setup can begin without a separate audit. Connected workflow builds, custom code, and AI integrations receive their own scope. Platform subscriptions and usage fees are additional, and managed automation covers agreed existing workflows rather than unlimited new development.',
    pricingHref: '/pricing#automation',
    questions: [
      { question: 'Do we need an automation audit first?', answer: 'Not for every project. A small, clearly defined setup can start with focused scoping. An audit is useful when you need to investigate several processes, identify priorities, or understand why a workflow is failing.' },
      { question: 'Does workflow automation have to use AI?', answer: 'No. Predictable steps usually need rules and reliable connections. AI may help when a task involves interpreting or drafting information, but it introduces its own testing and review requirements.' },
      { question: 'What happens if a connected tool changes or fails?', answer: 'We agree failure handling and who is responsible for checking the workflow. Monitoring, maintenance, and recovery can be covered through a support plan. New integrations and substantial changes are scoped separately.' },
    ],
    guides: [
      { title: 'Automation audit scope and deliverables', href: '/blog/automation-audit-scope-deliverables-cost' },
      { title: 'What to check when an automation fails', href: '/blog/automation-failure-recovery-checklist' },
      { title: 'Planning client onboarding automation', href: '/blog/automate-client-onboarding' },
    ],
    cta: 'Discuss your workflow',
  },
  {
    path: '/services/web-design',
    title: 'Small Business Web Design in Kansas City | Wallace Shift',
    description: 'Custom web design for small businesses in Kansas City and remotely. Clear content, responsive pages, enquiry forms, and connections to your business systems.',
    name: 'Business web design',
    serviceType: 'Small business web design and development',
    headlineLines: ['Web design for', 'small'],
    headlineAccent: 'businesses.',
    supporting: 'Give customers a clear way to understand your work and take the next step. We design and build business websites for Greater Kansas City and remote clients, with the enquiry handoff planned from the start.',
    introduction: {
      heading: 'A website connected to the way you do business',
      paragraphs: [
        'A useful business website answers the questions a customer brings: what you do, who it is for, where you work, and how to get started. Its content and navigation should make those answers easy to find on a phone or a larger screen.',
        'We plan the website alongside the work that follows an enquiry. A straightforward site can stand on its own. CRM connections, booking, customer accounts, and other integrations are discussed and scoped when they are part of the project.',
      ],
    },
    examplesHeading: 'Choose a website scope around your customers',
    examples: [
      { title: 'A clear first business website', body: 'Explain your services, show how to get in touch, and provide the details customers need before making an enquiry. Start with the pages and content that serve a real purpose.' },
      { title: 'A considered redesign', body: 'Review the current content, page structure, and enquiry journey before replacing the design. Preserve useful URLs and plan redirects for pages that change.' },
      { title: 'A connected customer journey', body: 'Scope the handoff from a form to a customer record or another business tool. Decide what information to collect, who receives it, and how the customer knows what happens next.' },
    ],
    deliverables: [
      'An agreed page structure and customer enquiry journey',
      'Content, design, and development within the selected scope',
      'Responsive pages with clear navigation and accessible form labels',
      'Page titles, descriptions, relevant headings, and a crawlable sitemap',
      'Launch checks, ownership, documentation, and optional website care',
    ],
    process: [
      { title: 'Plan the information', body: 'Agree your audience, offer, service area, and the action each page should support. Identify content you can supply and what needs to be created.' },
      { title: 'Design and build', body: 'Review the direction and working pages, then check the content and enquiry path at mobile and desktop sizes. Add motion where it helps explain the work.' },
      { title: 'Launch and hand over', body: 'Check forms, page addresses, indexing settings, and access to the site. Provide the agreed handover and decide how ongoing care will work.' },
    ],
    scope: 'The pricing page explains the current website packages and their inclusions. Additional pages, extensive copywriting, ecommerce, booking, custom integrations, and customer accounts may require a separate scope. Search rankings and a particular number of enquiries cannot be guaranteed by a website build.',
    pricingHref: '/pricing#websites',
    questions: [
      { question: 'Do you only work with Kansas City businesses?', answer: 'We serve Greater Kansas City and work remotely with businesses elsewhere. Projects use calls, screen shares, and working previews, so location does not need to limit the collaboration.' },
      { question: 'Can the website connect to our CRM?', answer: 'We can scope an enquiry handoff after checking your CRM access, supported interfaces, and required fields. The connection and its ongoing maintenance are agreed explicitly rather than assumed to be included in every website package.' },
      { question: 'Does a new website include ongoing SEO?', answer: 'The build includes the technical and content structure agreed in its scope. Ongoing content, search performance review, and further optimization are separate work. No build can promise a Google position or a fixed number of leads.' },
    ],
    guides: [
      { title: 'What a service business website needs', href: '/blog/what-your-service-website-must-have-to-get-more-inquiries' },
      { title: 'Custom website or template?', href: '/blog/custom-website-vs-template' },
      { title: 'What to prioritize in a website redesign', href: '/blog/website-redesign-strategy-what-to-prioritize-first' },
    ],
    cta: 'Discuss your website',
  },
]
