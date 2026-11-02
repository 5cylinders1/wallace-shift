import { useState, type FormEvent } from 'react'
import { answers, business, comparison, money, process, quote, sources } from '../content'

export function Compare() {
  return <section className="rf-section rf-compare" aria-labelledby="rf-compare-title">
    <div className="rf-section-head">
      <p className="rf-kicker">Side by side</p>
      <h2 id="rf-compare-title">Which one do you actually need?</h2>
      <p>Sometimes it’s the small one. Sometimes it’s both.</p>
    </div>
    <div className="rf-table-wrap">
      <table>
        <thead>
          <tr><td /><th scope="col">Under-sink filter</th><th scope="col">Riffle whole-house</th></tr>
        </thead>
        <tbody>
          {comparison.map((row) => <tr key={row.need}>
            <th scope="row">{row.need}</th>
            <td className={row.tapYes ? 'is-yes' : ''}>{row.tap}</td>
            <td className={row.wholeYes ? 'is-yes' : ''}>{row.whole}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </section>
}

export default function Answers() {
  return <section id="answers" className="rf-section rf-answers" aria-labelledby="rf-answers-title">
    <div className="rf-section-head">
      <p className="rf-kicker">Straight answers</p>
      <h2 id="rf-answers-title">The questions we’d ask, too.</h2>
    </div>
    <div className="rf-faq">
      {answers.map((item, index) => <details key={item.q} open={index === 0}>
        <summary>{item.q}<span aria-hidden="true" /></summary>
        <p>{item.a}</p>
      </details>)}
    </div>
  </section>
}

export function Process() {
  return <section className="rf-section rf-process" aria-labelledby="rf-process-title">
    <div className="rf-section-head">
      <p className="rf-kicker">How it goes</p>
      <h2 id="rf-process-title">No pipe gets cut until you’ve seen the results.</h2>
    </div>
    <ol>
      {process.map((step, index) => <li key={step.title}>
        <span className="rf-step-number">{index + 1}</span>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
      </li>)}
    </ol>
  </section>
}

/** Three days out, as a local date for <input type="date">. */
function earliestDay() {
  const day = new Date()
  day.setDate(day.getDate() + 3)
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
}

/** A concept site has nowhere to send a request, so the form says so rather than pretending. */
export function ScheduleInstall({ home, people }: { home: number; people: number }) {
  const [sent, setSent] = useState(false)
  const [well, setWell] = useState(false)
  const [earliest] = useState(earliestDay)
  const { size } = quote(home, people)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (event.currentTarget.reportValidity()) setSent(true)
  }
  return <section id="schedule" className="rf-section rf-schedule" aria-labelledby="rf-schedule-title">
    <div className="rf-schedule-copy">
      <p className="rf-kicker">Schedule an installation</p>
      <h2 id="rf-schedule-title">Pick a day. We’ll bring the system.</h2>
      <p>It’s one visit, and your water is only off for part of the day. We’ll call to confirm the date and your price.</p>
      <p>We test your water before we start, at no charge. If the results change what you need, you’ll hear it first, and you owe nothing if you decide against it.</p>
      <p>Want to look first? Your utility has to publish a yearly <a href="https://www.epa.gov/ccr" target="_blank" rel="noreferrer">water quality report</a>. Bring it, and we’ll read it with you.</p>
      <p className="rf-schedule-phone">Or call <a href={business.phoneHref}>{business.phone}</a></p>
    </div>
    <form className="rf-form" onSubmit={submit} noValidate={false}>
      <div className="rf-form-quote rf-form-wide">
        <p><strong>{size.name}</strong> for {home.toLocaleString('en-US')} sq ft and {people} {people === 1 ? 'person' : 'people'}</p>
        <p className="rf-form-price">{money(size.price)} installed</p>
        <a href="#cost" aria-label="Change your home size and household">Change</a>
      </div>
      <label>Your name<input name="name" autoComplete="name" required /></label>
      <label>Phone or email<input name="contact" autoComplete="email" required /></label>
      <label>ZIP code<input name="zip" inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{5}" title="Five-digit ZIP code" required /></label>
      <label>Where does your water come from?
        <select name="source" defaultValue="city" onChange={(event) => setWell(event.target.value === 'well')}>
          <option value="city">City water</option>
          <option value="well">Private well</option>
          <option value="unsure">Not sure</option>
        </select>
      </label>
      <p className="rf-form-note rf-form-well rf-form-wide" role="status">{well ? 'On a well, we test first and confirm your system and price before we hold a date.' : ''}</p>
      <label>Preferred day<input name="day" type="date" min={earliest} required /></label>
      <label>Time of day
        <select name="time" defaultValue="either">
          <option value="either">Either</option>
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
        </select>
      </label>
      <label className="rf-form-wide">What’s bothering you about your water? <span className="rf-optional">Optional</span>
        <textarea name="concern" rows={3} placeholder="Taste, spots on glasses, dry skin, a water heater that doesn’t last" />
      </label>
      <button className="rf-cta rf-cta-dark rf-form-wide" type="submit">Schedule my installation</button>
      <p className="rf-form-note rf-form-wide" role="status">
        {sent ? 'Thanks for trying it. Riffle is a demo, so nothing was sent. A real site would route this to your team.' : 'This is a demo site: nothing you enter here is sent or stored.'}
      </p>
    </form>
  </section>
}

export function Sources() {
  return <section className="rf-section rf-sources" aria-labelledby="rf-sources-title">
    <h2 id="rf-sources-title">Where the numbers come from</h2>
    <ul>
      {sources.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer">{source.label}</a></li>)}
    </ul>
  </section>
}
