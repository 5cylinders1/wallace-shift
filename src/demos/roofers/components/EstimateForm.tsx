import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { money } from '../pricing'
import { brand } from '../brand'
import { estimate, WALLACE_SHIFT_CONTACT_URL } from '../content'
import {
  BEST_TIMES,
  EMPTY_ANSWERS,
  INSURANCE,
  ISSUES,
  OWNERSHIP,
  PAYMENT,
  PROPERTIES,
  ROOF_AGES,
  STORM_DATES,
  TIMELINES,
  asksStormDate,
  fieldError,
  scoreLead,
  stepFields,
  type FieldName,
  type LeadAnswers,
  type LeadContext,
} from '../lead'
import { submitLead, type LeadResult, type LeadSubmission } from '../leadAdapter'
import type { RoofAddress } from '../roof/types'
import { LeadCard } from './LeadCard'
import { Segmented } from './Segmented'
import './EstimateForm.css'

const STEP_TITLES = ['The roof', 'Insurance & payment', 'Timing', 'Your details'] as const

type Status = 'editing' | 'sending' | { result: LeadResult; lead: LeadSubmission }

interface EstimateFormProps {
  context: LeadContext
  /** The address the visitor priced their roof at, to save retyping it. */
  prefill: RoofAddress | null
}

export function EstimateForm({ context, prefill }: EstimateFormProps) {
  const [answers, setAnswers] = useState<LeadAnswers>(EMPTY_ANSWERS)
  const [step, setStep] = useState(0)
  const [showErrors, setShowErrors] = useState(false)
  const [status, setStatus] = useState<Status>('editing')
  const formRef = useRef<HTMLFormElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const movedRef = useRef(false)
  const ids = { name: useId(), phone: useId(), email: useId(), street: useId(), zip: useId(), best: useId(), notes: useId() }

  // Fill the street and ZIP from the roof tool. A field still holding the
  // last address the tool filled follows a new lookup; anything typed stays.
  const [prefilled, setPrefilled] = useState<RoofAddress | null>(null)
  if (prefill && prefill !== prefilled) {
    setPrefilled(prefill)
    const follow = (current: string, previous: string | null | undefined, next: string | null) =>
      !current || current === (previous ?? '') ? (next ?? '') : current
    setAnswers((current) => ({
      ...current,
      street: follow(current.street, prefilled?.street, prefill.street),
      zip: follow(current.zip, prefilled?.zip, prefill.zip),
    }))
  }

  const set = <K extends FieldName>(field: K, value: LeadAnswers[K]) =>
    setAnswers((current) => ({ ...current, [field]: value }))

  const fields = stepFields(step, answers)
  const errors = Object.fromEntries(fields.map((field) => [field, fieldError(field, answers)])) as Partial<
    Record<FieldName, string | null>
  >
  const errorFor = (field: FieldName) => (showErrors ? (errors[field] ?? null) : null)

  // Move focus to the new step's heading so keyboard and screen-reader
  // users land at the top of what just appeared — but never on first load.
  useEffect(() => {
    if (!movedRef.current) return
    headingRef.current?.focus()
  }, [step])

  useEffect(() => {
    if (typeof status === 'object') resultRef.current?.focus()
  }, [status])

  const focusFirstInvalid = () => {
    const first = fields.find((field) => fieldError(field, answers))
    if (!first) return
    const textId = (ids as Record<string, string>)[first]
    const target = textId
      ? document.getElementById(textId)
      : formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"] input`)
    target?.focus()
  }

  const valid = fields.every((field) => !fieldError(field, answers))

  const next = () => {
    if (!valid) {
      setShowErrors(true)
      requestAnimationFrame(focusFirstInvalid)
      return
    }
    setShowErrors(false)
    movedRef.current = true
    setStep((value) => value + 1)
  }

  const back = () => {
    setShowErrors(false)
    movedRef.current = true
    setStep((value) => Math.max(0, value - 1))
  }

  const submit = async () => {
    if (!valid) {
      setShowErrors(true)
      requestAnimationFrame(focusFirstInvalid)
      return
    }
    const lead: LeadSubmission = {
      answers,
      context,
      score: scoreLead(answers, context),
      submittedAt: new Date().toISOString(),
    }
    setStatus('sending')
    const result = await submitLead(lead)
    setStatus({ result, lead })
  }

  const restart = () => {
    setAnswers(EMPTY_ANSWERS)
    setStep(0)
    setShowErrors(false)
    setStatus('editing')
    movedRef.current = true
  }

  const text = (field: 'name' | 'phone' | 'email' | 'street' | 'zip') => ({
    id: ids[field],
    value: answers[field],
    'aria-invalid': errorFor(field) ? true : undefined,
    'aria-describedby': errorFor(field) ? `${ids[field]}-error` : undefined,
    onChange: (event: ChangeEvent<HTMLInputElement>) => set(field, event.target.value),
  })

  const fieldMessage = (field: 'name' | 'phone' | 'email' | 'street' | 'zip') =>
    errorFor(field) ? (
      <p id={`${ids[field]}-error`} className="rf-field-error">
        {errorFor(field)}
      </p>
    ) : null

  return (
    <section id="estimate" className="rf-section rf-estimate" aria-labelledby="rf-estimate-title">
      <div className="rf-container rf-estimate__layout">
        <div className="rf-estimate__intro" data-reveal>
          <p className="rf-eyebrow">{estimate.eyebrow}</p>
          <h2 id="rf-estimate-title" className="rf-display">
            {estimate.title}
          </h2>
          <p className="rf-lede">{estimate.lede}</p>
          <ul className="rf-estimate__promises">
            {estimate.promises.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="rf-estimate__call">
            Rather talk now? <a href={brand.phoneHref}>Call {brand.phoneDisplay}</a>
          </p>
        </div>

        <div className="rf-estimate__panel" data-reveal>
          {typeof status === 'object' ? (
            <div ref={resultRef} tabIndex={-1} className="rf-estimate__result">
              {status.result.ok ? (
                <>
                  <h3 className="rf-subhead">Request received.</h3>
                  <p>Thanks, {status.lead.answers.name.split(' ')[0]}. We’ll call you {status.lead.answers.bestTime === 'any' ? 'soon' : `this ${status.lead.answers.bestTime}`}.</p>
                </>
              ) : status.result.reason === 'demo' ? (
                <>
                  <p className="rf-estimate__demo-flag">Demo mode · nothing was sent</p>
                  <h3 className="rf-subhead">This is the lead {brand.company} would receive.</h3>
                  <p className="rf-estimate__result-lede">
                    On a live site it lands in the contractor’s inbox and CRM the moment the homeowner presses send —
                    already qualified, already prioritized.
                  </p>
                  <LeadCard lead={status.lead} />
                  <div className="rf-actions">
                    <a className="rf-button rf-button--primary" href={WALLACE_SHIFT_CONTACT_URL} target="_blank" rel="noopener">
                      Get this for your company
                    </a>
                    <button type="button" className="rf-button rf-button--ghost" onClick={restart}>
                      Try it again
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="rf-subhead">That didn’t go through.</h3>
                  <p>
                    Nothing was sent. Please try again, or call <a href={brand.phoneHref}>{brand.phoneDisplay}</a>.
                  </p>
                  <button type="button" className="rf-button rf-button--ghost" onClick={() => setStatus('editing')}>
                    Back to the form
                  </button>
                </>
              )}
            </div>
          ) : (
            <form
              ref={formRef}
              className="rf-lead-form"
              noValidate
              aria-labelledby="rf-lead-step-title"
              onSubmit={(event) => {
                event.preventDefault()
                if (step < STEP_TITLES.length - 1) next()
                else void submit()
              }}
            >
              {context.ballpark && <div className="rf-estimate__attachment">
                <strong>Your estimate is attached</strong>
                <span>{money(context.ballpark.low)}–{money(context.ballpark.high)}</span>
                <p>{context.ballpark.summary}</p>
                <a href="#estimator">Edit roof estimate</a>
              </div>}
              <div className="rf-lead-form__progress">
                <p>
                  Step {step + 1} of {STEP_TITLES.length}
                </p>
                <ol aria-hidden="true">
                  {STEP_TITLES.map((title, index) => (
                    <li key={title} className={index <= step ? 'is-done' : undefined} />
                  ))}
                </ol>
              </div>
              <h3 id="rf-lead-step-title" ref={headingRef} tabIndex={-1} className="rf-lead-form__title">
                {STEP_TITLES[step]}
              </h3>

              {step === 0 && (
                <div className="rf-lead-form__fields">
                  <Segmented legend="What’s going on?" name="issue" options={ISSUES} value={answers.issue} onChange={(v) => set('issue', v)} error={errorFor('issue')} />
                  <Segmented legend="What kind of property?" name="property" options={PROPERTIES} value={answers.property} onChange={(v) => set('property', v)} error={errorFor('property')} />
                  <Segmented legend="How old is the roof?" name="roofAge" options={ROOF_AGES} value={answers.roofAge} onChange={(v) => set('roofAge', v)} error={errorFor('roofAge')} columns={2} />
                </div>
              )}

              {step === 1 && (
                <div className="rf-lead-form__fields">
                  <Segmented legend="Insurance" name="insurance" options={INSURANCE} value={answers.insurance} onChange={(v) => set('insurance', v)} error={errorFor('insurance')} columns={2} />
                  {asksStormDate(answers) && (
                    <Segmented legend="When did the damage happen?" name="stormDate" options={STORM_DATES} value={answers.stormDate} onChange={(v) => set('stormDate', v)} error={errorFor('stormDate')} columns={3} />
                  )}
                  <Segmented legend="How do you expect to pay?" name="payment" options={PAYMENT} value={answers.payment} onChange={(v) => set('payment', v)} error={errorFor('payment')} columns={2} />
                </div>
              )}

              {step === 2 && (
                <div className="rf-lead-form__fields">
                  <Segmented legend="When do you want it done?" name="timeline" options={TIMELINES} value={answers.timeline} onChange={(v) => set('timeline', v)} error={errorFor('timeline')} columns={2} />
                  <Segmented legend="Do you own the property?" name="owner" options={OWNERSHIP} value={answers.owner} onChange={(v) => set('owner', v)} error={errorFor('owner')} columns={2} />
                </div>
              )}

              {step === 3 && (
                <div className="rf-lead-form__fields rf-lead-form__contact">
                  <div className="rf-input">
                    <label htmlFor={ids.name}>Full name</label>
                    <input type="text" autoComplete="name" {...text('name')} />
                    {fieldMessage('name')}
                  </div>
                  <div className="rf-input">
                    <label htmlFor={ids.phone}>Mobile phone</label>
                    <input type="tel" inputMode="tel" autoComplete="tel" {...text('phone')} />
                    {fieldMessage('phone')}
                  </div>
                  <div className="rf-input rf-input--wide">
                    <label htmlFor={ids.email}>Email</label>
                    <input type="email" autoComplete="email" {...text('email')} />
                    {fieldMessage('email')}
                  </div>
                  <div className="rf-input rf-input--wide">
                    <label htmlFor={ids.street}>Property street address</label>
                    <input type="text" autoComplete="street-address" {...text('street')} />
                    {fieldMessage('street')}
                  </div>
                  <div className="rf-input">
                    <label htmlFor={ids.zip}>ZIP code</label>
                    <input type="text" inputMode="numeric" autoComplete="postal-code" maxLength={5} {...text('zip')} />
                    {fieldMessage('zip')}
                  </div>
                  <div className="rf-input">
                    <label htmlFor={ids.best}>Best time to call</label>
                    <select id={ids.best} value={answers.bestTime} onChange={(event) => set('bestTime', event.target.value as LeadAnswers['bestTime'])}>
                      {BEST_TIMES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="rf-input rf-input--wide">
                    <label htmlFor={ids.notes}>
                      Anything we should know? <span className="rf-input__optional">Optional</span>
                    </label>
                    <textarea id={ids.notes} rows={3} maxLength={800} value={answers.notes} onChange={(event) => set('notes', event.target.value)} />
                  </div>
                  <label className="rf-check rf-input--wide">
                    <input type="checkbox" checked={answers.texts} onChange={(event) => set('texts', event.target.checked)} />
                    <span>Text me appointment reminders and updates.</span>
                  </label>
                  <p className="rf-lead-form__consent rf-input--wide">{estimate.consent}</p>
                </div>
              )}

              {showErrors && !valid && (
                <p className="rf-lead-form__summary" role="alert">
                  A few answers are missing — they’re marked above.
                </p>
              )}

              <div className="rf-lead-form__nav">
                {step > 0 && (
                  <button type="button" className="rf-button rf-button--ghost" onClick={back}>
                    Back
                  </button>
                )}
                <button type="submit" className="rf-button rf-button--primary" disabled={status === 'sending'}>
                  {step < STEP_TITLES.length - 1 ? 'Continue' : status === 'sending' ? 'Sending…' : 'Send my request'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
