import { during } from '../content'
import './DuringTheJob.css'

export function DuringTheJob() {
  return (
    <section id="during" className="rf-section rf-during" aria-labelledby="rf-during-title">
      <div className="rf-container">
        <div className="rf-section__head rf-section__head--split" data-reveal>
          <div>
            <p className="rf-eyebrow">{during.eyebrow}</p>
            <h2 id="rf-during-title" className="rf-display">
              {during.title}
            </h2>
          </div>
          <p className="rf-lede">{during.lede}</p>
        </div>

        <div className="rf-during__lists">
          {[during.before, during.onTheDay].map((list) => (
            <div key={list.title} className="rf-during__list" data-reveal>
              <h3>{list.title}</h3>
              <ol>
                {list.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <div className="rf-during__notes" data-reveal>
          <p>
            <strong>When we’d suggest stepping out.</strong> {during.stepOut}
          </p>
          <p>
            <strong>Weather.</strong> {during.weather}
          </p>
        </div>
      </div>
    </section>
  )
}
