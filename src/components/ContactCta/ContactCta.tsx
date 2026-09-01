import { useEffect, useId, useState, type FormEvent } from 'react'
import { contactCta } from '../../content/siteConfig'
import { contactMedia } from '../../content/mediaAssets'
import { submitContactRequest } from '../../lib/contactAdapter'
import { renderLines } from '../../lib/textLines'
import {
  QUIZ_HANDOFF_EVENT,
  type QuizHandoffDetail,
} from '../../lib/quizHandoff'
import { AmbientLoop } from '../AmbientLoop/AmbientLoop'
import { Reveal } from '../Reveal/Reveal'
import './ContactCta.css'

type Status = 'idle' | 'submitting' | 'sent' | 'not_configured' | 'error'

export function ContactCta() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const statusId = useId()

  useEffect(() => {
    const handleHandoff = (event: Event) => {
      const detail = (event as CustomEvent<QuizHandoffDetail>).detail
      if (!detail?.serviceTitle) return
      setMessage((prev) =>
        prev ? prev : `Recommended shift: ${detail.serviceTitle}. `,
      )
    }

    window.addEventListener(QUIZ_HANDOFF_EVENT, handleHandoff)
    return () => window.removeEventListener(QUIZ_HANDOFF_EVENT, handleHandoff)
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('submitting')

    const result = await submitContactRequest({ name, email, message })

    if (result.ok) {
      setStatus('sent')
      setName('')
      setEmail('')
      setMessage('')
      return
    }

    setStatus(result.reason === 'not_configured' ? 'not_configured' : 'error')
  }

  return (
    <section id="contact" className="contact-cta">
      <AmbientLoop media={contactMedia} className="contact-cta__media" />
      <div className="contact-cta__scrim" aria-hidden="true" />
      <div className="container contact-cta__inner">
        <div className="contact-cta__intro">
          <Reveal>
            <h2 className="contact-cta__headline">
              {renderLines(contactCta.headlineLines)}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="contact-cta__supporting">{contactCta.supporting}</p>
          </Reveal>
        </div>

        <Reveal delay={0.16} className="contact-cta__form-wrap">
          <form className="contact-cta__form" onSubmit={handleSubmit} noValidate>
            <div className="contact-cta__field">
              <label htmlFor="contact-name">Name</label>
              <input
                id="contact-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="contact-cta__field">
              <label htmlFor="contact-email">Email</label>
              <input
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@business.com"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="contact-cta__field">
              <label htmlFor="contact-message">What is not working?</label>
              <textarea
                id="contact-message"
                name="message"
                rows={4}
                placeholder="What isn't working right now?"
                required
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>

            <button
              type="submit"
              className="contact-cta__submit"
              disabled={status === 'submitting'}
              aria-describedby={status !== 'idle' ? statusId : undefined}
            >
              {status === 'submitting'
                ? 'Sending…'
                : contactCta.primaryCtaLabel}
            </button>

            <p id={statusId} className="contact-cta__status" role="status">
              {status === 'sent' &&
                'Thanks — we have received your message and will be in touch.'}
              {status === 'not_configured' &&
                'This form is not connected to an inbox yet, so nothing was sent. Please check back once a submission destination is set up.'}
              {status === 'error' &&
                'Something went wrong sending this. Please try again shortly.'}
            </p>
          </form>
        </Reveal>
      </div>
    </section>
  )
}
