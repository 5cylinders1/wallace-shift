import { MEDIA, amenities, freeFrom, hoursTable, links, nav, rating, reviews, salon, services } from './content'
import { goToBooking, type Draft, type Step } from './draft'
import { Wordmark } from './Header'
import InquiryForm from './InquiryForm'
import OpenStatus from './OpenStatus'
import { Arrow, Stars } from './ui'

export function Intro() {
  return (
    <section className="sl-section sl-intro" aria-labelledby="intro-title">
      <div className="sl-wrap sl-intro-grid">
        <div data-rise>
          <p className="sl-eyebrow">Meet your colorist</p>
          <h2 id="intro-title" className="sl-h2">Your color, in <em>Lara’s hands.</em></h2>
        </div>
        <div className="sl-intro-body" data-rise>
          <p className="sl-lede">
            SoLara is {salon.stylist}’s salon, inside {salon.building} on West 151st Street.
            Clients come to her for cuts, color and highlights, and many have kept coming for years.
          </p>
          <p>
            She listens first, tells you honestly what will suit your hair, and keeps going until
            it’s right, whether that’s a perfect match to your natural shade or a color correction
            that takes more than one visit.
          </p>
        </div>
        <ul className="sl-facts" data-rise>
          <li><span className="sl-fact-big">{rating.score}<span className="sl-fact-star" aria-hidden="true">★</span></span><span>Google rating from {rating.count} reviews</span></li>
          <li><span className="sl-fact-big">7</span><span>days a week, evenings until 8 on weekdays</span></li>
          <li><span className="sl-fact-big">CØR</span><span>O&amp;M’s cleaner color line</span></li>
        </ul>
      </div>
    </section>
  )
}

interface BookProps {
  setDraft: (update: (draft: Draft) => Draft) => void
  setStep: (step: Step) => void
}

export function Services({ setDraft, setStep }: BookProps) {
  const book = (id: string) => {
    setDraft((d) => ({ ...d, services: d.services.includes(id) ? d.services : [...d.services, id] }))
    setStep(2)
    goToBooking()
  }
  return (
    <section id="services" className="sl-section sl-services" aria-labelledby="services-title">
      <div className="sl-wrap">
        <div className="sl-section-head sl-section-head--split" data-rise>
          <div>
            <p className="sl-eyebrow">Services</p>
            <h2 id="services-title" className="sl-h2">Color first. <em>Cuts that suit it.</em></h2>
          </div>
          <p className="sl-lede">
            Pricing isn’t listed online yet. Ask Lara for a quote, or start with a color consultation
            if you’re not sure what to book.
          </p>
        </div>
        <ol className="sl-service-list">
          {services.map((s, i) => (
            <li key={s.id} className="sl-service" data-rise>
              <span className="sl-service-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <div className="sl-service-main">
                <h3 className="sl-h3">{s.name}</h3>
                <p className="sl-service-line">{s.line}</p>
              </div>
              <p className="sl-service-detail">{s.detail}</p>
              <button type="button" className="sl-service-book" onClick={() => book(s.id)}>
                Book<span className="sl-visually-hidden"> {s.name}</span> <Arrow />
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function CleanColor() {
  return (
    <section id="clean-color" className="sl-section sl-clean" aria-labelledby="clean-title">
      <div className="sl-wrap sl-clean-grid">
        <div className="sl-clean-copy" data-rise>
          <p className="sl-eyebrow sl-eyebrow--light">Clean color</p>
          <h2 id="clean-title" className="sl-h2">Color made <em>without the extras.</em></h2>
          <p className="sl-lede">
            SoLara colors with <strong>O&amp;M CØR</strong>, a color line made without the ingredients
            many clients would rather avoid. For home care, the salon carries Kevin Murphy styling,
            finishing and treatment products.
          </p>
          <blockquote className="sl-clean-quote">
            <p>“I love that she uses a color line that is healthier for me and the environment!”</p>
            <footer>Janet H., Google review</footer>
          </blockquote>
        </div>
        <div className="sl-clean-list" data-rise>
          <p className="sl-clean-list-title">Made without</p>
          <ul>
            {freeFrom.map((item) => <li key={item}><span aria-hidden="true">—</span> {item}</li>)}
          </ul>
          <a className="sl-btn sl-btn--ghost-light" href={links.shop} target="_blank" rel="noopener noreferrer">
            Shop products &amp; gift cards <Arrow />
          </a>
        </div>
      </div>
    </section>
  )
}

export function Reviews() {
  const [featured, ...rest] = reviews
  return (
    <section id="reviews" className="sl-section sl-reviews" aria-labelledby="reviews-title">
      <div className="sl-wrap">
        <div className="sl-section-head sl-section-head--split" data-rise>
          <div>
            <p className="sl-eyebrow">Reviews</p>
            <h2 id="reviews-title" className="sl-h2">“Like a <em>million bucks.</em>”</h2>
          </div>
          <a className="sl-review-score" href={links.googleReviews} target="_blank" rel="noopener noreferrer">
            <span className="sl-review-score-num">{rating.score}</span>
            <span>
              <Stars count={5} label={`Rated ${rating.score} out of 5`} />
              <span className="sl-review-score-text">{rating.count} reviews on {rating.source} <Arrow /></span>
            </span>
          </a>
        </div>
        <figure className="sl-review-featured" data-rise>
          <blockquote><p>{featured.text}</p></blockquote>
          <figcaption><Stars count={featured.stars} /> {featured.name} · {featured.when}</figcaption>
        </figure>
        <ul className="sl-review-grid">
          {rest.map((r) => (
            <li key={r.name} className="sl-review" data-rise>
              <Stars count={r.stars} />
              <blockquote><p>{r.text}</p></blockquote>
              <p className="sl-review-name">{r.name} <span>· {r.when}</span></p>
            </li>
          ))}
        </ul>
        <p className="sl-review-note">Reviews quoted in full from SoLara’s Google profile. One further 4-star review has no text.</p>
      </div>
    </section>
  )
}

export function Visit() {
  // Highlight today's row in the salon's own time zone.
  const today = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short' }).format(new Date())
  const weekend = today === 'Sat' || today === 'Sun'
  return (
    <section id="visit" className="sl-section sl-visit" aria-labelledby="visit-title">
      <div className="sl-wrap sl-visit-grid">
        <div className="sl-visit-info" data-rise>
          <p className="sl-eyebrow">Visit</p>
          <h2 id="visit-title" className="sl-h2">Find us on <em>151st.</em></h2>
          <figure className="sl-visit-photo">
            <img src={`${MEDIA}/media/aspen-suites-1200.webp`} alt="The Aspen salon and spa sign on a gray wall inside the suites building" width="1200" height="685" loading="lazy" decoding="async" />
          </figure>
          <address className="sl-address">
            <strong>{salon.name}</strong><br />
            Inside {salon.building}<br />
            {salon.street}<br />
            {salon.city}, {salon.region} {salon.postal}
          </address>
          <div className="sl-visit-actions">
            <a className="sl-btn sl-btn--dark" href={links.directions} target="_blank" rel="noopener noreferrer">Get directions <Arrow /></a>
            <a className="sl-btn sl-btn--ghost-dark" href={salon.phoneHref}>Call {salon.phone}</a>
          </div>

          <div className="sl-hours">
            <div className="sl-hours-head">
              <h3 className="sl-h3">Hours</h3>
              <OpenStatus />
            </div>
            <table>
              <caption className="sl-visually-hidden">Opening hours</caption>
              <tbody>
                {hoursTable.map((row, i) => (
                  <tr key={row.days} data-today={(i === 1) === weekend || undefined}>
                    <th scope="row">{row.days}</th>
                    <td>{row.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="sl-hint">Appointments recommended.</p>
          </div>

          <ul className="sl-amenities">
            {amenities.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </div>

        <div id="ask" className="sl-ask" data-rise>
          <p className="sl-eyebrow">Ask a question</p>
          <h2 className="sl-h2 sl-h2--sm">Not sure what to book?</h2>
          <p className="sl-lede">
            Send Lara a note about your hair, what you’ve used on it, and where you’d like it to go.
            Photos help.
          </p>
          <InquiryForm />
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="sl-footer">
      <div className="sl-wrap">
        <div className="sl-footer-top">
          <div>
            <Wordmark className="sl-wordmark--footer" />
            <p className="sl-footer-tag">{salon.stylist}, {salon.role.toLowerCase()}. {salon.specialty}</p>
          </div>
          <nav aria-label="Footer">
            {nav.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
            <a href="#book">Book a visit</a>
            <a href={links.giftCards} target="_blank" rel="noopener noreferrer">Gift cards</a>
          </nav>
          <address>
            {salon.street}, {salon.city}, {salon.region} {salon.postal}<br />
            <a href={salon.phoneHref}>{salon.phone}</a><br />
            {hoursTable.map((row) => <span key={row.days}>{row.days}: {row.hours}<br /></span>)}
          </address>
        </div>
        <div className="sl-footer-bottom">
          <p>© {new Date().getFullYear()} {salon.name}</p>
          <p>Website preview: the booking and question forms are not connected yet. Call to book.</p>
        </div>
      </div>
    </footer>
  )
}
