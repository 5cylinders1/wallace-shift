import { faq } from '../content'
import './Faq.css'

export function Faq() {
  return (
    <section id="faq" className="rf-section rf-faq" aria-labelledby="rf-faq-title">
      <div className="rf-container rf-faq__layout">
        <div className="rf-section__head" data-reveal>
          <p className="rf-eyebrow">{faq.eyebrow}</p>
          <h2 id="rf-faq-title" className="rf-display">
            {faq.title}
          </h2>
        </div>
        <div className="rf-faq__list" data-reveal>
          {faq.items.map((item) => (
            <details key={item.q} className="rf-faq__item">
              <summary>
                <span>{item.q}</span>
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
