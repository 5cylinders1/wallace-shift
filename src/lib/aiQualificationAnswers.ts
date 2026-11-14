import type { AiQualificationInput } from '../content/aiOffer'
import type { AiOpportunityFormValues } from './aiOpportunityAdapter'

/** Keep booking contact details and checkout state out of the quiz snapshot. */
export function quizAnswers(values: AiOpportunityFormValues): AiQualificationInput {
  const { businessType, workflows, workflowDetails, currentTools, weeklyHours, impacts, impactDetails,
    role, approverAvailability, revenue, aiExperience, aiBarriers, budget, timing } = values
  return { businessType, workflows: [...workflows], workflowDetails, currentTools, weeklyHours,
    impacts: [...impacts], impactDetails, role, approverAvailability, revenue, aiExperience,
    aiBarriers: [...aiBarriers], budget, timing }
}
