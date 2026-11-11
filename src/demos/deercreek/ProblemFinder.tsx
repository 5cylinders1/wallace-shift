import { useId, useState } from 'react'
import { business, href, problems, serviceBySlug } from './content'
import { AlertIcon, ArrowIcon, PhoneIcon } from './Icons'

const urgencyLabel = {
  safety: 'Safety first',
  now: 'Act now',
  soon: 'Fix it soon',
  plan: 'Plan ahead',
} as const

/** "What's going on?" Each choice shows what to do before a plumber arrives
 * and hands the choice to the booking form. */
export default function ProblemFinder() {
  const id = useId()
  const [active, setActive] = useState<string | null>(null)
  const problem = problems.find(item => item.id === active)
  const service = problem?.service ? serviceBySlug(problem.service) : undefined
  const bookHref = problem ? `${href('schedule')}?issue=${problem.id}${problem.service ? `&service=${problem.service}` : ''}` : href('schedule')

  return (
    <div className="dc-finder">
      <div className="dc-finder-options" role="group" aria-labelledby={`${id}-label`}>
        <p id={`${id}-label`} className="dc-finder-label">Choose what’s happening</p>
        {problems.map(item => (
          <button key={item.id} type="button" className="dc-chip" data-urgency={item.urgency} aria-pressed={active === item.id} aria-controls={`${id}-result`} onClick={() => setActive(item.id)}>
            {item.urgency === 'safety' && <AlertIcon size={18} />}{item.label}
          </button>
        ))}
      </div>
      <p className="dc-visually-hidden" aria-live="polite">{problem ? `Showing what to do for: ${problem.label}.` : ''}</p>
      <div id={`${id}-result`} className="dc-finder-result" data-urgency={problem?.urgency ?? 'none'}>
        {problem ? (
          <div key={problem.id} className="dc-finder-card">
            <p className="dc-urgency">{urgencyLabel[problem.urgency]}</p>
            <h3>{problem.heading}</h3>
            <ol className="dc-finder-steps">
              {problem.steps.map(step => <li key={step}>{step}</li>)}
            </ol>
            <div className="dc-finder-actions">
              {problem.urgency === 'safety' ? (
                <a className="dc-button dc-button-quiet" href={business.phoneHref}><PhoneIcon /> Once it’s safe, call {business.phone}</a>
              ) : (
                <>
                  {problem.urgency === 'now' && <a className="dc-button" href={business.phoneHref}><PhoneIcon /> Call {business.phone}</a>}
                  <a className={problem.urgency === 'now' ? 'dc-button dc-button-quiet' : 'dc-button'} href={bookHref}>Book a visit <ArrowIcon /></a>
                  {problem.urgency !== 'now' && <a className="dc-button dc-button-quiet" href={business.phoneHref}><PhoneIcon /> {business.phone}</a>}
                </>
              )}
            </div>
            {service && <p className="dc-finder-more"><a href={href(`services/${service.slug}`)}>More about {service.name.toLowerCase()}</a></p>}
          </div>
        ) : (
          <div className="dc-finder-empty">
            <p>Pick the closest match. We’ll show you what to do in the next few minutes, before a plumber gets there.</p>
            <p className="dc-finder-empty-sub">Smell gas? Leave the house first, then call 911 or your gas utility from outside.</p>
          </div>
        )}
      </div>
    </div>
  )
}
