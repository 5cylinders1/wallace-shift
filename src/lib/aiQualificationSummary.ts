import { aiBarrierOptions, aiExperienceOptions, approverOptions, budgetOptions, impactOptions, revenueOptions, roleOptions, timingOptions, weeklyHoursOptions, workflowOptions, type AiQualificationInput } from '../content/aiOffer.js'

export function aiQualificationFacts(answers: AiQualificationInput): [string, string][] {
  const label = (options: readonly { value: string; label: string }[], value: string) => options.find(option => option.value === value)?.label ?? 'Not provided'
  return [
    ['Business challenges', answers.workflows.map(value => label(workflowOptions, value)).join('; ')],
    ['Purchase authority', label(roleOptions, answers.role)],
    ...((answers.role === 'joint' || answers.role === 'researching') && answers.approverAvailability ? [['Approver participation', label(approverOptions, answers.approverAvailability)] as [string, string]] : []),
    ['Annual revenue', label(revenueOptions, answers.revenue)],
    ['Weekly team time', label(weeklyHoursOptions, answers.weeklyHours)],
    ['Consequences', answers.impacts.map(value => label(impactOptions, value)).join('; ')],
    ...(answers.impacts.includes('other') && answers.impactDetails?.trim() ? [['Other consequence', answers.impactDetails] as [string, string]] : []),
    ['AI experience', label(aiExperienceOptions, answers.aiExperience)],
    ...(answers.aiExperience !== 'new' ? [['AI barriers', answers.aiBarriers.map(value => label(aiBarrierOptions, value)).join('; ')] as [string, string]] : []),
    ...(answers.currentTools?.trim() ? [['Current tools', answers.currentTools] as [string, string]] : []),
    ['Workflow context', answers.workflowDetails || 'Not provided'],
    ['Investment', label(budgetOptions, answers.budget)],
    ['Timing', label(timingOptions, answers.timing)],
  ]
}
