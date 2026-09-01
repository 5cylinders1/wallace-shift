import { forwardRef } from 'react'
import type { QuizAnswer, QuizQuestionData } from '../../content/shiftQuiz'
import { shiftQuizCopy } from '../../content/shiftQuiz'
import './QuizQuestion.css'

type QuizQuestionProps = {
  data: QuizQuestionData
  stepIndex: number
  totalSteps: number
  onSelect: (answer: QuizAnswer, index: number) => void
  onBack?: () => void
}

export const QuizQuestion = forwardRef<HTMLHeadingElement, QuizQuestionProps>(
  function QuizQuestion(
    { data, stepIndex, totalSteps, onSelect, onBack },
    headingRef,
  ) {
    const stepLabel = `0${stepIndex + 1} / 0${totalSteps}`
    const progressPercent = ((stepIndex + 1) / totalSteps) * 100

    return (
      <div className="quiz-question">
        <div className="quiz-question__progress-row">
          <span className="quiz-question__step-label">{stepLabel}</span>
        </div>
        <div className="quiz-question__progress-rule">
          <span
            className="quiz-question__progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <h3 ref={headingRef} tabIndex={-1} className="quiz-question__heading">
          {data.question}
        </h3>

        <div
          className="quiz-question__answers"
          role="group"
          aria-label={data.question}
        >
          {data.answers.map((answer, index) => (
            <button
              key={answer.id}
              type="button"
              className="quiz-question__answer"
              data-answer-index={index}
              onClick={() => onSelect(answer, index)}
            >
              {answer.label}
            </button>
          ))}
        </div>

        <div className="quiz-question__footer">
          <span className="quiz-question__choose-one">
            {shiftQuizCopy.chooseOneLabel.toUpperCase()}
          </span>
          {onBack && (
            <button
              type="button"
              className="quiz-question__back"
              onClick={onBack}
            >
              {shiftQuizCopy.backLabel}
            </button>
          )}
        </div>
      </div>
    )
  },
)
