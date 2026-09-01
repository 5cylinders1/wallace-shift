export const QUIZ_HANDOFF_EVENT = 'wallace-shift:quiz-handoff'

export type QuizHandoffDetail = {
  serviceTitle: string
}

export function dispatchQuizHandoff(detail: QuizHandoffDetail) {
  window.dispatchEvent(
    new CustomEvent<QuizHandoffDetail>(QUIZ_HANDOFF_EVENT, { detail }),
  )
}
