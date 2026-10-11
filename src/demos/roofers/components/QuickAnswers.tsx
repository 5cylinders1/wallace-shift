import { quickAnswers } from '../content'
import { pageHref } from '../routes'
import './QuickAnswers.css'

export function QuickAnswers() {
  return (
    <section id="answers" className="rf-section rf-answers" aria-labelledby="rf-answers-title">
      <div className="rf-container">
        <div className="rf-section__head" data-reveal>
          <p className="rf-eyebrow">{quickAnswers.eyebrow}</p>
          <h2 id="rf-answers-title" className="rf-display">
            {quickAnswers.title}
          </h2>
        </div>
        <ol className="rf-answers__grid">
          {quickAnswers.items.map((item, index) => (
            <li key={item.q} className="rf-answer" data-reveal>
              <span className="rf-answer__index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="rf-answer__q">{item.q}</h3>
              <p className="rf-answer__a">{item.a}</p>
              <a className="rf-answer__link" href={pageHref(item.to.page, item.to.section)}>
                {item.link}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
