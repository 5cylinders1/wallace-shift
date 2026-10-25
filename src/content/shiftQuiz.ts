export type ServiceKey =
  | 'website-transformation'
  | 'conversion-redesign'
  | 'custom-web-app'
  | 'automation-integration'
  | 'ai-integration'

export type QuizAnswer = {
  id: string
  label: string
  /** Only answers in the first two questions carry scoring weight. */
  service?: ServiceKey
}

export type QuizQuestionData = {
  id: string
  question: string
  answers: [QuizAnswer, QuizAnswer, QuizAnswer, QuizAnswer]
}

export type ServiceRecommendation = {
  key: ServiceKey
  title: string
  description: string
}

export const shiftQuizCopy = {
  eyebrow: 'The Shift Finder',
  headline: 'Where does the work get stuck?',
  supporting:
    'Three questions to find a starting point for the conversation. We will agree the scope together.',
  resultEyebrow: 'A starting point to discuss',
  primaryCtaLabel: 'Discuss this with us',
  secondaryCtaLabel: 'Start over',
  chooseOneLabel: 'Choose one',
  backLabel: 'Back',
}

export const quizQuestions: QuizQuestionData[] = [
  {
    id: 'friction',
    question: 'What needs the most attention?',
    answers: [
      {
        id: 'friction-tool',
        label: 'Customer details and next steps are scattered',
        service: 'custom-web-app',
      },
      {
        id: 'friction-ai',
        label: 'I have a specific task to explore with AI',
        service: 'ai-integration',
      },
      {
        id: 'friction-time',
        label: 'Re-entry and missed handoffs slow us down',
        service: 'automation-integration',
      },
      {
        id: 'friction-website',
        label: 'Customers struggle to understand or enquire online',
        service: 'website-transformation',
      },
    ],
  },
  {
    id: 'impact',
    question: 'What would make the biggest difference?',
    answers: [
      {
        id: 'impact-experience',
        label: 'Seeing customers, follow-up, and work in one place',
        service: 'custom-web-app',
      },
      {
        id: 'impact-ai',
        label: 'Knowing whether AI can help with that task',
        service: 'ai-integration',
      },
      {
        id: 'impact-time',
        label: 'Connecting tools and reducing repeated admin',
        service: 'automation-integration',
      },
      {
        id: 'impact-credible',
        label: 'A clearer website and enquiry process',
        service: 'website-transformation',
      },
    ],
  },
  {
    id: 'timeline',
    question: 'How soon do you want to move?',
    answers: [
      { id: 'timeline-asap', label: 'As soon as possible' },
      { id: 'timeline-quarter', label: 'This quarter' },
      { id: 'timeline-planning', label: "I'm planning ahead" },
      { id: 'timeline-exploring', label: "I'm still exploring" },
    ],
  },
]

export const serviceRecommendations: Record<ServiceKey, ServiceRecommendation> =
  {
    'website-transformation': {
      key: 'website-transformation',
      title: 'Website & enquiry journey',
      description:
        'A clear customer-facing site and a planned handoff for enquiries. We will discuss the website and any connections it needs.',
    },
    // Keep existing shared links useful even though the quiz now offers
    // one website path alongside systems, AI, and workflow automation.
    'conversion-redesign': {
      key: 'conversion-redesign',
      title: 'Website enquiry improvements',
      description:
        'Review how customers understand your offer, get in touch, and reach the right person or system for follow-up.',
    },
    'custom-web-app': {
      key: 'custom-web-app',
      title: 'Custom CRM & business system',
      description:
        'Map your customer records, follow-up, and daily work before deciding what to build or connect. A definition sprint establishes the scope.',
    },
    'automation-integration': {
      key: 'automation-integration',
      title: 'Connected workflows',
      description:
        'Trace repeated tasks and handoffs, then scope connections and follow-up rules. An automation audit establishes the priorities.',
    },
    'ai-integration': {
      key: 'ai-integration',
      title: 'A practical AI integration',
      description:
        'Start with one task, examples of its inputs, and how you would judge a useful result. We will assess fit and scope the work before building.',
    },
  }

/**
 * Steps 1 and 2 decide the recommendation; step 3 is retained as timeline
 * context only. Ties fall back to the step-1 answer, since "what's broken"
 * is the more diagnostic question.
 */
export function getRecommendation(
  answers: readonly (QuizAnswer | null)[],
): ServiceRecommendation {
  const scores: Partial<Record<ServiceKey, number>> = {}

  for (const answer of [answers[0], answers[1]]) {
    if (answer?.service) {
      scores[answer.service] = (scores[answer.service] ?? 0) + 1
    }
  }

  let winner: ServiceKey = answers[0]?.service ?? 'custom-web-app'
  let best = -1

  for (const key of Object.keys(scores) as ServiceKey[]) {
    const score = scores[key] ?? 0
    if (score > best) {
      best = score
      winner = key
    }
  }

  return serviceRecommendations[winner]
}
