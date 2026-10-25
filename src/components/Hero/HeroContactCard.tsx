import { useId, type FormEvent } from 'react'
import { useHeroContactState } from './useHeroContactState'
import './HeroContactCard.css'

export function HeroContactCard() {
  const { name, setName, email, setEmail, status, submit } = useHeroContactState()
  const statusId = useId()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await submit()
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
        Let's talk
        <br />
        about the work.
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
