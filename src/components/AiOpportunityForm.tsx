import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  aiOffer, aiPackages, aiBarrierOptions, aiExperienceOptions, approverOptions, budgetOptions,
  impactOptions, qualificationSteps, recommendAiOpportunity, revenueOptions, roleOptions,
  timingOptions, weeklyHoursOptions, workflowOptions,
} from '../content/aiOffer'
import {
  createAiOpportunityPayload, initialAiOpportunityValues, normalizeAiOpportunity, submitAiOpportunity, validateAiOpportunity,
  type AiOpportunityErrors, type AiOpportunityFormValues, type AiOpportunityResult,
} from '../lib/aiOpportunityAdapter'
import { trackSiteEvent } from '../lib/analytics'
import { useQuizQuestionMotion } from '../hooks/useQuizQuestionMotion'
import { PageLink } from './PageLink/PageLink'
import type { AiNextStepSelection } from './AiOpportunityRecommendation'
import { AiConsultationBooking } from './AiConsultationBooking'
import { aiConsultation } from '../content/aiConsultation'

type ChoiceField = 'role' | 'approverAvailability' | 'revenue' | 'weeklyHours' | 'aiExperience' | 'budget' | 'timing'
type MultipleField = 'workflows' | 'impacts' | 'aiBarriers'
type FailureReason = Extract<AiOpportunityResult, { ok: false }>['reason']
type Phase = 'quiz' | 'result' | 'contact' | 'booking'
type QuizQuestion = {
  field: ChoiceField | MultipleField | 'currentTools' | 'workflowDetails'
  heading: string
  description: string
  advanceHint?: string
}

function quizQuestions(step: typeof qualificationSteps[number], values: AiOpportunityFormValues): QuizQuestion[] {
  const first = (field: QuizQuestion['field'], advanceHint?: string): QuizQuestion => ({ field, heading: step.heading, description: step.description, advanceHint })
  switch (step.id) {
    case 'bottleneck': return [first('workflows')]
    case 'authority': return [
      first('role', 'Some answers open a follow up question.'),
      ...(values.role === 'joint' || values.role === 'researching' ? [{
        field: 'approverAvailability' as const,
        heading: 'Could the person who approves the purchase join a conversation?',
        description: 'This helps us involve the right people before discussing a project.',
      }] : []),
    ]
    case 'business': return [first('revenue')]
    case 'impact': return [
      { ...first('weeklyHours', 'Selecting an estimate opens the next question.'), heading: 'About how many hours do these issues take up across your team each week?' },
      { field: 'impacts', heading: 'What happens because of these challenges?', description: 'Select the consequences your team experiences. Choose up to two.' },
    ]
    case 'experience': return [
      first('aiExperience', 'Some answers open a follow up question.'),
      ...(values.aiExperience && values.aiExperience !== 'new' ? [{
        field: 'aiBarriers' as const,
        heading: values.aiExperience === 'established' ? 'What is still getting in the way?' : 'What has made it difficult to put AI to work?',
        description: 'Choose up to two. Uncheck an answer to choose another.',
      }] : []),
    ]
    case 'tools': return [
      { field: 'currentTools', heading: 'Which tools does your team use?', description: 'This is optional. We check integration access and compatibility before confirming any project.' },
      { field: 'workflowDetails', heading: 'Anything else we should understand about the work?', description: 'This is optional. A recent example is useful. Please leave out passwords and private customer information.' },
    ]
    case 'readiness': return [
      { ...first('budget', 'Selecting an answer opens the next question.'), heading: 'If we identify a suitable solution, could your business invest $2,500 or more to implement it?' },
      { field: 'timing', heading: 'When would you like to make a change?', description: 'Choose the timing that best fits your plans.' },
    ]
  }
}

const failureMessages: Record<FailureReason, string> = {
  not_configured: 'This draft is not accepting requests yet. Your answers are still here. You can contact Wallace Shift directly to discuss your project.',
  invalid: 'We could not accept these details. Please check your answers and contact information, then try again.',
  offer_changed: 'The offer details have changed since this page was loaded. Please keep a copy of your answers and refresh the page before applying.',
  submission_conflict: 'We could not confirm this version of your request. Your answers are still here. Please contact us so we can check it before you submit again.',
  rate_limited: 'There have been too many requests in a short time. Your answers are still here. Please try again in an hour, or contact us directly.',
  unavailable: 'We could not confirm that your request was saved. Your answers are still here. Try again with the same details, or contact us directly.',
}

function Field({ name, label, error, children, hideLabel = false }: {
  name: keyof AiOpportunityFormValues; label: string; error?: string; children: ReactNode; hideLabel?: boolean
}) {
  return <div className="ao-field ao-field--wide">
    <label className={hideLabel ? 'visually-hidden' : undefined} htmlFor={`ao-${name}`}>{label}</label>
    {children}
    {error && <p className="ao-field__error" id={`ao-${name}-error`}>{error}</p>}
  </div>
}

export function AiOpportunityForm({ renderRecommendation, onPhaseChange }: {
  renderRecommendation: (values: AiOpportunityFormValues, onRequestContact: (selection: AiNextStepSelection) => void) => ReactNode
  onPhaseChange: (phase: Phase | 'success') => void
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('quiz')
  const [partIndex, setPartIndex] = useState(0)
  const [values, setValues] = useState<AiOpportunityFormValues>(() => ({ ...initialAiOpportunityValues, workflows: [], impacts: [], aiBarriers: [] }))
  const [errors, setErrors] = useState<AiOpportunityErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [failure, setFailure] = useState<FailureReason | null>(null)
  const [success, setSuccess] = useState<Extract<AiOpportunityResult, { ok: true }> | null>(null)
  const [savedAnswers, setSavedAnswers] = useState<AiOpportunityFormValues | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const failureRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const started = useRef(false)
  const arrowSelection = useRef(false)
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const lastFocusedStep = useRef('quiz-0-workflows')
  const step = qualificationSteps[stepIndex]
  const questions = quizQuestions(step, values)
  const currentPart = Math.min(partIndex, questions.length - 1)
  const question = questions[currentPart]
  const hasNextPart = currentPart < questions.length - 1
  const questionKey = `${phase}-${stepIndex}-${question.field}`
  const { panelRef, leaving, isLocked, transition, onPointerDownCapture, onKeyDownCapture } = useQuizQuestionMotion(questionKey, scrollRef)
  const selectedPackage = values.packageId ? aiPackages[values.packageId] : null
  const isPackage = values.nextStep === 'package'
  const emailOptional = !isPackage && values.contactMethod === 'call'
  const isGoogleMeeting = !isPackage && values.contactMethod === 'email'
  const questionHeading = phase === 'contact' ? isPackage ? `Start with ${selectedPackage?.name}.` : isGoogleMeeting ? 'Send your quiz answers.' : 'Plan your free consultation.' : question.heading
  const questionDescription = phase === 'contact' ? isPackage
    ? 'Send us your chosen package and quiz answers. We will confirm compatibility, delivery timing, and the agreement before you pay.'
    : isGoogleMeeting ? 'Use the same email address as your Google booking so we can match your answers to your consultation. Sending these details does not book an appointment.'
    : `Share your details to arrange a free ${aiConsultation.durationMinutes} minute phone call. Your quiz answers are included, so you do not have to start over.`
    : question.description
  const submitLabel = isPackage ? 'Request this package' : isGoogleMeeting ? 'Send answers' : 'Request consultation'
  const QuestionHeading = phase === 'contact' ? 'h1' : 'h2'
  const recommendation = recommendAiOpportunity(values)

  useEffect(() => { onPhaseChange(success ? 'success' : phase) }, [phase, success, onPhaseChange])

  useLayoutEffect(() => {
    if (lastFocusedStep.current === questionKey) return
    lastFocusedStep.current = questionKey
    if (phase === 'result') {
      resultRef.current?.focus({ preventScroll: true })
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    else {
      headingRef.current?.focus({ preventScroll: true })
    }
  }, [questionKey, phase])
  useEffect(() => { if (success) resultRef.current?.focus() }, [success])
  useEffect(() => { if (failure) failureRef.current?.focus() }, [failure])

  function start() {
    if (started.current) return
    started.current = true
    trackSiteEvent({ name: 'offer_application_start' })
  }

  function update<K extends keyof AiOpportunityFormValues>(key: K, value: AiOpportunityFormValues[K]) {
    if (isLocked()) return
    setValues(previous => {
      const next = { ...previous, [key]: value }
      if (key === 'role' && previous.role !== value) next.approverAvailability = ''
      if (key === 'aiExperience' && previous.aiExperience !== value) next.aiBarriers = []
      if (phase === 'quiz') next.offerAcknowledged = false
      return normalizeAiOpportunity(next)
    })
    setErrors(previous => ({
      ...previous,
      [key]: undefined,
      ...(key === 'role' ? { approverAvailability: undefined } : {}),
      ...(key === 'aiExperience' ? { aiBarriers: undefined } : {}),
      ...(key === 'contactMethod' ? { phone: undefined, email: undefined } : {}),
    }))
    setFailure(null)
    setSubmissionId(null)
  }

  function toggle(name: MultipleField, value: string) {
    const previous = values[name] as readonly string[]
    let next: string[]
    if (previous.includes(value)) next = previous.filter(item => item !== value)
    else if ((name === 'workflows' || name === 'impacts') && value === 'not_sure') next = ['not_sure']
    else {
      const base = name === 'workflows' || name === 'impacts' ? previous.filter(item => item !== 'not_sure') : previous
      if (name !== 'workflows' && base.length >= 2) return
      next = [...base, value]
    }
    update(name, next as AiOpportunityFormValues[typeof name])
  }

  function focusFirstError(nextErrors: AiOpportunityErrors) {
    const key = Object.keys(nextErrors)[0]
    if (!key) return
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`#ao-${key}`)?.focus())
  }

  function moveTo(index: number, part = 0, immediate = false) {
    const direction = index < stepIndex || (index === stepIndex && part < currentPart) ? -1 : 1
    transition(() => {
      setErrors({})
      setFailure(null)
      setPhase('quiz')
      setStepIndex(index)
      setPartIndex(part)
    }, direction, immediate || phase !== 'quiz')
  }

  function confirmChoice(name: ChoiceField, value: string) {
    // Use the new selection because conditional questions may change before state renders.
    const nextValues = { ...values, [name]: value } as AiOpportunityFormValues
    if (currentPart < quizQuestions(step, nextValues).length - 1) {
      moveTo(stepIndex, currentPart + 1)
    }
  }

  function goBack() {
    if (currentPart > 0) moveTo(stepIndex, currentPart - 1)
    else {
      const previousStep = stepIndex - 1
      moveTo(previousStep, quizQuestions(qualificationSteps[previousStep], values).length - 1)
    }
  }

  function showQuizErrors(index: number, nextErrors: AiOpportunityErrors) {
    const invalidPart = quizQuestions(qualificationSteps[index], values).findIndex(item => nextErrors[item.field])
    moveTo(index, Math.max(0, invalidPart), true)
    setErrors(nextErrors)
    focusFirstError(nextErrors)
  }

  function showContact(selection: AiNextStepSelection, openCalendar = true) {
    setValues(previous => normalizeAiOpportunity({ ...previous, ...selection }))
    // Returning to the same request must retain the key if an earlier response was lost.
    if (selection.nextStep !== values.nextStep || selection.packageId !== values.packageId || selection.contactMethod !== values.contactMethod) setSubmissionId(null)
    setErrors({})
    setFailure(null)
    setSuccess(null)
    const shouldBook = openCalendar && selection.nextStep === 'consultation' && selection.contactMethod === 'email'
    setPhase(shouldBook ? 'booking' : 'contact')
    if (!shouldBook) trackSiteEvent({ name: 'offer_application_step', value: 'contact' })
  }

  function showResult() {
    setErrors({})
    setFailure(null)
    setSuccess(null)
    setPhase('result')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting || isLocked()) return
    const normalized = normalizeAiOpportunity(values)
    const nextErrors = validateAiOpportunity(normalized, phase === 'contact' ? 'contact' : step.id)
    if (phase === 'quiz') {
      const currentErrors = nextErrors[question.field] ? { [question.field]: nextErrors[question.field] } : {}
      setErrors(currentErrors)
      if (Object.keys(currentErrors).length) { focusFirstError(currentErrors); return }
      if (hasNextPart) { moveTo(stepIndex, currentPart + 1); return }
      if (Object.keys(nextErrors).length) { showQuizErrors(stepIndex, nextErrors); return }
      trackSiteEvent({ name: 'offer_application_step', value: step.id })
      if (stepIndex < qualificationSteps.length - 1) { moveTo(stepIndex + 1); return }
      const invalidStep = qualificationSteps.findIndex(item => Object.keys(validateAiOpportunity(normalized, item.id)).length)
      if (invalidStep !== -1) {
        const invalidErrors = validateAiOpportunity(normalized, qualificationSteps[invalidStep].id)
        showQuizErrors(invalidStep, invalidErrors)
        return
      }
      setValues(normalized)
      showResult()
      const nextRecommendation = recommendAiOpportunity(normalized)
      trackSiteEvent({ name: 'offer_recommendation_view', value: nextRecommendation.kind === 'preparation' ? 'resource' : nextRecommendation.kind })
      return
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) { focusFirstError(nextErrors); return }
    const allErrors = validateAiOpportunity(normalized)
    if (Object.keys(allErrors).length) {
      const invalidStep = qualificationSteps.findIndex(item => Object.keys(validateAiOpportunity(normalized, item.id)).length)
      if (invalidStep !== -1) showQuizErrors(invalidStep, validateAiOpportunity(normalized, qualificationSteps[invalidStep].id))
      else { setErrors(allErrors); focusFirstError(allErrors) }
      return
    }

    setSubmitting(true)
    setFailure(null)
    try {
      const requestId = submissionId ?? crypto.randomUUID()
      setSubmissionId(requestId)
      const result = await submitAiOpportunity(createAiOpportunityPayload(normalized, requestId))
      if (result.ok) {
        setSavedAnswers(normalized)
        setSuccess(result)
        trackSiteEvent({ name: 'offer_application_submit' })
      } else setFailure(result.reason)
    } catch { setFailure('unavailable') }
    finally { setSubmitting(false) }
  }

  function attrs(name: keyof AiOpportunityFormValues) {
    return { id: `ao-${name}`, name, 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `ao-${name}-error` : undefined }
  }

  function choices(name: ChoiceField, label: string, options: readonly { value: string; label: string }[], headingQuestion = false, advanceOnSelect = false) {
    return <fieldset className="qf-choice-group" aria-describedby={errors[name] ? `ao-${name}-error` : undefined}>
      <legend className={headingQuestion ? 'visually-hidden' : 'qf-question-label'}>{label}</legend>
      <div className="qf-choice-grid">
        {options.map((option, index) => <label className={`qf-choice${values[name] === option.value ? ' is-selected' : ''}`} key={option.value}>
          <input className="qf-choice__control" type="radio" name={name} id={index === 0 ? `ao-${name}` : `ao-${name}-${option.value}`} value={option.value} checked={values[name] === option.value} onChange={() => update(name, option.value as AiOpportunityFormValues[typeof name])} onPointerDown={advanceOnSelect ? () => { arrowSelection.current = false } : undefined} onClick={advanceOnSelect ? () => {
            // Browsers can synthesize clicks when arrow keys move between radio options.
            if (!arrowSelection.current) {
              // React can dispatch click before change. Record the answer before locking exit.
              update(name, option.value as AiOpportunityFormValues[typeof name])
              confirmChoice(name, option.value)
            }
            arrowSelection.current = false
          } : undefined} onKeyUp={advanceOnSelect ? () => { arrowSelection.current = false } : undefined} onKeyDown={advanceOnSelect ? event => {
            arrowSelection.current = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            update(name, option.value as AiOpportunityFormValues[typeof name])
            confirmChoice(name, option.value)
          } : undefined} aria-invalid={Boolean(errors[name])} aria-describedby={[advanceOnSelect ? 'ao-question-advance' : '', errors[name] ? `ao-${name}-error` : ''].filter(Boolean).join(' ') || undefined} />
          <span className="qf-choice__label">{option.label}</span>
        </label>)}
      </div>
      {errors[name] && <p className="ao-field__error" id={`ao-${name}-error`}>{errors[name]}</p>}
    </fieldset>
  }

  function multiple(name: MultipleField, label: string, options: readonly { value: string; label: string }[], headingQuestion = false) {
    const selected = values[name] as readonly string[]
    return <fieldset className="qf-choice-group" aria-describedby={`ao-${name}-hint${errors[name] ? ` ao-${name}-error` : ''}`}>
      <legend className={headingQuestion ? 'visually-hidden' : 'qf-question-label'}>{label}</legend>
      <p className={headingQuestion ? 'visually-hidden' : 'ao-form__hint'} id={`ao-${name}-hint`}>{name === 'workflows' ? 'Select all that apply. Choose “I am not sure yet” on its own.' : 'Choose up to two. Uncheck an answer to choose another.'}</p>
      <div className="qf-choice-grid">
        {options.map((option, index) => <label className={`qf-choice${selected.includes(option.value) ? ' is-selected' : ''}`} key={option.value}>
          <input className="qf-choice__control" type="checkbox" name={name} id={index === 0 ? `ao-${name}` : `ao-${name}-${option.value}`} checked={selected.includes(option.value)} onChange={() => toggle(name, option.value)} disabled={name !== 'workflows' && !selected.includes(option.value) && selected.length >= 2 && option.value !== 'not_sure'} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `ao-${name}-error` : undefined} />
          <span className="qf-choice__label">{option.label}</span>
        </label>)}
      </div>
      {errors[name] && <p className="ao-field__error" id={`ao-${name}-error`}>{errors[name]}</p>}
    </fieldset>
  }

  if (phase === 'booking' || (success && isGoogleMeeting)) return <AiConsultationBooking
    answersSaved={savedAnswers !== null && JSON.stringify(savedAnswers) === JSON.stringify(normalizeAiOpportunity(values))}
    onSendAnswers={() => showContact({ nextStep: 'consultation', packageId: '', contactMethod: 'email' }, false)}
    onBack={showResult}
    onRequestPhone={() => showContact({ nextStep: 'consultation', packageId: '', contactMethod: 'call' })}
  />

  if (success) return <div className="ao-form ao-form__success" ref={resultRef} tabIndex={-1} role="status">
    <h1>{isPackage ? 'Your package request is saved.' : 'Your consultation request is saved.'}</h1>
    <p>{isPackage ? `We will email you about ${selectedPackage?.name} to confirm the scope, compatibility, and agreement before payment.` : `We will call you to arrange your free ${aiConsultation.durationMinutes} minute consultation.`}</p>
    <p>{isPackage ? 'No payment has been taken or delivery slot reserved.' : 'Your answers are attached to your request. An appointment is confirmed once we agree on a time with you.'}</p>
    <PageLink className="ao-button ao-button--secondary" href="/approach">How Wallace Shift works</PageLink>
  </div>

  if (phase === 'result') return <div className="qf-result-shell" ref={resultRef} tabIndex={-1}>
    {renderRecommendation(values, showContact)}
    <div className="qf-result-actions"><button className="ao-button ao-button--secondary" type="button" onClick={() => moveTo(0)}>Edit my answers</button></div>
  </div>

  return <form className={`ao-form qf-form-layout${phase === 'contact' ? ' qf-contact' : ''}`} ref={formRef} onSubmit={handleSubmit} onFocusCapture={start} onPointerDownCapture={onPointerDownCapture} onKeyDownCapture={onKeyDownCapture} noValidate aria-labelledby="ao-form-heading" aria-busy={submitting}>
    {phase === 'quiz' && <div className="qf-progress"><span>Step {stepIndex + 1} of {qualificationSteps.length}</span><span>{step.label}{questions.length > 1 && ` · Part ${currentPart + 1} of ${questions.length}`}</span><progress value={stepIndex + 1} max={qualificationSteps.length} aria-label={`Quiz progress: step ${stepIndex + 1} of ${qualificationSteps.length}`} /></div>}
    <div className="qf-scroll-region" ref={scrollRef} role="region" aria-label="Question and answers" tabIndex={0}>
    <div key={questionKey} ref={panelRef} className={phase === 'quiz' ? 'qf-question-panel' : undefined} inert={leaving}>
    <div className="qf-question-copy">
    <QuestionHeading className="qf-stepheading" id="ao-form-heading" ref={headingRef} tabIndex={-1}>{questionHeading}</QuestionHeading>
    <p className="ao-form__hint">{questionDescription}</p>
    {phase === 'quiz' && question.advanceHint && <p className="ao-form__hint" id="ao-question-advance">{question.advanceHint}</p>}
    </div>
    {Object.values(errors).some(Boolean) && <p className="ao-form__notice" role="alert">Please check the highlighted answers before continuing.</p>}
    <fieldset disabled={submitting}>
      <legend className="visually-hidden">{phase === 'contact' ? 'Contact details' : step.label}</legend>
      <div className="qf-fields">
        {phase === 'quiz' && <>
          {question.field === 'workflows' && multiple('workflows', questionHeading, workflowOptions, true)}
          {question.field === 'role' && choices('role', questionHeading, roleOptions, true, true)}
          {question.field === 'approverAvailability' && choices('approverAvailability', questionHeading, approverOptions, true)}
          {question.field === 'revenue' && choices('revenue', questionHeading, revenueOptions, true)}
          {question.field === 'weeklyHours' && choices('weeklyHours', questionHeading, weeklyHoursOptions, true, true)}
          {question.field === 'impacts' && multiple('impacts', questionHeading, impactOptions, true)}
          {question.field === 'aiExperience' && choices('aiExperience', questionHeading, aiExperienceOptions, true, true)}
          {question.field === 'aiBarriers' && multiple('aiBarriers', questionHeading, aiBarrierOptions, true)}
          {question.field === 'currentTools' && <Field name="currentTools" label="Which tools does your team use? (optional)" error={errors.currentTools} hideLabel><input {...attrs('currentTools')} value={values.currentTools} onChange={event => update('currentTools', event.target.value)} maxLength={500} placeholder="Email, CRM, spreadsheets, or other software" autoComplete="off" /></Field>}
          {question.field === 'workflowDetails' && <Field name="workflowDetails" label="Anything else we should understand about the work? (optional)" error={errors.workflowDetails} hideLabel><textarea {...attrs('workflowDetails')} value={values.workflowDetails} onChange={event => update('workflowDetails', event.target.value)} maxLength={1500} rows={3} placeholder="A recent example is useful. Please leave out passwords and private customer information." /></Field>}
          {question.field === 'budget' && choices('budget', questionHeading, budgetOptions, true, true)}
          {question.field === 'timing' && choices('timing', questionHeading, timingOptions, true)}
        </>}
        {phase === 'contact' && <>
          {isPackage && selectedPackage && <div className="qf-selected-package"><strong>{selectedPackage.name}</strong><span>${selectedPackage.price.toLocaleString('en-US')}</span><p>Proposed implementation price. Includes the free website when the project qualifies. Final scope and separate costs are confirmed before purchase.</p></div>}
          {!isPackage && <Field name="contactMethod" label="Consultation format" error={errors.contactMethod}><select {...attrs('contactMethod')} value={values.contactMethod} onChange={event => update('contactMethod', event.target.value as 'email' | 'call')}><option value="email">Google Meet</option><option value="call">Phone call, no email needed</option></select></Field>}
          <Field name="name" label="Your name" error={errors.name}><input {...attrs('name')} value={values.name} onChange={event => update('name', event.target.value)} maxLength={120} autoComplete="name" required /></Field>
          <Field name="businessName" label="Business name" error={errors.businessName}><input {...attrs('businessName')} value={values.businessName} onChange={event => update('businessName', event.target.value)} maxLength={160} autoComplete="organization" required /></Field>
          <Field name="businessType" label="What does your business do? (optional)" error={errors.businessType}><input {...attrs('businessType')} value={values.businessType} onChange={event => update('businessType', event.target.value)} maxLength={120} autoComplete="off" placeholder="For example, accounting or home services" /></Field>
          {values.contactMethod === 'call' && <Field name="phone" label="Phone number" error={errors.phone}><input {...attrs('phone')} value={values.phone} onChange={event => update('phone', event.target.value)} type="tel" inputMode="tel" maxLength={40} autoComplete="tel" required /></Field>}
          <Field name="email" label={emailOptional ? 'Email address (optional)' : 'Email address'} error={errors.email}><input {...attrs('email')} value={values.email} onChange={event => update('email', event.target.value)} type="email" maxLength={254} autoComplete="email" inputMode="email" required={!emailOptional} /></Field>
          <Field name="website" label="Website (optional)" error={errors.website}><input {...attrs('website')} value={values.website} onChange={event => update('website', event.target.value)} type="url" maxLength={300} autoComplete="url" inputMode="url" placeholder="https://example.com" /></Field>
          {recommendation.route !== 'resource' && <div className="ao-field ao-field--wide"><label className="ao-check" htmlFor="ao-offerAcknowledged"><input {...attrs('offerAcknowledged')} type="checkbox" checked={values.offerAcknowledged} onChange={event => update('offerAcknowledged', event.target.checked)} required /><span>I understand the website offer requires a qualifying paid project of ${aiOffer.minimumProjectFee.toLocaleString('en-US')} or more. Scope, final price, compatibility, and separate software or hosting costs must be confirmed before I commit.</span></label>{errors.offerAcknowledged && <p className="ao-field__error" id="ao-offerAcknowledged-error">{errors.offerAcknowledged}</p>}</div>}
          <div className="ao-field ao-field--wide"><label className="ao-check" htmlFor="ao-contactConsent"><input {...attrs('contactConsent')} type="checkbox" checked={values.contactConsent} onChange={event => update('contactConsent', event.target.checked)} required /><span>Please contact me about this request. I understand how my details are used, as explained in the <a href="/privacy" target="_blank" rel="noopener noreferrer">privacy policy (opens in a new tab)</a>.</span></label>{errors.contactConsent && <p className="ao-field__error" id="ao-contactConsent-error">{errors.contactConsent}</p>}</div>
        </>}
      </div>
      <div className="visually-hidden" aria-hidden="true"><label htmlFor="ao-company">Leave this field empty</label><input id="ao-company" name="company" tabIndex={-1} autoComplete="off" value={values.company} onChange={event => update('company', event.target.value)} maxLength={200} /></div>
      {failure && <div className="ao-form__notice" ref={failureRef} tabIndex={-1} role="alert"><p>{failureMessages[failure]}</p><PageLink href="/contact">Contact Wallace Shift</PageLink></div>}
    </fieldset>
    </div>
    <p className="ao-form__hint qf-local-note">{phase === 'contact' ? `Your details are sent only when you select ${submitLabel}. ${isPackage ? 'This is a request, not a purchase.' : isGoogleMeeting ? 'Complete your booking separately in Google Calendar.' : 'We will confirm the time with you before it is booked.'}` : 'Your answers stay in this browser tab. No email is needed to see your recommendation.'}</p>
    </div>
    <div className="ao-form__actions qf-action-dock">
      {phase === 'contact' ? <button className="ao-button ao-button--secondary" type="button" onClick={isGoogleMeeting ? () => showContact({ nextStep: 'consultation', packageId: '', contactMethod: 'email' }) : showResult} disabled={submitting} aria-label={isGoogleMeeting ? 'Back to calendar' : 'Back to next steps'}>Back</button> : (stepIndex > 0 || currentPart > 0) && <button className="ao-button ao-button--secondary" type="button" onClick={goBack} disabled={submitting} aria-disabled={leaving || undefined} aria-label={currentPart > 0 ? 'Back to previous question' : undefined}>Back</button>}
      <button className="ao-button" type="submit" disabled={submitting} aria-disabled={leaving || undefined}>{submitting ? 'Saving your request…' : phase === 'contact' ? submitLabel : hasNextPart ? 'Next question' : stepIndex < qualificationSteps.length - 1 ? 'Continue' : 'See my next steps'}</button>
    </div>
  </form>
}
