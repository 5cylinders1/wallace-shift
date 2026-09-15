import { useId, useState, type FormEvent } from 'react'
import { business } from '../../content/siteConfig'
import { enquiryBudgets, enquiryCopy, enquiryPackages, enquiryServices,
  type EnquiryOption } from '../../content/enquiry'
import { submitContactRequest } from '../../lib/contactAdapter'
import type { ServiceRecommendation } from '../../content/shiftQuiz'
import './ContactForm.css'

/** The endpoint receives what the reader actually read, not an internal id. */
const labelFor = (options: EnquiryOption[], value: string) =>
  options.find(option => option.value === value)?.label ?? ''

type Status =
  | 'idle'
  | 'submitting'
  | 'sent'
  | 'not_configured'
  | 'invalid'
  | 'error'

type ContactFormProps = {
  /** Distinguishes the two instances so field ids never collide. */
  idPrefix: string
  submitLabel: string
  /**
   * Pre-fills the message when the visitor arrived from the Shift Finder.
   * Callers pass a `key` derived from this so a different recommendation
   * remounts the form rather than keeping the previous prefill.
   */
  handoff?: ServiceRecommendation | null
  /** Adds budget, service, package and current-website questions. The short
   *  form stays the default: the extra context is worth asking for where
   *  there is room for it, and a barrier everywhere else. */
  detailed?: boolean
}

/** One labelled select. The blank first option is the unanswered state:
 *  none of these questions is required, so none of them may preselect. */
function Choice({ id, label, value, options, onChange }: {
  id: string; label: string; value: string
  options: EnquiryOption[]; onChange: (value: string) => void
}) {
  return (
    <div className="contact-form__field">
      <label htmlFor={id}>{label}</label>
      <select id={id} name={id} value={value} onChange={event => onChange(event.target.value)}>
        <option value="">{enquiryCopy.choosePlaceholder}</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  )
}

/**
 * The enquiry form, shared by the homepage's closing section and the
 * contact page.
 *
 * The message is pre-filled from the Shift Finder's recommendation, which
 * travels in the URL as `?shift=`. That replaces an in-page `CustomEvent`,
 * which only worked when the quiz and the form were rendered on the same
 * page and left nothing to link to, share, or measure.
 */
export function ContactForm({
  idPrefix,
  submitLabel,
  handoff,
  detailed = false,
}: ContactFormProps) {
  const uid = useId()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState(() =>
    handoff ? `Recommended shift: ${handoff.title}. ` : '',
  )
  const [website, setWebsite] = useState('')
  const [noWebsite, setNoWebsite] = useState(false)
  const [service, setService] = useState('')
  const [packageChoice, setPackageChoice] = useState('')
  const [budget, setBudget] = useState('')
  // Honeypot. Stays empty for anyone who can actually see the form.
  const [company, setCompany] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const statusId = `${idPrefix}-${uid}-status`

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('submitting')

    const result = await submitContactRequest({
      name, email, message, company,
      ...(detailed ? {
        website: noWebsite ? '' : website, noWebsite,
        service: labelFor(enquiryServices, service),
        package: labelFor(enquiryPackages, packageChoice),
        budget: labelFor(enquiryBudgets, budget),
      } : {}),
    })

    if (result.ok) {
      setStatus('sent')
      setName('')
      setEmail('')
      setMessage('')
      setWebsite('')
      setNoWebsite(false)
      setService('')
      setPackageChoice('')
      setBudget('')
      return
    }

    setStatus(result.reason === 'network_error' ? 'error' : result.reason)
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      {/* Paired so the detailed card stays a compact block. Seven stacked
          fields make it taller than the screen it has to share. */}
      <div className={detailed ? 'contact-form__row' : undefined}>
        <div className="contact-form__field">
          <label htmlFor={`${idPrefix}-name`}>Name</label>
          <input
            id={`${idPrefix}-name`}
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="contact-form__field">
          <label htmlFor={`${idPrefix}-email`}>Email</label>
          <input
            id={`${idPrefix}-email`}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@business.com"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
      </div>

      {detailed && (
        <div className="contact-form__row">
          <div className="contact-form__field">
            <label htmlFor={`${idPrefix}-website`}>{enquiryCopy.websiteLabel}</label>
            <input
              id={`${idPrefix}-website`}
              name="website"
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder={enquiryCopy.websitePlaceholder}
              value={noWebsite ? '' : website}
              disabled={noWebsite}
              onChange={(event) => setWebsite(event.target.value)}
            />
            <label className="contact-form__toggle">
              <input
                type="checkbox"
                name="noWebsite"
                checked={noWebsite}
                onChange={(event) => setNoWebsite(event.target.checked)}
              />
              {enquiryCopy.noWebsiteLabel}
            </label>
          </div>
          <Choice id={`${idPrefix}-package`} label={enquiryCopy.packageLabel}
            value={packageChoice} options={enquiryPackages} onChange={setPackageChoice} />
        </div>
      )}

      {detailed && (
        <div className="contact-form__row">
          <Choice id={`${idPrefix}-service`} label={enquiryCopy.serviceLabel}
            value={service} options={enquiryServices} onChange={setService} />
          <Choice id={`${idPrefix}-budget`} label={enquiryCopy.budgetLabel}
            value={budget} options={enquiryBudgets} onChange={setBudget} />
        </div>
      )}

      <div className="contact-form__field">
        <label htmlFor={`${idPrefix}-message`}>{enquiryCopy.messageLabel}</label>
        <textarea
          id={`${idPrefix}-message`}
          name="message"
          rows={4}
          placeholder={enquiryCopy.messagePlaceholder}
          required
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </div>

      {/* Off-screen and unfocusable, so only an automated submission ever
          fills it. aria-hidden keeps it out of the accessibility tree. */}
      <div className="contact-form__honeypot" aria-hidden="true">
        <label htmlFor={`${idPrefix}-company`}>Company</label>
        <input
          id={`${idPrefix}-company`}
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
        />
      </div>

      <button
        type="submit"
        className="contact-form__submit"
        disabled={status === 'submitting'}
        aria-describedby={status !== 'idle' ? statusId : undefined}
      >
        {status === 'submitting' ? 'Sending…' : submitLabel}
      </button>

      <p id={statusId} className="contact-form__status" role="status">
        {status === 'sent' &&
          'Thanks — we have received your message and will be in touch.'}
        {status === 'not_configured' && (
          <>
            This form is not connected to an inbox yet, so nothing was sent.
            {business.salesEmail ? (
              <>
                {' '}
                Please email Bella in sales at{' '}
                <a href={`mailto:${business.salesEmail}`}>{business.salesEmail}</a> instead.
              </>
            ) : (
              ' Please check back once a submission destination is set up.'
            )}
          </>
        )}
        {status === 'invalid' &&
          'Please check your name, email, and message, then try again.'}
        {status === 'error' &&
          'Something went wrong sending this. Please try again shortly.'}
      </p>
    </form>
  )
}
