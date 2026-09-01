export type ServiceKey =
  | 'website-transformation'
  | 'conversion-redesign'
  | 'custom-web-app'
  | 'automation-integration'

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
  headline: 'What should we shift first?',
  supporting:
    "Answer three quick questions and we'll point you in the right direction.",
  resultEyebrow: 'Your best first shift',
  primaryCtaLabel: 'Talk through your shift',
  secondaryCtaLabel: 'Start over',
  chooseOneLabel: 'Choose one',
  backLabel: 'Back',
}

export const quizQuestions: QuizQuestionData[] = [
  {
    id: 'friction',
    question: 'What feels most broken right now?',
    answers: [
      {
        id: 'friction-website',
        label: 'My website feels outdated',
        service: 'website-transformation',
      },
      {
        id: 'friction-action',
        label: "People visit but don't take action",
        service: 'conversion-redesign',
      },
      {
        id: 'friction-tool',
        label: 'I need a custom online tool',
        service: 'custom-web-app',
      },
      {
        id: 'friction-time',
        label: 'Repetitive work is eating my time',
        service: 'automation-integration',
      },
    ],
  },
  {
    id: 'impact',
    question: 'What would make the biggest difference?',
    answers: [
      {
        id: 'impact-credible',
        label: 'Looking more credible online',
        service: 'website-transformation',
      },
      {
        id: 'impact-leads',
        label: 'Generating more qualified leads',
        service: 'conversion-redesign',
      },
      {
        id: 'impact-experience',
        label: 'Giving customers a better experience',
        service: 'custom-web-app',
      },
      {
        id: 'impact-time',
        label: 'Saving time behind the scenes',
        service: 'automation-integration',
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
      title: 'Website Transformation',
      description:
        'A rebuilt website that looks and feels as credible as the business you actually run.',
    },
    'conversion-redesign': {
      key: 'conversion-redesign',
      title: 'Conversion-Focused Redesign',
      description:
        'Sharper structure and messaging that turns more visitors into real inquiries.',
    },
    'custom-web-app': {
      key: 'custom-web-app',
      title: 'Custom Web App',
      description:
        'A focused tool or portal built around exactly how your customers and team work.',
    },
    'automation-integration': {
      key: 'automation-integration',
      title: 'Automation & Integration',
      description:
        'Practical workflows that remove repetitive tasks and missed follow-up.',
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

  let winner: ServiceKey = answers[0]?.service ?? 'website-transformation'
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
