import { useState } from 'react'
import { MEDIA, doctor, firstVisit, links, nav, practice, reviewFilters, reviews, services, type ReviewTag } from './content'
import { Wordmark } from './Header'
import { hoursRows, todayIndex } from './schedule'
import { Arrow, OpenStatus, Stars } from './ui'

export function Care() {
  return (
    <section id="care" className="dp-section dp-care" aria-labelledby="care-title">
      <div className="dp-wrap">
        <div className="dp-section-head" data-rise>
          <p className="dp-eyebrow">Care</p>
          <h2 id="care-title" className="dp-h2">Find the cause. <span>Fix the cause.</span></h2>
          <p className="dp-lede">Corrective, family and sports chiropractic, with the exercises and advice that keep you out of pain between visits.</p>
        </div>
        <ul className="dp-services">
          {services.map((s, i) => (
            <li key={s.name} data-rise>
              <span className="dp-service-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <h3>{s.name}</h3>
              <p>{s.line}</p>
            </li>
          ))}
        </ul>

        <div className="dp-first" data-rise>
          <div className="dp-first-head">
            <h3 className="dp-h3">Your first visit</h3>
            <p>Same-day appointments are often available. <a href={links.forms} target="_blank" rel="noopener noreferrer">New-patient forms</a> can be filled in from your phone before you arrive.</p>
          </div>
          <ol className="dp-steps">
            {firstVisit.map((step, i) => (
              <li key={step.title}>
                <span className="dp-step-num" aria-hidden="true">{i + 1}</span>
                <strong>{step.title}</strong>
                <span>{step.body}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

export function Doctor() {
  return (
    <section id="about" className="dp-section dp-doctor" aria-labelledby="doctor-title">
      <div className="dp-wrap dp-doctor-grid">
        <figure className="dp-doctor-photo" data-rise>
          <img src={`${MEDIA}/photos/dr-rory-dopps-960.webp`} alt="Dr. Rory Dopps in a navy suit, seated against a blue backdrop" width="960" height="1200" loading="lazy" decoding="async" />
        </figure>
        <div className="dp-doctor-copy" data-rise>
          <p className="dp-eyebrow">Meet your chiropractor</p>
          <h2 id="doctor-title" className="dp-h2">{doctor.name}</h2>
          <p className="dp-lede">{doctor.body}</p>
          <dl className="dp-facts">
            {doctor.facts.map((f) => <div key={f.k}><dt>{f.k}</dt><dd>{f.v}</dd></div>)}
          </dl>
          <blockquote className="dp-doctor-quote">
            <p>“From newborns to professional hockey players, Dr. Rory has an incredible depth of knowledge and experience.”</p>
            <footer>Shaylee Larson, patient for over 10 years</footer>
          </blockquote>
        </div>
      </div>
    </section>
  )
}

export function Reviews() {
  const [filter, setFilter] = useState<'all' | ReviewTag>('all')
  const shown = filter === 'all' ? reviews : reviews.filter((r) => r.tags.includes(filter))
  return (
    <section id="reviews" className="dp-section dp-reviews" aria-labelledby="reviews-title">
      <div className="dp-wrap">
        <div className="dp-reviews-head" data-rise>
          <div>
            <p className="dp-eyebrow">Reviews</p>
            <h2 id="reviews-title" className="dp-h2">“Recovery, not just <span>temporary relief.</span>”</h2>
          </div>
          <a className="dp-score" href={links.googleReviews} target="_blank" rel="noopener noreferrer">
            <span className="dp-score-num">{practice.rating}</span>
            <span className="dp-score-meta"><Stars /><span>All {practice.reviewCount} Google reviews are 5 stars <Arrow /></span></span>
          </a>
        </div>
        <div className="dp-filters" role="group" aria-label="Filter reviews" data-rise>
          {reviewFilters.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
              <span>{f.id === 'all' ? reviews.length : reviews.filter((r) => r.tags.includes(f.id as ReviewTag)).length}</span>
            </button>
          ))}
        </div>
        <ul className="dp-review-grid" aria-live="polite">
          {shown.map((r) => (
            <li key={r.name} className="dp-review">
              <Stars />
              <blockquote><p>{r.text}</p></blockquote>
              <p className="dp-review-name">{r.name} <span>· {r.when}{r.excerpt ? ' · excerpt' : ''}</span></p>
            </li>
          ))}
        </ul>
        <p className="dp-review-note">Quoted from Dopps Chiropractic’s Google profile. Long reviews are shortened, marked “excerpt”. Individual results vary.</p>
      </div>
    </section>
  )
}

export function Visit() {
  const today = todayIndex()
  return (
    <section id="visit" className="dp-section dp-visit" aria-labelledby="visit-title">
      <div className="dp-wrap dp-visit-grid">
        <div data-rise>
          <p className="dp-eyebrow">Visit</p>
          <h2 id="visit-title" className="dp-h2">Stanley Square, <span>on 151st.</span></h2>
          <address className="dp-address">
            <strong>{practice.name}</strong><br />
            {practice.street}<br />
            {practice.city}, {practice.region} {practice.postal}<br />
            <span className="dp-muted">In {practice.center}</span>
          </address>
          <div className="dp-actions">
            <a className="dp-btn dp-btn--dark" href={links.directions} target="_blank" rel="noopener noreferrer">Get directions <Arrow /></a>
            <a className="dp-btn dp-btn--outline" href={practice.phoneHref}>Call {practice.phone}</a>
          </div>
          <p className="dp-contact-line"><a href={`mailto:${practice.email}`}>{practice.email}</a></p>
          <ul className="dp-socials" aria-label="Dopps Chiropractic elsewhere">
            <li><a href={links.facebook} target="_blank" rel="noopener noreferrer">Facebook</a></li>
            <li><a href={links.instagram} target="_blank" rel="noopener noreferrer">Instagram</a></li>
            <li><a href={links.youtube} target="_blank" rel="noopener noreferrer">YouTube</a></li>
            <li><a href={links.tiktok} target="_blank" rel="noopener noreferrer">TikTok</a></li>
          </ul>
        </div>
        <div className="dp-hours" data-rise>
          <div className="dp-hours-head">
            <h3 className="dp-h3">Hours</h3>
            <OpenStatus />
          </div>
          <table>
            <caption className="dp-visually-hidden">Office hours</caption>
            <tbody>
              {hoursRows.map((row) => (
                <tr key={row.days} data-today={row.idx === today || undefined} data-closed={row.hours === 'Closed' || undefined}>
                  <th scope="row">{row.days}</th>
                  <td>{row.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="dp-amenities">
            <li>Wheelchair-accessible entrance, parking and restroom</li>
            <li>Same-day appointments often available</li>
            <li>Auto accident care: ask about out-of-pocket costs (terms apply)</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="dp-footer">
      <div className="dp-wrap">
        <div className="dp-footer-top">
          <div>
            <Wordmark />
            <p className="dp-footer-tag">{practice.doctor}. Corrective, family and sports chiropractic in South Overland Park.</p>
          </div>
          <nav aria-label="Footer">
            {nav.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
            <a href="#book">Book a visit</a>
          </nav>
          <address>
            {practice.street}, {practice.city}, {practice.region} {practice.postal}<br />
            <a href={practice.phoneHref}>{practice.phone}</a><br />
            Mon, Wed &amp; Fri · 9 a.m. – 7 p.m.
          </address>
        </div>
        <div className="dp-footer-bottom">
          <p>© {new Date().getFullYear()} {practice.name}. The symptom guide is general information and does not replace an exam or medical advice.</p>
          <p>Website preview: the visit request form is not connected yet. Book online through Square or call.</p>
        </div>
      </div>
    </footer>
  )
}
