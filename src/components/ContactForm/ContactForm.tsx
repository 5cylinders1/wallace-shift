import { useId, useState, type FormEvent } from 'react'
import { business } from '../../content/siteConfig'
import { submitContactRequest } from '../../lib/contactAdapter'
import type { ServiceRecommendation } from '../../content/shiftQuiz'
import './ContactForm.css'

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
}: ContactFormProps) {
  const uid = useId()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState(() =>
    handoff ? `Recommended shift: ${handoff.title}. ` : '',
  )
  // Honeypot. Stays empty for anyone who can actually see the form.
  const [company, setCompany] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const statusId = `${idPrefix}-${uid}-status`

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('submitting')

    const result = await submitContactRequest({ name, email, message, company })

    if (result.ok) {
      setStatus('sent')
      setName('')
      setEmail('')
      setMessage('')
      return
    }

    setStatus(result.reason === 'network_error' ? 'error' : result.reason)
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
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

      <div className="contact-form__field">
        <label htmlFor={`${idPrefix}-message`}>What is not working?</label>
        <textarea
          id={`${idPrefix}-message`}
          name="message"
          rows={4}
          placeholder="What isn't working right now?"
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
            {business.email ? (
              <>
                {' '}
                Please email{' '}
                <a href={`mailto:${business.email}`}>{business.email}</a> instead.
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
