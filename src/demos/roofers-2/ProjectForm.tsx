import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import './ProjectForm.css'

type PropertyKind = 'residential' | 'commercial'
type Relationship = 'owner' | 'authorized' | 'unsure'
type Concern = 'replacement' | 'leak' | 'storm' | 'maintenance' | 'inspection' | 'unsure'
type Urgency = 'active-leak' | 'soon' | 'planning'
type Payment = 'self-funded' | 'insurance' | 'financing' | 'unsure'
type InsuranceStage = 'not-started' | 'contacted' | 'open-claim' | 'estimate-received' | 'unsure'
type Timing = 'as-soon-as-possible' | 'one-to-three-months' | 'three-to-six-months' | 'researching'
type ContactMethod = 'email' | 'phone' | 'text'

/** Integration boundary for a future, explicitly configured submission service.
 * The demo creates this object in memory. It makes no network request and does
 * not write contact details to localStorage, sessionStorage, or a URL. */
export interface RoofProjectPreview {
  schemaVersion: 1
  source: 'demo2'
  createdAt: string
  educationContext: string[]
  property: { kind: PropertyKind; relationship: Relationship; postalCode: string; streetAddress: string | null }
  roof: { concern: Concern; urgency: Urgency; material: string | null; age: string | null }
  plan: { payment: Payment; insuranceStage: InsuranceStage | null; timing: Timing; notes: string | null }
  contact: {
    name: string; email: string; phone: string; preferredMethod: ContactMethod
    consent: { granted: true; statement: string }
  }
}

interface ProjectFormProps {
  /** Optional guide titles/IDs supplied by the demo shell, never inferred. */
  educationContext?: readonly string[]
}

interface Answers {
  property: PropertyKind | ''; relationship: Relationship | ''; postalCode: string; streetAddress: string
  concern: Concern | ''; urgency: Urgency | ''; material: string; age: string
  payment: Payment | ''; insuranceStage: InsuranceStage | ''; timing: Timing | ''; notes: string
  name: string; email: string; phone: string; preferredMethod: ContactMethod | ''; consent: boolean
}
type Field = keyof Answers
type Errors = Partial<Record<Field, string>>
interface Choice<T extends string> { value: T; label: string; detail?: string }

const EMPTY: Answers = {
  property: '', relationship: '', postalCode: '', streetAddress: '', concern: '', urgency: '', material: '', age: '',
  payment: '', insuranceStage: '', timing: '', notes: '', name: '', email: '', phone: '', preferredMethod: '', consent: false,
}
const STEPS = ['Your property', 'Your roof', 'Your plans', 'Your details']
const STEP_COPY = [
  ['Start with the place you care for.', 'A few details help put your project in context. It is fine if you are still exploring.'],
  ['What brings you here?', 'Tell us what you have noticed. You do not need to diagnose the roof yourself.'],
  ['Make room for a considered decision.', 'Share your timing and how you are thinking about the project. These answers are not a commitment.'],
  ['The details for a useful first conversation.', 'Add your preferred contact details, then create a local preview of your request.'],
] as const
const PROPERTIES: Choice<PropertyKind>[] = [
  { value: 'residential', label: 'A home', detail: 'House, townhome or residential property' },
  { value: 'commercial', label: 'A commercial property', detail: 'Business, multifamily or managed building' },
]
const RELATIONSHIPS: Choice<Relationship>[] = [
  { value: 'owner', label: 'I own the property' },
  { value: 'authorized', label: 'I am authorized to arrange the work' },
  { value: 'unsure', label: 'I am gathering information for someone' },
]
const CONCERNS: Choice<Concern>[] = [
  { value: 'replacement', label: 'An aging roof', detail: 'Considering replacement' },
  { value: 'leak', label: 'A leak or visible damage', detail: 'Something needs attention' },
  { value: 'storm', label: 'Recent storm damage', detail: 'Wind, hail or fallen debris' },
  { value: 'maintenance', label: 'A repair or maintenance', detail: 'Addressing a specific concern' },
  { value: 'inspection', label: 'An inspection', detail: 'Understanding the condition' },
  { value: 'unsure', label: 'I am not sure yet', detail: 'Looking for a starting point' },
]
const URGENCIES: Choice<Urgency>[] = [
  { value: 'active-leak', label: 'Water is entering now' },
  { value: 'soon', label: 'I would like attention soon' },
  { value: 'planning', label: 'I am planning ahead' },
]
const PAYMENTS: Choice<Payment>[] = [
  { value: 'self-funded', label: 'Paying directly', detail: 'Planning to fund the project myself' },
  { value: 'insurance', label: 'An insurance claim', detail: 'Considering or working through a claim' },
  { value: 'financing', label: 'Exploring financing', detail: 'Interested in payment options' },
  { value: 'unsure', label: 'Still deciding', detail: 'I would like to understand the options' },
]
const INSURANCE: Choice<InsuranceStage>[] = [
  { value: 'not-started', label: 'I have not contacted my insurer' },
  { value: 'contacted', label: 'I have contacted my insurer' },
  { value: 'open-claim', label: 'I have an open claim' },
  { value: 'estimate-received', label: 'I have received an insurer estimate' },
  { value: 'unsure', label: 'I am not sure where things stand' },
]
const TIMINGS: Choice<Timing>[] = [
  { value: 'as-soon-as-possible', label: 'As soon as practical' },
  { value: 'one-to-three-months', label: 'Within 1–3 months' },
  { value: 'three-to-six-months', label: 'Within 3–6 months' },
  { value: 'researching', label: 'I am researching; no date yet' },
]
const CONTACT_METHODS: Choice<ContactMethod>[] = [
  { value: 'email', label: 'Email' }, { value: 'phone', label: 'A phone call' }, { value: 'text', label: 'A text message' },
]
const MATERIALS = ['Asphalt shingles', 'Metal', 'Tile', 'Slate', 'Wood shake', 'Flat / low-slope membrane', 'Another material', 'Not sure']
const AGES = ['Under 10 years', '10–20 years', 'More than 20 years', 'Not sure']
const CONSENT = 'I agree to be contacted about this roofing project using the details and preferred method I provided.'
const ESTIMATE_NOTE = 'An inspection is needed to establish the scope and final pricing. Financing, if available, is subject to lender approval and terms.'
const labelFor = <T extends string>(options: Choice<T>[], value: string) => options.find(option => option.value === value)?.label ?? value
const optional = (value: string) => value.trim() || null

function validateStep(step: number, answers: Answers): Errors {
  const errors: Errors = {}
  if (step === 0) {
    if (!answers.property) errors.property = 'Choose the type of property.'
    if (!answers.relationship) errors.relationship = 'Choose your relationship to the property.'
    if (!/^\d{5}(?:-\d{4})?$/.test(answers.postalCode.trim()) || answers.postalCode.trim().startsWith('00000')) errors.postalCode = 'Enter a 5-digit US ZIP code, such as 60614.'
  }
  if (step === 1) {
    if (!answers.concern) errors.concern = 'Choose the main reason for your project.'
    if (!answers.urgency) errors.urgency = 'Choose how soon your roof needs attention.'
  }
  if (step === 2) {
    if (!answers.payment) errors.payment = 'Choose a payment path, or select “Still deciding.”'
    if (answers.payment === 'insurance' && !answers.insuranceStage) errors.insuranceStage = 'Choose your current claim stage, or select “I am not sure.”'
    if (!answers.timing) errors.timing = 'Choose a project timeframe.'
  }
  if (step === 3) {
    if (answers.name.trim().length < 2) errors.name = 'Enter your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email.trim())) errors.email = 'Enter an email address, such as name@example.com.'
    const phone = answers.phone.replace(/\D/g, '')
    if (!/^\+?[\d\s().-]+$/.test(answers.phone.trim()) || !(phone.length === 10 || (phone.length === 11 && phone.startsWith('1')))) {
      errors.phone = 'Enter a 10-digit US phone number, with an optional +1 country code.'
    }
    if (!answers.preferredMethod) errors.preferredMethod = 'Choose how you would prefer to be contacted.'
    if (!answers.consent) errors.consent = 'Confirm the contact permission to include it in your demo preview.'
  }
  return errors
}

function ChoiceGroup<T extends string>({ id, label, options, value, onChange, error, compact = false }: {
  id: string; label: string; options: Choice<T>[]; value: T | ''; onChange: (value: T) => void; error?: string; compact?: boolean
}) {
  return <fieldset className="er-form-fieldset" aria-describedby={error ? `${id}-error` : undefined}>
    <legend className="er-form-label">{label}<span className="er-form-required">Required</span></legend>
    <div className={compact ? 'er-form-choices er-form-choices-compact' : 'er-form-choices'}>
      {options.map((option, index) => <label key={option.value} className={`er-form-choice${value === option.value ? ' er-form-choice-selected' : ''}`}>
        <input id={index === 0 ? id : `${id}-${option.value}`} type="radio" name={id} value={option.value}
          checked={value === option.value} onChange={() => onChange(option.value)} aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined} required />
        <span className="er-form-choice-copy"><span>{option.label}</span>{option.detail && <small>{option.detail}</small>}</span>
        <span className="er-form-choice-mark" aria-hidden="true" />
      </label>)}
    </div>
    {error && <p id={`${id}-error`} className="er-form-field-error">{error}</p>}
  </fieldset>
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return <div className="er-form-summary-row"><dt>{label}</dt><dd>{children}</dd></div>
}

export default function ProjectForm({ educationContext = [] }: ProjectFormProps) {
  const prefix = useId()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({ ...EMPTY })
  const [errors, setErrors] = useState<Errors>({})
  const [preview, setPreview] = useState<RoofProjectPreview | null>(null)
  const [focusRequest, setFocusRequest] = useState<{ target: 'heading' | 'errors' | 'preview' } | null>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const errorsRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLHeadingElement>(null)
  const fieldId = (field: Field) => `${prefix}-${field}`
  const invalid = (field: Field) => ({ 'aria-invalid': !!errors[field], 'aria-describedby': errors[field] ? `${fieldId(field)}-error` : undefined })

  useEffect(() => {
    if (focusRequest?.target === 'heading') titleRef.current?.focus()
    if (focusRequest?.target === 'errors') errorsRef.current?.focus()
    if (focusRequest?.target === 'preview') previewRef.current?.focus()
  }, [focusRequest])

  function requestFocus(target: 'heading' | 'errors' | 'preview') { setFocusRequest({ target }) }

  function update<K extends Field>(field: K, value: Answers[K]) {
    setAnswers(current => ({ ...current, [field]: value }))
    setErrors(current => {
      const next = { ...current }
      delete next[field]
      if (field === 'payment') delete next.insuranceStage
      return next
    })
  }

  function nextStep() {
    const nextErrors = validateStep(step, answers)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) { requestFocus('errors'); return }
    setStep(current => Math.min(STEPS.length - 1, current + 1))
    requestFocus('heading')
  }

  function backStep() {
    setStep(current => Math.max(0, current - 1))
    setErrors({})
    requestFocus('heading')
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Implicit Enter submission cannot bypass a step or create a preview early.
    if (step < STEPS.length - 1) { nextStep(); return }
    for (let index = 0; index < STEPS.length; index++) {
      const nextErrors = validateStep(index, answers)
      if (Object.keys(nextErrors).length) {
        setStep(index); setErrors(nextErrors); requestFocus('errors'); return
      }
    }
    setErrors({})
    setPreview({
      schemaVersion: 1, source: 'demo2', createdAt: new Date().toISOString(), educationContext: [...educationContext],
      property: { kind: answers.property as PropertyKind, relationship: answers.relationship as Relationship,
        postalCode: answers.postalCode.trim(), streetAddress: optional(answers.streetAddress) },
      roof: { concern: answers.concern as Concern, urgency: answers.urgency as Urgency, material: optional(answers.material), age: optional(answers.age) },
      plan: { payment: answers.payment as Payment, insuranceStage: answers.payment === 'insurance' ? answers.insuranceStage as InsuranceStage : null,
        timing: answers.timing as Timing, notes: optional(answers.notes) },
      contact: { name: answers.name.trim(), email: answers.email.trim(), phone: answers.phone.trim(),
        preferredMethod: answers.preferredMethod as ContactMethod, consent: { granted: true, statement: CONSENT } },
    })
    requestFocus('preview')
  }

  function handleEnter(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    const target = event.target as HTMLElement
    // Textareas keep newlines; buttons, radios and checkboxes keep native keys.
    if (target instanceof HTMLInputElement && !['radio', 'checkbox', 'submit', 'button'].includes(target.type)) {
      event.preventDefault()
      if (step < STEPS.length - 1) nextStep()
    }
  }

  const errorList = Object.entries(errors) as [Field, string][]
  const fieldError = (field: Field) => errors[field] && <p id={`${fieldId(field)}-error`} className="er-form-field-error">{errors[field]}</p>

  return <div className="er-project-layout">
    <aside className="er-project-rail" aria-label="Request overview">
      <p className="er-form-eyebrow">A good roof starts here</p>
      <h2>A little context.<br />A clearer next step.</h2>
      <p>This project brief brings your questions, priorities and property details together before a conversation.</p>
      <ol className="er-form-progress" aria-label="Project brief progress">
        {STEPS.map((label, index) => <li key={label} aria-current={!preview && index === step ? 'step' : undefined}
          className={preview || index < step ? 'er-form-progress-complete' : index === step ? 'er-form-progress-current' : ''}>
          <span className="er-form-progress-number" aria-hidden="true">{preview || index < step ? '✓' : `0${index + 1}`}</span>
          <span>{label}{!preview && index === step && <small>Current step</small>}{(preview || index < step) && <span className="er-form-sr-only"> — complete</span>}</span>
        </li>)}
      </ol>
      <div className="er-form-rail-note">
        <span className="er-form-note-rule" aria-hidden="true" />
        <h3>Understanding comes before an estimate.</h3>
        <p>{ESTIMATE_NOTE}</p>
      </div>
      <p className="er-form-demo-note">Interactive demo for the fictional Alder &amp; Stone Roofing. Your answers stay in this page and clear when you reload.</p>
    </aside>

    <div className="er-project-form-panel">
      {preview ? <section className="er-form-preview" aria-labelledby={`${prefix}-preview-heading`}>
        <div className="er-form-preview-stamp" aria-hidden="true">A&amp;S <span>Project brief</span></div>
        <p className="er-form-eyebrow">Ready to review</p>
        <h2 id={`${prefix}-preview-heading`} ref={previewRef} tabIndex={-1}>Demo request preview — nothing has been sent</h2>
        <p className="er-form-intro">Here is the brief you have put together. No contractor has received it, no appointment has been booked, and no follow-up will be sent.</p>
        <div className="er-form-summary-section"><h3>01 / The property</h3><dl>
          <SummaryRow label="Property">{labelFor(PROPERTIES, preview.property.kind)}</SummaryRow>
          <SummaryRow label="Your role">{labelFor(RELATIONSHIPS, preview.property.relationship)}</SummaryRow>
          <SummaryRow label="Location">{preview.property.streetAddress && <>{preview.property.streetAddress}<br /></>}ZIP {preview.property.postalCode}</SummaryRow>
        </dl></div>
        <div className="er-form-summary-section"><h3>02 / The roof</h3><dl>
          <SummaryRow label="Main concern">{labelFor(CONCERNS, preview.roof.concern)}</SummaryRow>
          <SummaryRow label="Priority">{labelFor(URGENCIES, preview.roof.urgency)}</SummaryRow>
          <SummaryRow label="Material">{preview.roof.material ?? 'Not provided'}</SummaryRow>
          <SummaryRow label="Age">{preview.roof.age ?? 'Not provided'}</SummaryRow>
        </dl></div>
        <div className="er-form-summary-section"><h3>03 / Your plans</h3><dl>
          <SummaryRow label="Payment path">{labelFor(PAYMENTS, preview.plan.payment)}</SummaryRow>
          {preview.plan.insuranceStage && <SummaryRow label="Insurance stage">{labelFor(INSURANCE, preview.plan.insuranceStage)}</SummaryRow>}
          <SummaryRow label="Timing">{labelFor(TIMINGS, preview.plan.timing)}</SummaryRow>
          {preview.plan.notes && <SummaryRow label="Your notes">{preview.plan.notes}</SummaryRow>}
          {preview.educationContext.length > 0 && <SummaryRow label="Guide context">{preview.educationContext.join(', ')}</SummaryRow>}
        </dl></div>
        <div className="er-form-summary-section"><h3>04 / Contact details</h3><dl>
          <SummaryRow label="Name">{preview.contact.name}</SummaryRow>
          <SummaryRow label="Email">{preview.contact.email}</SummaryRow>
          <SummaryRow label="Phone">{preview.contact.phone}</SummaryRow>
          <SummaryRow label="Preferred contact">{labelFor(CONTACT_METHODS, preview.contact.preferredMethod)}</SummaryRow>
          <SummaryRow label="Contact permission">Included in this local preview only</SummaryRow>
        </dl></div>
        <p className="er-form-estimate-note">{ESTIMATE_NOTE}</p>
        <div className="er-form-actions er-form-preview-actions">
          <button className="er-form-button er-form-button-primary" type="button" onClick={() => { setPreview(null); setStep(0); requestFocus('heading') }}>Edit your brief <span aria-hidden="true">↗</span></button>
          <button className="er-form-reset" type="button" onClick={() => { setPreview(null); setAnswers({ ...EMPTY }); setStep(0); setErrors({}); requestFocus('heading') }}>Start a fresh preview</button>
        </div>
      </section> : <form className="er-project-form" onSubmit={submit} onKeyDown={handleEnter} noValidate aria-labelledby={`${prefix}-step-heading`}>
        <div className="er-form-step-meta"><span>Project brief</span><span>Step {step + 1} of {STEPS.length}</span></div>
        <div className="er-form-meter" aria-hidden="true"><span style={{ width: `${(step + 1) / STEPS.length * 100}%` }} /></div>
        <h2 id={`${prefix}-step-heading`} className="er-form-step-heading" ref={titleRef} tabIndex={-1}>{STEP_COPY[step][0]}</h2>
        <p className="er-form-intro">{STEP_COPY[step][1]}</p>
        {errorList.length > 0 && <div className="er-form-error-summary" ref={errorsRef} tabIndex={-1} role="alert">
          <p>Please check {errorList.length === 1 ? 'one detail' : 'these details'} before continuing.</p>
          <ul>{errorList.map(([field, message]) => <li key={field}><button type="button" onClick={() => document.getElementById(fieldId(field))?.focus()}>{message}</button></li>)}</ul>
        </div>}

        {step === 0 && <div className="er-form-step-fields">
          <ChoiceGroup id={fieldId('property')} label="What kind of property is this?" options={PROPERTIES} value={answers.property} onChange={value => update('property', value)} error={errors.property} />
          <ChoiceGroup id={fieldId('relationship')} label="What is your relationship to the property?" options={RELATIONSHIPS} value={answers.relationship} onChange={value => update('relationship', value)} error={errors.relationship} compact />
          <div className="er-form-address-grid">
            <div className="er-form-field"><label htmlFor={fieldId('postalCode')} className="er-form-label">Property ZIP code <span className="er-form-required">Required</span></label>
              <input id={fieldId('postalCode')} name="postal-code" autoComplete="postal-code" inputMode="numeric" maxLength={10} placeholder="e.g. 60614" value={answers.postalCode} onChange={event => update('postalCode', event.target.value)} {...invalid('postalCode')} required />{fieldError('postalCode')}</div>
            <div className="er-form-field"><label htmlFor={fieldId('streetAddress')} className="er-form-label">Street address <span className="er-form-required">Optional</span></label>
              <input id={fieldId('streetAddress')} name="street-address" autoComplete="street-address" maxLength={180} placeholder="Where the roof is located" value={answers.streetAddress} onChange={event => update('streetAddress', event.target.value)} /></div>
          </div>
          <p className="er-form-helper">The ZIP code describes the project location. This demo does not check service availability.</p>
        </div>}

        {step === 1 && <div className="er-form-step-fields">
          <ChoiceGroup id={fieldId('concern')} label="What is your main concern?" options={CONCERNS} value={answers.concern} onChange={value => update('concern', value)} error={errors.concern} />
          <ChoiceGroup id={fieldId('urgency')} label="How soon does the roof need attention?" options={URGENCIES} value={answers.urgency} onChange={value => update('urgency', value)} error={errors.urgency} compact />
          {answers.urgency === 'active-leak' && <p className="er-form-context-note" role="status"><strong>This demo is not monitored for urgent repairs.</strong> If water is entering your property, contact a local roofing professional directly instead of waiting for this form.</p>}
          <div className="er-form-two-columns">
            <div className="er-form-field"><label htmlFor={fieldId('material')} className="er-form-label">Current roof material <span className="er-form-required">Optional</span></label>
              <select id={fieldId('material')} value={answers.material} onChange={event => update('material', event.target.value)}><option value="">Select if known</option>{MATERIALS.map(material => <option key={material}>{material}</option>)}</select></div>
            <div className="er-form-field"><label htmlFor={fieldId('age')} className="er-form-label">Approximate roof age <span className="er-form-required">Optional</span></label>
              <select id={fieldId('age')} value={answers.age} onChange={event => update('age', event.target.value)}><option value="">Select if known</option>{AGES.map(age => <option key={age}>{age}</option>)}</select></div>
          </div>
        </div>}

        {step === 2 && <div className="er-form-step-fields">
          <ChoiceGroup id={fieldId('payment')} label="How are you thinking about paying for the work?" options={PAYMENTS} value={answers.payment} onChange={value => update('payment', value)} error={errors.payment} />
          {answers.payment === 'insurance' && <div className="er-form-field er-form-conditional"><label htmlFor={fieldId('insuranceStage')} className="er-form-label">Where are you in the insurance process? <span className="er-form-required">Required</span></label>
            <select id={fieldId('insuranceStage')} value={answers.insuranceStage} onChange={event => update('insuranceStage', event.target.value as InsuranceStage | '')} {...invalid('insuranceStage')} required><option value="">Choose your current stage</option>{INSURANCE.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select>{fieldError('insuranceStage')}
            <p className="er-form-helper">This brief does not determine insurance coverage or claim approval.</p></div>}
          {answers.payment === 'financing' && <p className="er-form-context-note">Financing options and availability depend on the lender. Approval, rates and terms are not determined by this form.</p>}
          <div className="er-form-field"><label htmlFor={fieldId('timing')} className="er-form-label">When are you hoping to move forward? <span className="er-form-required">Required</span></label>
            <select id={fieldId('timing')} value={answers.timing} onChange={event => update('timing', event.target.value as Timing | '')} {...invalid('timing')} required><option value="">Choose a timeframe</option>{TIMINGS.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select>{fieldError('timing')}</div>
          <div className="er-form-field"><label htmlFor={fieldId('notes')} className="er-form-label">Anything else worth knowing? <span className="er-form-required">Optional</span></label>
            <textarea id={fieldId('notes')} rows={4} maxLength={1200} placeholder="Questions, access considerations, or what matters most to you…" value={answers.notes} onChange={event => update('notes', event.target.value)} />
            <p className="er-form-helper">Please leave out policy numbers, financial details and other sensitive information.</p></div>
        </div>}

        {step === 3 && <div className="er-form-step-fields">
          <div className="er-form-brief-strip"><span>Your project so far</span><p>{labelFor(PROPERTIES, answers.property)} in {answers.postalCode} · {labelFor(CONCERNS, answers.concern)} · {labelFor(TIMINGS, answers.timing)}</p></div>
          <div className="er-form-field"><label htmlFor={fieldId('name')} className="er-form-label">Your name <span className="er-form-required">Required</span></label>
            <input id={fieldId('name')} name="name" autoComplete="name" maxLength={100} value={answers.name} onChange={event => update('name', event.target.value)} {...invalid('name')} required />{fieldError('name')}</div>
          <div className="er-form-two-columns">
            <div className="er-form-field"><label htmlFor={fieldId('email')} className="er-form-label">Email address <span className="er-form-required">Required</span></label>
              <input id={fieldId('email')} name="email" type="email" autoComplete="email" maxLength={254} value={answers.email} onChange={event => update('email', event.target.value)} {...invalid('email')} required />{fieldError('email')}</div>
            <div className="er-form-field"><label htmlFor={fieldId('phone')} className="er-form-label">Phone number <span className="er-form-required">Required</span></label>
              <input id={fieldId('phone')} name="tel" type="tel" autoComplete="tel" maxLength={30} placeholder="(555) 123-4567" value={answers.phone} onChange={event => update('phone', event.target.value)} {...invalid('phone')} required />{fieldError('phone')}</div>
          </div>
          <ChoiceGroup id={fieldId('preferredMethod')} label="How would you prefer to be contacted?" options={CONTACT_METHODS} value={answers.preferredMethod} onChange={value => update('preferredMethod', value)} error={errors.preferredMethod} compact />
          <div className="er-form-consent"><label htmlFor={fieldId('consent')}><input id={fieldId('consent')} type="checkbox" checked={answers.consent} onChange={event => update('consent', event.target.checked)} {...invalid('consent')} required /><span>{CONSENT}<small>This demo records your selection in the preview only. It does not send your details or contact anyone.</small></span></label>{fieldError('consent')}</div>
          <p className="er-form-estimate-note">{ESTIMATE_NOTE}</p>
        </div>}

        <div className="er-form-actions">
          {step > 0 ? <button className="er-form-button er-form-button-back" type="button" onClick={backStep}><span aria-hidden="true">←</span> Back</button> : <span className="er-form-action-note">About 3 minutes.<br />No commitment.</span>}
          {step < STEPS.length - 1 ? <button key="continue" className="er-form-button er-form-button-primary" type="button" onClick={event => { event.preventDefault(); nextStep() }}>Continue <span aria-hidden="true">→</span></button>
            : <button key="preview" className="er-form-button er-form-button-primary" type="submit">Create request preview <span aria-hidden="true">↗</span></button>}
        </div>
        <p className="er-form-footnote">{step === 3 ? 'Preview only. Nothing will be sent, charged or booked.' : 'You can go back to change any answer. Your progress stays on this page.'}</p>
      </form>}
    </div>
  </div>
}
