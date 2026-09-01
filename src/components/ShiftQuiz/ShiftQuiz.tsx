import { useCallback, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import {
  getRecommendation,
  quizQuestions,
  shiftQuizCopy,
  type QuizAnswer,
} from '../../content/shiftQuiz'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { dispatchQuizHandoff } from '../../lib/quizHandoff'
import { SpotlightMedia, type SpotlightMediaHandle } from './SpotlightMedia'
import { QuizQuestion } from './QuizQuestion'
import { QuizResult } from './QuizResult'
import './ShiftQuiz.css'

const TOTAL_STEPS = quizQuestions.length

export function ShiftQuiz() {
  const sectionRef = useRef<HTMLElement>(null)
  const quizColRef = useRef<HTMLDivElement>(null)
  const questionWrapRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const mediaRef = useRef<SpotlightMediaHandle>(null)
  const isFirstStepRender = useRef(true)

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<(QuizAnswer | null)[]>([
    null,
    null,
    null,
  ])
  const [announcement, setAnnouncement] = useState('')

  const reducedMotion = useReducedMotion()
  const isResult = step >= TOTAL_STEPS

  // The rect the spotlight's Y position is normalized against — the
  // answer buttons themselves, not the whole section (which is mostly
  // heading/intro copy above them). Normalizing against the full section
  // pushed every answer into the bottom half of the aim range; this way
  // the first, topmost answer reads as aiming up and the last as aiming
  // down, matching how a stacked list actually reads. Re-queried live
  // since the answers remount each quiz step.
  const getAnswerBounds = useCallback((): DOMRect | null => {
    const quizCol = quizColRef.current
    if (!quizCol) return null
    const buttons = Array.from(quizCol.querySelectorAll<HTMLElement>('[data-answer-index]'))
    if (buttons.length === 0) return null
    const rects = buttons.map((button) => button.getBoundingClientRect())
    const top = Math.min(...rects.map((rect) => rect.top))
    const bottom = Math.max(...rects.map((rect) => rect.bottom))
    return new DOMRect(0, top, 0, bottom - top)
  }, [])

  // Keyboard-focus controller: aims the light at whichever answer button
  // receives focus, using the exact same section-relative mapping that
  // SpotlightMedia's own live pointer tracking uses internally (see its
  // `aimAtClientY`), so tabbing through answers matches hovering them.
  // Live pointer tracking itself lives entirely inside SpotlightMedia —
  // this effect only needs to cover the case pointer events can't: focus.
  // Re-attached whenever the visible step changes since the answer buttons
  // are freshly mounted each time.
  useGSAP(
    () => {
      const section = sectionRef.current
      const quizCol = quizColRef.current
      if (!section || !quizCol || reducedMotion || isResult) return

      const handleFocusIn = (event: FocusEvent) => {
        const target = event.target as HTMLElement
        const buttonEl = target.closest?.('[data-answer-index]')
        if (buttonEl && quizCol.contains(buttonEl)) {
          const rect = buttonEl.getBoundingClientRect()
          mediaRef.current?.aimAtClientY(rect.top + rect.height / 2)
        }
      }

      const handleFocusOut = (event: FocusEvent) => {
        const related = event.relatedTarget as HTMLElement | null
        const stillOnAnswer =
          related &&
          quizCol.contains(related) &&
          related.closest('[data-answer-index]')
        if (!stillOnAnswer) {
          mediaRef.current?.resetToNeutral()
        }
      }

      section.addEventListener('focusin', handleFocusIn)
      section.addEventListener('focusout', handleFocusOut)

      return () => {
        section.removeEventListener('focusin', handleFocusIn)
        section.removeEventListener('focusout', handleFocusOut)
      }
    },
    { scope: sectionRef, dependencies: [reducedMotion, step, isResult] },
  )

  // Entrance animation + focus + announcement whenever the visible step changes.
  useGSAP(
    () => {
      if (isFirstStepRender.current) {
        isFirstStepRender.current = false
        return () => {
          // Undo the flag flip so React StrictMode's dev-only double-invoke
          // (mount -> cleanup -> mount) still treats the real first render
          // as "first" the second time through, instead of skipping straight
          // to the focus()-driven scroll below on initial page load.
          isFirstStepRender.current = true
        }
      }

      const wrap = questionWrapRef.current

      const message = isResult
        ? `Your recommendation: ${getRecommendation(answers).title}`
        : `Question ${step + 1} of ${TOTAL_STEPS}: ${quizQuestions[step].question}`
      setAnnouncement(message)

      if (!wrap || reducedMotion) {
        headingRef.current?.focus()
        return
      }

      gsap.fromTo(
        wrap,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          ease: 'power2.out',
          onComplete: () => headingRef.current?.focus(),
        },
      )
    },
    { scope: sectionRef, dependencies: [step] },
  )

  const transitionToStep = useCallback(
    (next: number, onSwap?: () => void) => {
      const wrap = questionWrapRef.current

      if (!wrap || reducedMotion) {
        onSwap?.()
        setStep(next)
        return
      }

      gsap.to(wrap, {
        opacity: 0,
        y: -16,
        duration: 0.22,
        ease: 'power2.out',
        onComplete: () => {
          onSwap?.()
          setStep(next)
        },
      })
    },
    [reducedMotion],
  )

  const handleSelect = (answer: QuizAnswer) => {
    // No explicit aim call needed here — whatever pointed at or focused
    // this button already aimed the light at it (live pointer tracking or
    // the focus controller above), and selecting it doesn't move either.
    window.setTimeout(() => {
      transitionToStep(step + 1, () => {
        setAnswers((prev) => {
          const next = [...prev]
          next[step] = answer
          return next
        })
      })
    }, 260)
  }

  const handleBack = () => {
    transitionToStep(step - 1)
  }

  const handleStartOver = () => {
    transitionToStep(0, () => {
      setAnswers([null, null, null])
    })
    mediaRef.current?.resetToNeutral()
  }

  const handlePrimaryCta = () => {
    const recommendation = getRecommendation(answers)
    dispatchQuizHandoff({ serviceTitle: recommendation.title })
    document
      .getElementById('contact')
      ?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
  }

  return (
    <section id="shift-finder" className="shift-quiz" ref={sectionRef}>
      <div className="shift-quiz__media">
        <SpotlightMedia ref={mediaRef} listenRef={sectionRef} getBoundsRect={getAnswerBounds} />
        <div className="shift-quiz__scrim" />
      </div>

      <div className="container shift-quiz__content">
        <div className="shift-quiz__quiz-col" ref={quizColRef}>
          <img
            src="/brand/wallace-shift-logo-white.svg"
            alt=""
            className="shift-quiz__mark"
            width={28}
            height={17}
          />

          <div className="shift-quiz__intro">
            <p className="eyebrow shift-quiz__eyebrow">
              {shiftQuizCopy.eyebrow.toUpperCase()}
            </p>
            <h2 className="shift-quiz__headline">
              {shiftQuizCopy.headline.toUpperCase()}
            </h2>
            <p className="shift-quiz__supporting">
              {shiftQuizCopy.supporting}
            </p>
          </div>

          <div className="shift-quiz__question-wrap" ref={questionWrapRef}>
            {isResult ? (
              <QuizResult
                ref={headingRef}
                recommendation={getRecommendation(answers)}
                onPrimaryCta={handlePrimaryCta}
                onStartOver={handleStartOver}
              />
            ) : (
              <QuizQuestion
                ref={headingRef}
                data={quizQuestions[step]}
                stepIndex={step}
                totalSteps={TOTAL_STEPS}
                onSelect={handleSelect}
                onBack={step > 0 ? handleBack : undefined}
              />
            )}
          </div>
        </div>
      </div>

      <p role="status" aria-live="polite" className="visually-hidden">
        {announcement}
      </p>
    </section>
  )
}
