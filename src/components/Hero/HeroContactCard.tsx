import { useId, useState, type FormEvent } from 'react'
import { submitContactRequest } from '../../lib/contactAdapter'
import './HeroContactCard.css'

type Status = 'idle' | 'submitting' | 'sent' | 'not_configured' | 'error'

export function HeroContactCard() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const statusId = useId()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('submitting')

    const result = await submitContactRequest({ name, email, message: '' })

    if (result.ok) {
      setStatus('sent')
      setName('')
      setEmail('')
      return
    }

    setStatus(result.reason === 'not_configured' ? 'not_configured' : 'error')
  }

  return (
    <div className="hero-contact-card">
      <div className="hero-contact-card__top">
        <p className="eyebrow hero-contact-card__eyebrow">New project</p>
        <span className="hero-contact-card__count" aria-hidden="true">
          01&mdash;03
        </span>
      </div>
      <h2 className="hero-contact-card__heading">
        Let's start
        <br />
        your shift.
      </h2>

      <form
        className="hero-contact-card__form"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="hero-contact-card__field">
          <label htmlFor="hero-contact-name">Your name</label>
          <input
            id="hero-contact-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="hero-contact-card__field">
          <label htmlFor="hero-contact-email">Your email</label>
          <input
            id="hero-contact-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="hero-contact-card__row">
          <p id={statusId} className="hero-contact-card__status" role="status">
            {(status === 'idle' || status === 'submitting') &&
              "By sending, you're okay with us following up about your project."}
            {status === 'sent' && 'Thanks — we will be in touch.'}
            {status === 'not_configured' &&
              'This form is not connected yet.'}
            {status === 'error' && 'Something went wrong. Please retry.'}
          </p>

          <button
            type="submit"
            className="hero-contact-card__submit"
            disabled={status === 'submitting'}
            aria-describedby={status !== 'idle' ? statusId : undefined}
          >
            <span aria-hidden="true">&#8599;</span>
            <span className="visually-hidden">Send</span>
          </button>
        </div>
      </form>
    </div>
  )
}
