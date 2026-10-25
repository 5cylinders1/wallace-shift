import { forwardRef } from 'react'
import type { ServiceRecommendation } from '../../content/shiftQuiz'
import { shiftQuizCopy } from '../../content/shiftQuiz'
import './QuizResult.css'

type QuizResultProps = {
  recommendation: ServiceRecommendation
  primaryHref: string
  onStartOver: () => void
}

export const QuizResult = forwardRef<HTMLHeadingElement, QuizResultProps>(
  function QuizResult(
    { recommendation, primaryHref, onStartOver },
    headingRef,
  ) {
    return (
      <div className="quiz-result">
        <p className="eyebrow quiz-result__eyebrow">
          {shiftQuizCopy.resultEyebrow.toUpperCase()}
        </p>
        <h3 ref={headingRef} tabIndex={-1} className="quiz-result__title">
          {recommendation.title}
        </h3>
        <p className="quiz-result__description">
          {recommendation.description}
        </p>
        <div className="quiz-result__actions">
          <a
            href={primaryHref}
            className="quiz-result__primary"
          >
            {shiftQuizCopy.primaryCtaLabel}
          </a>
          <button
            type="button"
            className="quiz-result__secondary"
            onClick={onStartOver}
          >
            {shiftQuizCopy.secondaryCtaLabel}
          </button>
        </div>
      </div>
    )
  },
)
