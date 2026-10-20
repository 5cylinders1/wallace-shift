import type { ReactNode } from 'react'
import { faqs, process, workshopChapters } from '../content'
import { estimate, examples, moneyShort } from '../pricing'
import { href, onLink } from '../routes'
import Photo from './Photo'

export function SectionHead({ kicker, title, em, children, id, light = false }: { kicker: string; title: string; em?: string; children?: ReactNode; id?: string; light?: boolean }) {
  return <div className={`tb-section-head ${light ? 'is-light' : ''}`} data-reveal>
    <p className="tb-label">{kicker}</p>
    <h2 id={id}>{title}{em && <> <em>{em}</em></>}</h2>
    {children && <div className="tb-section-lede">{children}</div>}
  </div>
}

export function WorkshopStrip() {
  return <section className="tb-section tb-ink tb-workshop-strip" aria-labelledby="tb-workshop-title">
    <div className="tb-wrap">
      <SectionHead kicker="The workshop" title="Made in Kansas City," em="by hand where it matters." id="tb-workshop-title" light>
        <p>Machines cut straighter than any of us. Hands decide which board becomes a door, plane the last shaving off an edge and fit a filler to a wall that was never plumb.</p>
      </SectionHead>
    </div>
    <ol className="tb-strip" aria-label="How a cabinet is made">
      {workshopChapters.map((chapter, n) => <li key={chapter.slug} className="tb-strip-item" data-reveal>
        <div className="tb-strip-image"><Photo slug={chapter.slug} sizes="(min-width: 900px) 30vw, 80vw" /></div>
        <p className="tb-strip-n">{String(n + 1).padStart(2, '0')}</p>
        <h3>{chapter.title}</h3>
        <p>{chapter.body}</p>
      </li>)}
    </ol>
    <div className="tb-wrap tb-strip-foot">
      <a className="tb-link-arrow is-light" href={href.page('workshop')} onClick={onLink}>Inside the workshop <span aria-hidden="true">→</span></a>
    </div>
  </section>
}

export function ProcessSection({ dark = false }: { dark?: boolean }) {
  return <section className={`tb-section ${dark ? 'tb-ink' : ''}`} id="process" aria-labelledby="tb-process-title">
    <div className="tb-wrap">
      <SectionHead kicker="How it works" title="Five steps," em="one team from start to finish." id="tb-process-title" light={dark}>
        <p>Timelines are typical for the work we take on, not promises. Your proposal sets your schedule.</p>
      </SectionHead>
      <ol className="tb-process">
        {process.map((step, n) => <li key={step.title} data-reveal>
          <span className="tb-process-n" aria-hidden="true">{n + 1}</span>
          <h3>{step.title}</h3>
          <p className="tb-process-time">{step.time}</p>
          <p>{step.body}</p>
        </li>)}
      </ol>
    </div>
  </section>
}

export function InvestmentTeaser() {
  return <section className="tb-section tb-paper-2" aria-labelledby="tb-invest-title">
    <div className="tb-wrap tb-invest">
      <SectionHead kicker="Investment" title="What it costs," em="before you have to ask." id="tb-invest-title">
        <p>Custom cabinetry is a considered purchase, so we show planning ranges up front. Each one comes from the same model as our planner.</p>
      </SectionHead>
      <ul className="tb-invest-list">
        {examples.map(example => {
          const result = estimate(...example.args)
          return <li key={example.label} data-reveal>
            <div><h3>{example.label}</h3><p>{example.note}</p></div>
            <p className="tb-invest-range">{moneyShort(result.low)} <span aria-hidden="true">–</span><span className="tb-visually-hidden">to</span> {moneyShort(result.high)}</p>
          </li>
        })}
      </ul>
      <div className="tb-invest-foot">
        <p className="tb-fine">Illustrative planning ranges for a fictional Kansas City studio, set against 2025 national remodeling cost data. Not a quote.</p>
        <a className="tb-button tb-button-ink" href={href.page('investment')} onClick={onLink}>Build your planning range</a>
      </div>
    </div>
  </section>
}

export function FaqSection() {
  return <section className="tb-section" aria-labelledby="tb-faq-title">
    <div className="tb-wrap tb-faq">
      <SectionHead kicker="Questions" title="What people ask" em="before the first visit." id="tb-faq-title" />
      <div className="tb-faq-list">
        {faqs.map(item => <details key={item.q} data-reveal>
          <summary>{item.q}</summary>
          <p>{item.a}</p>
        </details>)}
      </div>
    </div>
  </section>
}

export function ClosingCta() {
  return <section className="tb-closing" aria-labelledby="tb-closing-title">
    <Photo slug="bath-walnut-brass" className="tb-closing-photo" sizes="100vw" decorative />
    <div className="tb-wrap tb-closing-inner" data-reveal>
      <p className="tb-label">Design consultation</p>
      <h2 id="tb-closing-title">Bring the room. <em>We’ll bring the samples.</em></h2>
      <p>Tell us about the space and what is not working. We will come measure, listen and bring the finishes you picked.</p>
      <a className="tb-button tb-button-brass" href={href.page('consultation')} onClick={onLink}>Book a design consultation</a>
    </div>
  </section>
}
