export type RoofingAutomation = {
  id: string
  title: string
  description: string
}

export type RoofingAutomationGroup = {
  id: string
  title: string
  description: string
  items: RoofingAutomation[]
}

export type FeaturedRoofingAutomation = RoofingAutomation & {
  timeBenefit: string
  moneyBenefit: string
}

export const automationGroups: RoofingAutomationGroup[] = [
  {
    id: 'leads-and-sales',
    title: 'Capture leads. Move estimates forward.',
    description: 'Connect the steps between a new inquiry and an approved job.',
    items: [
      {
        id: 'lead-capture',
        title: 'Lead capture and first response',
        description: 'Bring inquiries from connected forms and ad channels into one customer record, preserve their source, check for duplicates and send an appropriate acknowledgment.',
      },
      {
        id: 'missed-call-recovery',
        title: 'Missed-call recovery',
        description: 'Create a callback task and send an appropriate acknowledgment after a missed call, with follow-up adjusted when the customer responds or opts out.',
      },
      {
        id: 'after-hours-intake',
        title: 'After-hours intake',
        description: 'Collect the property address, roofing issue, urgency and preferred inspection time, then route urgent requests to your designated team member.',
      },
      {
        id: 'lead-assignment',
        title: 'Lead qualification and assignment',
        description: 'Check the service area and requested work, assign the right salesperson and alert a manager when an inquiry has not received a response.',
      },
      {
        id: 'inspection-booking',
        title: 'Inspection booking and reminders',
        description: 'Offer approved appointment availability, send confirmations and reminders, and adjust follow-up when an appointment is booked, changed or missed.',
      },
      {
        id: 'estimate-follow-up',
        title: 'Estimate follow-up',
        description: 'Follow up on open estimates and alert the salesperson to replies, stopping the sequence when the customer responds, accepts, declines or opts out.',
      },
      {
        id: 'lead-reactivation',
        title: 'Older lead reactivation',
        description: 'Reconnect with eligible prospects who postponed a repair or replacement, with follow-up stopped when they respond, decline or opt out.',
      },
      {
        id: 'contract-deposit-follow-up',
        title: 'Contract and deposit follow-up',
        description: 'Track unsigned agreements and unpaid deposits, remind customers while action is outstanding and signal when the job is ready for production.',
      },
    ],
  },
  {
    id: 'jobs-and-customers',
    title: 'Keep jobs and homeowners up to date.',
    description: 'Reduce repeated admin between the signed agreement and final payment.',
    items: [
      {
        id: 'production-handoff',
        title: 'Sales-to-production handoff',
        description: 'Turn an approved job into assigned tasks, required documents, material selections and a production checklist.',
      },
      {
        id: 'customer-portal',
        title: 'Customer progress portal',
        description: 'Share confirmed milestones, appointments, approved photos, documents and next steps in the customer portal, with notifications when information changes.',
      },
      {
        id: 'installation-preparation',
        title: 'Installation preparation',
        description: 'Send timely instructions about parking, pets, property access, material delivery and what homeowners should expect during installation.',
      },
      {
        id: 'weather-scheduling',
        title: 'Weather-related scheduling alerts',
        description: 'Flag jobs potentially affected by weather and prepare schedule changes and customer updates for staff approval.',
      },
      {
        id: 'crew-dispatch',
        title: 'Crew dispatch and work orders',
        description: 'Send each crew its approved schedule, job address, scope, access notes and checklist, then track acknowledgment.',
      },
      {
        id: 'materials-permits',
        title: 'Materials and permit tracking',
        description: 'Remind staff about orders, delivery confirmations, permits and inspections, and flag missing prerequisites before installation.',
      },
      {
        id: 'job-closeout',
        title: 'Job documentation and closeout',
        description: 'Request missing photos and checklists, then assemble approved completion documents, warranty information and care instructions.',
      },
      {
        id: 'payment-reminders',
        title: 'Invoice and payment reminders',
        description: 'Use current accounting status to send balance reminders, stop them after payment and alert the office when personal follow-up is needed.',
      },
    ],
  },
  {
    id: 'repeat-business-and-growth',
    title: 'Stay connected after the job.',
    description: 'Build repeat business and keep your marketing and follow-up organized.',
    items: [
      {
        id: 'storm-outreach',
        title: 'Storm-area customer outreach',
        description: 'Overlay weather events with customer properties to prepare an outreach and inspection worklist for staff review, using eligible contacts and potential exposure rather than assumed roof damage.',
      },
      {
        id: 'review-requests',
        title: 'Automatic review requests',
        description: 'Invite customers to review completed jobs using consistent eligibility, with a limited reminder that stops after a review or opt-out and alerts for new reviews.',
      },
      {
        id: 'referral-follow-up',
        title: 'Referral follow-up',
        description: 'Invite customers to refer someone, capture each referral, assign the appropriate follow-up and track resulting jobs.',
      },
      {
        id: 'maintenance-reminders',
        title: 'Inspection and maintenance reminders',
        description: 'Schedule eligible customer outreach around annual inspections, maintenance plans, warranty milestones and previously identified repair needs.',
      },
      {
        id: 'paid-ads-workflows',
        title: 'Paid advertising workflows',
        description: 'Connect ad inquiries to the CRM, flag spend or lead-delivery problems, route campaign changes for approval and report inspections and won jobs where tracking supports it.',
      },
      {
        id: 'social-media-workflows',
        title: 'Social media content workflows',
        description: 'Turn approved project photos and job details into draft posts, route them for approval, schedule publication and capture inquiries from supported channels.',
      },
      {
        id: 'portfolio-updates',
        title: 'Project portfolio updates',
        description: 'Turn approved completed jobs into website case studies with before-and-after photos, work performed and customer-approved testimonials.',
      },
      {
        id: 'owner-digest',
        title: 'Owner’s daily business digest',
        description: 'Summarize unanswered leads, aging estimates, unscheduled jobs, missing documents, overdue invoices and automation failures in one daily update.',
      },
    ],
  },
]

export const featuredAutomations: FeaturedRoofingAutomation[] = [
  {
    id: 'lead-capture',
    title: 'Respond to new leads',
    description: 'Capture the inquiry, acknowledge it and put the next step in front of your team.',
    timeBenefit: 'Less copying contact details and checking separate inboxes.',
    moneyBenefit: 'Give the inquiries you already pay to attract a clearer path to an inspection.',
  },
  {
    id: 'estimate-follow-up',
    title: 'Follow through on estimates',
    description: 'Keep open proposals moving and bring replies back to the salesperson.',
    timeBenefit: 'Less manual chasing and fewer reminders to remember.',
    moneyBenefit: 'Keep quoted work from being overlooked while your team pursues new leads.',
  },
  {
    id: 'inspection-booking',
    title: 'Keep inspections on track',
    description: 'Confirm appointments, send reminders and follow up when plans change.',
    timeBenefit: 'Less scheduling back-and-forth and manual reminder calling.',
    moneyBenefit: 'Help protect inspection slots and reduce wasted trips.',
  },
  {
    id: 'customer-portal',
    title: 'Keep homeowners informed',
    description: 'Give customers a place to see confirmed progress, photos and next steps.',
    timeBenefit: 'Answer routine status questions without another call to the office.',
    moneyBenefit: 'Free office capacity to support more active jobs and new inquiries.',
  },
  {
    id: 'review-requests',
    title: 'Ask for reviews consistently',
    description: 'Make the review invitation part of job completion, with a limited reminder.',
    timeBenefit: 'Less individual review chasing after every completed job.',
    moneyBenefit: 'Give future prospects more customer feedback to consider when choosing a roofer.',
  },
  {
    id: 'storm-outreach',
    title: 'Find customers near a storm',
    description: 'Compare weather areas with customer properties and prepare a reviewed outreach list.',
    timeBenefit: 'Less cross-checking weather maps against customer records.',
    moneyBenefit: 'Focus inspection outreach on existing customers who may need your help.',
  },
]
