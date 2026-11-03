/** Versioned public offer. Issued agreements retain their own immutable copy. */
export const aiOffer = {
  path: '/offers/ai-business-integration',
  version: '2026-11-02-3',
  minimumProjectFee: 2500,
  websiteScope: 'One page, one inquiry form, and one consolidated revision round',
} as const

/** Self service uses a form and email workflow so purchase does not depend on a custom integration quote. */
export const aiPackages = {
  inquiry: {
    id: 'inquiry', name: 'AI Inquiry Assistant', price: 2500,
    description: 'Give incoming inquiries a consistent first step, with a person reviewing the response.',
    scope: ['One website inquiry form connected to one team email address', 'Extract contact details, summarize the inquiry, and flag missing information', 'Email your team a draft reply for a person to review and send'],
    boundary: 'Custom CRM connections, autonomous sending, historical migration, and additional workflows are excluded. Domain, hosting, and AI usage costs are separate and require your approval before activation.',
    delivery: 'After payment, provide your form fields, team email address, approved reply guidance, account access, and five example inquiries. Delivery includes the working workflow, a demonstration against those examples, one consolidated revision round, and written operating instructions. The included website uses client supplied content. Any applicable service taxes are included in the package price.',
  },
  notes: {
    id: 'notes', name: 'AI Notes and Updates', price: 3500,
    description: 'Turn staff notes into a consistent draft update and a clearer next action.',
    scope: ['One internal form for written staff notes, connected to one team email address', 'One consistent summary template with an action list', 'Email your team a draft update for a person to review before using it'],
    boundary: 'Custom CRM connections, audio transcription, historical cleanup, complex permissions, and additional workflows are excluded. Domain, hosting, and AI usage costs are separate and require your approval before activation.',
    delivery: 'After payment, provide your note format, team email address, summary requirements, account access, and five example notes. Delivery includes the working workflow, a demonstration against those examples, one consolidated revision round, and written operating instructions. The included website uses client supplied content. Any applicable service taxes are included in the package price.',
  },
} as const
export type AiPackageId = keyof typeof aiPackages
export type AiOpportunityNextStep = 'package' | 'consultation'

export const workflowOptions = [
  { value: 'inquiries', label: 'We struggle to respond to inquiries quickly' },
  { value: 'admin', label: 'Repetitive administration takes too much time' },
  { value: 'handoffs', label: 'Information gets lost between people or systems' },
  { value: 'owner', label: 'Too much work depends on the owner' },
  { value: 'capacity', label: 'We cannot handle more work with our current team' },
  { value: 'demand', label: 'We need more customer demand' },
  { value: 'other', label: 'Something else' },
  { value: 'not_sure', label: 'I am not sure yet' },
] as const
export const roleOptions = [
  { value: 'owner', label: 'I own the business and can approve the purchase' },
  { value: 'decision_maker', label: 'I am authorized to approve the purchase' },
  { value: 'joint', label: 'I make this decision with someone else' },
  { value: 'researching', label: 'I am researching for someone else' },
] as const
export const approverOptions = [
  { value: 'yes', label: 'Yes, the person who approves can join a conversation' },
  { value: 'no', label: 'No, I cannot involve them right now' },
  { value: 'not_sure', label: 'I need to check with them first' },
] as const
export const revenueOptions = [
  { value: 'not_trading', label: 'Not yet generating revenue' },
  { value: 'under_100k', label: 'Under $100,000' },
  { value: '100k_250k', label: '$100,000 to $249,999' },
  { value: '250k_1m', label: '$250,000 to $999,999' },
  { value: '1m_5m', label: '$1 million to $5 million' },
  { value: 'over_5m', label: 'Over $5 million' },
  { value: 'prefer_not', label: "I don't know" },
] as const
export const weeklyHoursOptions = [
  { value: 'under_2', label: 'Under 2 hours' },
  { value: '2_5', label: '2 to 5 hours' },
  { value: '6_10', label: '6 to 10 hours' },
  { value: '11_20', label: '11 to 20 hours' },
  { value: 'over_20', label: 'More than 20 hours' },
  { value: 'not_sure', label: "I don't know" },
] as const
export const impactOptions = [
  { value: 'delay', label: 'Work or responses are delayed' },
  { value: 'missed', label: 'We miss opportunities or follow up' },
  { value: 'rework', label: 'Mistakes create extra work' },
  { value: 'cost', label: 'It adds operating costs' },
  { value: 'capacity', label: 'We cannot take on more work' },
  { value: 'other', label: 'other' },
  { value: 'not_sure', label: "I don't know" },
] as const
export const aiExperienceOptions = [
  { value: 'new', label: 'We have not explored it' },
  { value: 'considered', label: 'We have considered it but have not started' },
  { value: 'individual_tools', label: 'We use individual tools, but they are not connected to our work' },
  { value: 'disappointed', label: 'We tried implementing it and were disappointed' },
  { value: 'established', label: 'We already use it and want to improve' },
] as const
export const aiBarrierOptions = [
  { value: 'start', label: 'We are not sure where it would help' },
  { value: 'time', label: 'We have not had time to implement it' },
  { value: 'technical', label: 'We need technical help' },
  { value: 'value', label: 'The value or cost is unclear' },
  { value: 'accuracy', label: 'We are concerned about accuracy' },
  { value: 'privacy', label: 'We are concerned about private information' },
  { value: 'adoption', label: 'Our team has not adopted it' },
  { value: 'integration', label: 'Our tools do not work together' },
  { value: 'other', label: 'Something else is holding us back' },
] as const
export const budgetOptions = [
  { value: 'ready', label: 'Yes, I can approve that investment' },
  { value: 'value', label: 'Potentially, once I understand the scope and value' },
  { value: 'approval', label: 'I would need additional approval' },
  { value: 'unavailable', label: 'That is outside our current budget' },
] as const
export const timingOptions = [
  { value: 'now', label: 'Now' },
  { value: 'soon', label: 'Within the next month' },
  { value: 'quarter', label: 'Within 3 months' },
  { value: 'exploring', label: 'Just researching' },
] as const

export const qualificationSteps = [
  { id: 'bottleneck', label: 'The bottlenecks', heading: 'What is holding your business back?', description: 'Select all that apply. You do not need to choose the biggest issue.' },
  { id: 'business', label: 'Your business', heading: 'How much revenue did your business generate over the past 12 months?', description: 'An approximate range helps us understand the scale of your business.' },
  { id: 'impact', label: 'The impact', heading: 'What do these challenges cost your team?', description: 'Rough estimates are fine. Count the time across the issues you selected and across your team, without counting the same time twice.' },
  { id: 'experience', label: 'AI so far', heading: 'Where are you with AI today?', description: 'Your experience helps us address what has made progress difficult.' },
  { id: 'context', label: 'Your context', heading: 'Anything else we should understand about the work?', description: 'This is optional. A recent example can help us prepare for your consultation.' },
  { id: 'authority', label: 'The decision', heading: 'Are you authorized to approve a purchase for this business?', description: 'Your role helps us understand whether you can move forward with a project.' },
  { id: 'readiness', label: 'The next step', heading: 'When would you like to put this to work?', description: 'Paid implementation projects start at $2,500. Your answers help us recommend an appropriate next step.' },
] as const
export type AiQualificationStep = typeof qualificationSteps[number]['id']

type Choice<T extends readonly { value: string }[]> = T[number]['value']
export type AiOpportunityRoute = 'fit_call' | 'manual_review' | 'resource'
export type AiQualificationAnswers = {
  businessType: string
  workflows: Choice<typeof workflowOptions>[]
  workflowDetails: string
  currentTools: string
  weeklyHours: Choice<typeof weeklyHoursOptions>
  impacts: Choice<typeof impactOptions>[]
  /** Older saved quiz records may not include this answer. */
  impactDetails?: string
  role: Choice<typeof roleOptions>
  approverAvailability: Choice<typeof approverOptions> | ''
  revenue: Choice<typeof revenueOptions>
  aiExperience: Choice<typeof aiExperienceOptions>
  aiBarriers: Choice<typeof aiBarrierOptions>[]
  budget: Choice<typeof budgetOptions>
  timing: Choice<typeof timingOptions>
}
export type AiOpportunityPayload = AiQualificationAnswers & {
  submissionId: string
  offerVersion: string
  name: string
  businessName: string
  email: string
  website: string
  contactMethod: 'email' | 'call'
  nextStep: AiOpportunityNextStep
  packageId: AiPackageId | ''
  phone: string
  offerAcknowledged: boolean
  contactConsent: boolean
  company: string
}

export type AiQualificationInput = {
  [K in keyof AiQualificationAnswers]: AiQualificationAnswers[K] extends string ? AiQualificationAnswers[K] | '' : AiQualificationAnswers[K]
}

/** Direct booking requires purchase authority, investment approval, and near term readiness. */
export function isAiBookingQualified(input: Pick<AiQualificationInput, 'role' | 'budget' | 'timing'>): boolean {
  return (input?.role === 'owner' || input?.role === 'decision_maker')
    && input.budget === 'ready' && (input.timing === 'now' || input.timing === 'soon')
}

export type AiOpportunityRecommendation = {
  route: AiOpportunityRoute
  kind: 'package' | 'consultation' | 'preparation'
  packageId: 'inquiry' | 'notes' | null
  title: string
  rationale: string
  priority: 'standard' | 'established'
  barrierGuidance: string[]
}

const barrierGuidance: Record<Choice<typeof aiBarrierOptions>, string> = {
  start: 'Start with one repeated task and a demonstration of how the work would change.',
  time: 'Your scope should separate the setup we handle from the access and examples your team supplies.',
  technical: 'Confirm the connections, testing, documentation, and handover included in the implementation.',
  value: 'Compare a conservative estimate of the benefit with setup, software, and support costs before deciding.',
  accuracy: 'Use representative examples, clear review steps, and a fallback when an answer is uncertain.',
  privacy: 'Agree which information the system may access and where it may be processed before connecting anything.',
  adoption: 'Include the people doing the work, a practical walkthrough, and a clear owner for the new process.',
  integration: 'Check the exact software, account plans, and connection permissions before confirming scope.',
  other: 'Use a recent example to identify the unresolved issue before choosing an implementation.',
}

/** These are explicit commercial routing rules, not a score or verified eligibility decision. */
export function recommendAiOpportunity(input: AiQualificationInput): AiOpportunityRecommendation {
  const priority = ['250k_1m', '1m_5m', 'over_5m'].includes(input.revenue) ? 'established' : 'standard'
  const guidance = input.aiExperience === 'new'
    ? ['Start with one useful example from your own work. No previous AI experience is needed.']
    : input.aiBarriers.map(barrier => barrierGuidance[barrier]).filter(Boolean)
  const base = { priority, barrierGuidance: guidance } as const
  const preparation = (title: string, rationale: string): AiOpportunityRecommendation => ({ ...base, route: 'resource', kind: 'preparation', packageId: null, title, rationale })
  const consultation = (title: string, rationale: string, route: AiOpportunityRoute = 'manual_review'): AiOpportunityRecommendation => ({ ...base, route, kind: 'consultation', packageId: null, title, rationale })
  if ((input.role === 'joint' || input.role === 'researching') && input.approverAvailability !== 'yes') {
    return preparation('Bring the decision maker into the next step.', 'Share your answers with the person who approves this work. A useful project conversation needs their participation.')
  }
  if (input.budget === 'unavailable') return preparation('A smaller first step may be more useful.', 'The proposed implementation starts at $2,500. Review a smaller setup or return when that investment is practical.')
  if (input.revenue === 'not_trading') return preparation('Start by establishing the work you need to support.', 'A repeatable customer process gives us a clearer basis for an implementation. A simpler setup may be a better first project.')
  if (input.workflows.length === 1 && input.workflows[0] === 'demand') return preparation('Focus on the customer demand problem first.', 'An internal AI workflow may not address a shortage of inquiries. Review the way customers find and contact your business before choosing an automation package.')
  if (input.timing === 'exploring') return preparation('Use this as a plan for when you are ready.', 'Document one repeated task and the result you want. You can return to these questions when an implementation becomes a current priority.')
  const required = ['role', 'revenue', 'weeklyHours', 'aiExperience', 'budget', 'timing'] as const
  if (required.some(key => !input[key]) || input.workflows.length === 0 || input.impacts.length === 0) {
    return consultation('Complete the picture before choosing a project.', 'A recommendation needs your business context, the problem, and the people involved in the decision.')
  }
  if (input.role === 'joint' || input.role === 'researching' || input.budget === 'approval') {
    return consultation('Review the project with the people who approve it.', 'A conversation can establish the scope, value, and approval needed before anyone commits to a purchase.')
  }
  if (input.budget === 'value') return consultation('Work through the scope and value first.', 'Use your examples to compare a realistic benefit with implementation and ongoing costs. A business case is a reasonable next step.')
  if (input.workflows.includes('other') || input.workflows.includes('not_sure')
      || input.weeklyHours === 'not_sure' || input.weeklyHours === 'under_2' || input.impacts.includes('not_sure')) {
    return consultation('Take a closer look at the workflow.', 'We need a little more detail about the task, its impact, or the tools before recommending a fixed package.')
  }
  if (input.workflows.length > 1) {
    return consultation('Find a useful starting point across these issues.', 'You have identified several challenges. We can review how they connect and agree on a focused first project without asking you to rank them now.', 'fit_call')
  }
  if (input.workflows[0] === 'inquiries' || input.workflows[0] === 'admin') {
    const inquiry = input.workflows[0] === 'inquiries'
    return {
      ...base, route: 'fit_call', kind: 'package', packageId: inquiry ? 'inquiry' : 'notes',
      title: inquiry ? 'Explore an AI Inquiry Assistant.' : 'Explore AI Notes and Updates.',
      rationale: 'Your answers suggest a possible fit for a focused implementation. We still need to confirm the exact task, software compatibility, access, and available delivery time.',
    }
  }
  return consultation('Scope the change around your business.', 'Your answers point to an operational constraint that deserves a closer look. Agree on the workflow and connections before pricing the implementation.', 'fit_call')
}

/** Never approves eligibility, compatibility, scope, or capacity, even for a package recommendation. */
export function routeAiOpportunity(input: AiQualificationInput): AiOpportunityRoute {
  return recommendAiOpportunity(input).route
}
