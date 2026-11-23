import { useState, type FormEvent } from 'react'
import { business, serviceChoices } from './content'
import { Icon } from './icons'
import { submitQuote, validQuote, type QuoteRequest } from './submit'

type FormState = 'idle' | 'sending' | 'sent' | 'demo' | 'error' | 'invalid'

export default function QuoteForm({ service, setService }: { service: string; setService: (service: string) => void }) {
  const [state, setState] = useState<FormState>('idle')

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state === 'sending') return
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form)) as Record<keyof QuoteRequest, string>
    const request: QuoteRequest = { name: data.name ?? '', phone: data.phone ?? '', email: data.email ?? '', zip: data.zip ?? '', service: data.service ?? '', property: data.property ?? '', details: data.details ?? '' }
    if (!validQuote(request)) return setState('invalid')
    setState('sending')
    const result = await submitQuote(request)
    if (result === 'sent') {
      form.reset()
      setService('')
    }
    setState(result)
  }

  return <section id="quote" className="am-quote"><div className="am-shell am-quote-grid">
    <div>
      <p className="am-kicker"><span /> REQUEST A QUOTE</p>
      <h2>Tell us what you need.</h2>
      <p>Share a few details about the job so we can get in touch and talk through your options.</p>
      <a href={business.phoneHref}><Icon name="phone" size={16} /> Prefer to call? {business.phoneDisplay}</a>
    </div>
    {state === 'sent'
      ? <div className="am-form" role="status">
        <h3 className="am-form-title">Quote request received</h3>
        <p>Thank you. Our team will use the contact details you provided to follow up.</p>
        <button type="button" className="am-btn am-primary am-form-again" onClick={() => setState('idle')}>Send another request</button>
      </div>
      : <form className="am-form" onSubmit={onSubmit}>
        <div className="am-fields">
          <label>Full name<input name="name" autoComplete="name" required maxLength={100} /></label>
          <label>Phone number<input name="phone" type="tel" autoComplete="tel" required maxLength={30} /></label>
          <label>Email (optional)<input name="email" type="email" autoComplete="email" maxLength={254} /></label>
          <label>ZIP code<input name="zip" inputMode="numeric" autoComplete="postal-code" required pattern="[0-9]{5}" maxLength={5} /></label>
          <label>Service<select name="service" required value={service} onChange={event => setService(event.target.value)}>
            <option value="">Select a service</option>{serviceChoices.map(item => <option key={item}>{item}</option>)}
          </select></label>
          <label>Property type<select name="property" required defaultValue="">
            <option value="">Select property type</option><option>Home</option><option>Business</option>
          </select></label>
          <label className="am-wide">What can we help with? (optional)<textarea name="details" rows={3} maxLength={1500} /></label>
        </div>
        <button type="submit" className="am-btn am-primary" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send Quote Request'} <Icon name="arrow-right" size={17} /></button>
        {state === 'demo' && <p role="status" className="am-form-notice">Website preview: this request was not sent. To reach {business.name}, call {business.phoneDisplay}.</p>}
        {state === 'error' && <p role="alert">We couldn’t save your request. Try again or call {business.phoneDisplay}.</p>}
        {state === 'invalid' && <p role="alert">Please enter your full name and a valid US phone number.</p>}
        <p>For urgent service, please call rather than using this form.</p>
      </form>}
  </div></section>
}
