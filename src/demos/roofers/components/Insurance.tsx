import { insurance } from '../content'
import { money } from '../pricing'
import './Insurance.css'

export function Insurance() {
  const { example } = insurance
  return (
    <section id="insurance" className="rf-section rf-insurance" aria-labelledby="rf-insurance-title">
      <div className="rf-container">
        <div className="rf-section__head rf-section__head--split" data-reveal>
          <div className="rf-insurance__heading">
            <p className="rf-eyebrow">{insurance.eyebrow}</p>
            <h2 id="rf-insurance-title" className="rf-display">
              {insurance.title}
            </h2>
          </div>
          <p className="rf-lede">{insurance.lede}</p>
        </div>

        <div className="rf-coverage" data-reveal>
          <div className="rf-coverage__col rf-coverage__col--yes">
            <h3>{insurance.covered.title}</h3>
            <ul>
              {insurance.covered.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rf-coverage__col rf-coverage__col--no">
            <h3>{insurance.notCovered.title}</h3>
            <ul>
              {insurance.notCovered.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rf-deductible" data-reveal>
          <h3>{insurance.deductible.title}</h3>
          <p>{insurance.deductible.body}</p>
        </div>

        <div className="rf-policies" data-reveal>
          <h3 className="rf-subhead">Which policy you have changes the check</h3>
          <ol>
            {insurance.policies.map((policy, index) => (
              <li key={policy.name}>
                <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <h4>{policy.name}</h4>
                <p>{policy.body}</p>
              </li>
            ))}
          </ol>
        </div>

        <figure className="rf-money" data-reveal>
          <figcaption>
            <h3 className="rf-subhead">{example.title}</h3>
            <p>{example.caption}</p>
          </figcaption>
          <div className="rf-money__bar" role="img" aria-label={example.parts.map((part) => `${part.label}: ${money(part.amount)}`).join('; ')}>
            {example.parts.map((part) => (
              <span
                key={part.label}
                className={`rf-money__part rf-money__part--${part.tone}`}
                style={{ flexGrow: part.amount }}
              >
                {money(part.amount)}
              </span>
            ))}
          </div>
          <ul className="rf-money__legend">
            {example.parts.map((part) => (
              <li key={part.label} className={`rf-money__key rf-money__key--${part.tone}`}>
                <strong>{money(part.amount)}</strong>
                {part.label}
              </li>
            ))}
            <li className="rf-money__key rf-money__key--total">
              <strong>{money(example.total)}</strong>
              Approved replacement cost
            </li>
          </ul>
        </figure>

        <div id="claim-timeline" className="rf-claim" data-reveal>
          <h3 className="rf-subhead">{insurance.timeline.title}</h3>
          <ol className="rf-claim__steps">
            {insurance.timeline.steps.map((step, index) => (
              <li key={step.name} className="rf-claim__step">
                <span className="rf-claim__node" aria-hidden="true">
                  {index + 1}
                </span>
                <p className="rf-claim__when">{step.when}</p>
                <h4>{step.name}</h4>
                <p className="rf-claim__body">{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="rf-claim__summary">{insurance.timeline.summary}</p>
        </div>

        <div className="rf-insurance__foot" data-reveal>
          <div className="rf-deadline">
            <h3>{insurance.deadline.title}</h3>
            <p>{insurance.deadline.body}</p>
            <a className="rf-button rf-button--primary" href="#estimate">
              Book a free storm inspection
            </a>
          </div>
          <p className="rf-insurance__note">{insurance.note}</p>
        </div>
      </div>
    </section>
  )
}
