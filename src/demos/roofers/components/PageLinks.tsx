import { pages } from '../content'
import { pageHref, type PageId } from '../routes'
import './PageLinks.css'

/** The deeper pages, each with what it answers. `except` leaves out the page the visitor is on. */
export function PageLinks({ except, tone = 'light' }: { except?: PageId; tone?: 'light' | 'dark' }) {
  return (
    <ul className={`rf-page-links rf-page-links--${tone}`}>
      {pages.items
        .filter((item) => item.page !== except)
        .map((item) => (
          <li key={item.page}>
            <a className="rf-page-link" href={pageHref(item.page, item.section)}>
              <span className="rf-page-link__label">
                {item.label}
                <span className="rf-page-link__arrow" aria-hidden="true">
                  →
                </span>
              </span>
              <span className="rf-page-link__body">{item.body}</span>
            </a>
          </li>
        ))}
    </ul>
  )
}

/** The home page's way into the deeper pages, after the short answers. */
export function Guides() {
  return (
    <section id="guides" className="rf-section rf-guides" aria-labelledby="rf-guides-title">
      <div className="rf-container">
        <div className="rf-section__head" data-reveal>
          <p className="rf-eyebrow">{pages.eyebrow}</p>
          <h2 id="rf-guides-title" className="rf-display">
            {pages.title}
          </h2>
        </div>
        <div data-reveal>
          <PageLinks />
        </div>
      </div>
    </section>
  )
}
