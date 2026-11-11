import type { CSSProperties } from 'react'
import AreaChecker from './AreaChecker'
import { business, generalFaqs, href, reviews, reviewStats, team, visitPreferences } from './content'
import { ArrowIcon, CheckIcon, Stars } from './Icons'
import ProblemFinder from './ProblemFinder'
import { CallBook, Eyebrow, FaqList, ProcessSteps, RatingBadge, ReviewCard, Section, ServiceRows } from './ui'

const quote = (name: string) => reviews.find(review => review.name === name)!

const themes = [
  { title: 'The quote is the bill', stat: 'Fair pricing', count: 23, review: quote('Elizabeth M.') },
  { title: 'On time, and they explain it', stat: 'Punctuality', count: 15, review: quote('Micah K.') },
  { title: 'Your home, treated with care', stat: 'Courteous staff', count: 12, review: quote('Bryan T.') },
  { title: 'Problems actually solved', stat: 'Problem resolution', count: 12, review: quote('Larry P.') },
]

export default function HomePage() {
  return (
    <>
      <section className="dc-hero" aria-labelledby="dc-hero-title">
        <div className="dc-wrap dc-hero-grid">
          <div className="dc-hero-copy">
            <Eyebrow>Olathe plumber · Kansas City metro</Eyebrow>
            <h1 id="dc-hero-title" className="dc-hero-title">
              <span>Honest plumbing</span> <span>for Olathe and the</span> <span>Kansas City metro.</span>
            </h1>
            <p className="dc-hero-lede">Family-owned since 2017. Same-day water heater service, the price before the work, and a 1-year parts and labor warranty on every job.</p>
            <CallBook tone="dark" />
            <RatingBadge tone="dark" />
          </div>
          <figure className="dc-hero-figure">
            <picture>
              <source media="(min-width: 900px)" srcSet="/demos/deercreek/photos/truck-1600.webp" />
              <img src="/demos/deercreek/photos/truck-800.webp" alt="A Deer Creek plumber leans out of the company truck, the antler logo and phone number on the door" width="800" height="1199" fetchPriority="high" />
            </picture>
            <figcaption className="dc-hero-tag"><span className="dc-hero-tag-k">Same-day</span> water heater service</figcaption>
          </figure>
        </div>
        <svg className="dc-creek" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path className="dc-creek-back" d="M0 70c120-26 240-26 360 0s240 26 360 0 240-26 360 0 240 26 360 0v50H0Z" />
          <path className="dc-creek-front" d="M0 86c120-22 240-22 360 0s240 22 360 0 240-22 360 0 240 22 360 0v34H0Z" />
        </svg>
      </section>

      <Section id="help" tone="paper" labelledBy="dc-help-title" className="dc-help">
        <div className="dc-split-head">
          <h2 id="dc-help-title">What’s going on at your place?</h2>
          <p>Choose the closest match for quick safety steps, then book or call. Office hours are {business.hours.short}, {business.hours.label}</p>
        </div>
        <ProblemFinder />
      </Section>

      <section className="dc-proof" aria-label="Deer Creek at a glance">
        <div className="dc-wrap">
          <ul className="dc-proof-list">
            <li><span className="dc-proof-big"><span className="dc-count-dec">5.0</span></span><span className="dc-proof-label"><Stars label="5 out of 5 stars" /> Average Google rating</span></li>
            <li><span className="dc-proof-big"><span className="dc-count" style={{ '--to': reviewStats.count } as CSSProperties}>{reviewStats.count}</span></span><span className="dc-proof-label">Google reviews, as of {reviewStats.asOf}</span></li>
            <li><span className="dc-proof-big">2017</span><span className="dc-proof-label">Family and locally owned since</span></li>
            <li><span className="dc-proof-big">1 year</span><span className="dc-proof-label">Parts and labor warranty, every service</span></li>
          </ul>
        </div>
      </section>

      <Section id="services" tone="white" labelledBy="dc-services-title">
        <div className="dc-split-head">
          <div>
            <Eyebrow>Residential & commercial</Eyebrow>
            <h2 id="dc-services-title">Plumbing services for homes and businesses</h2>
          </div>
          <p>From a dripping faucet to a new sewer line, one licensed team handles it, with the same warranty on all of it. <a href={href('services')}>See every service</a>.</p>
        </div>
        <ServiceRows />
      </Section>

      <Section id="why" tone="sand" labelledBy="dc-why-title">
        <div className="dc-split-head">
          <div>
            <Eyebrow>{reviewStats.rating} stars · {reviewStats.count} Google reviews</Eyebrow>
            <h2 id="dc-why-title">Why neighbors keep calling back</h2>
          </div>
          <p>We read every one of the {reviewStats.count} Google reviews. The same four things come up again and again. The tags are Google’s own summary of what reviewers mention.</p>
        </div>
        <div className="dc-themes">
          {themes.map(theme => (
            <article key={theme.title} className="dc-theme">
              <p className="dc-theme-stat"><span>{theme.stat}</span> mentioned in {theme.count} reviews</p>
              <h3>{theme.title}</h3>
              <blockquote><p>“{theme.review.text}”</p></blockquote>
              <p className="dc-theme-cite">{theme.review.name}, {theme.review.source} review</p>
            </article>
          ))}
        </div>
        <p className="dc-more-link"><a href={href('reviews')}>Read more reviews <ArrowIcon /></a></p>
      </Section>

      <Section id="process" tone="paper" labelledBy="dc-process-title">
        <div className="dc-split-head">
          <div>
            <Eyebrow>No surprises</Eyebrow>
            <h2 id="dc-process-title">How a visit works</h2>
          </div>
          <p>Service is typically available within 24 hours. Here’s what happens from your first call to the warranty.</p>
        </div>
        <ProcessSteps />
      </Section>

      <Section id="area" tone="white" labelledBy="dc-area-title">
        <div className="dc-split-head">
          <div>
            <Eyebrow>Service area</Eyebrow>
            <h2 id="dc-area-title">Do we come to you?</h2>
          </div>
          <p>Our shop is in south Olathe. We serve homes and businesses across the Kansas City metro, on both sides of State Line. <a href={href('service-area')}>See the full service area</a>.</p>
        </div>
        <AreaChecker />
      </Section>

      <Section id="team" tone="night" labelledBy="dc-team-title" className="dc-team">
        <div className="dc-team-grid">
          <figure className="dc-team-photo">
            <img src="/demos/deercreek/photos/measure-800.webp" srcSet="/demos/deercreek/photos/measure-800.webp 800w, /demos/deercreek/photos/measure-1600.webp 1600w" sizes="(min-width: 900px) 45vw, 100vw" alt="A Deer Creek plumber measures a supply line inside a newly framed wall" width="800" height="535" loading="lazy" />
          </figure>
          <div>
            <Eyebrow>The people you’ll meet</Eyebrow>
            <h2 id="dc-team-title">A small team customers know by name</h2>
            <p className="dc-lede">Reviewers mention the plumber who came out more often than the company. These are the names that come up.</p>
            <ul className="dc-team-list">
              {team.map(person => (
                <li key={person.name}>
                  <span className="dc-team-name">{person.name}</span>
                  <span className="dc-team-role">{person.role}</span>
                  <span className="dc-team-note">{person.mentions > 2 ? `Named in ${person.mentions} Google reviews. ` : ''}{person.note}</span>
                </li>
              ))}
            </ul>
            <p><a href={href('about')}>About Deer Creek <ArrowIcon /></a></p>
          </div>
        </div>
      </Section>

      <Section id="every-household" tone="paper" labelledBy="dc-access-title" className="dc-access">
        <div className="dc-access-grid">
          <div>
            <Eyebrow>Accessibility</Eyebrow>
            <h2 id="dc-access-title">Plumbing that works for every household</h2>
            <p className="dc-lede">A plumber in the house can be a lot, especially for a family member with a disability, sensory needs or a mobility aid. When you book, tell us what helps and we’ll plan the visit around it.</p>
            <p>This website is built to the WCAG 2.2 AA standard: it works with a keyboard and a screen reader, and you can enlarge the text, raise the contrast or turn off motion under <strong>Display settings</strong> at the top of every page.</p>
            <p><a href={href('accessibility')}>Read our accessibility statement <ArrowIcon /></a></p>
          </div>
          <div className="dc-access-card">
            <h3>Things you can ask for when you book</h3>
            <ul className="dc-checklist dc-cols-1">
              {visitPreferences.filter(item => item !== 'Pets at home').map(item => <li key={item}><CheckIcon size={20} /><span>{item}</span></li>)}
            </ul>
          </div>
        </div>
      </Section>

      <Section id="questions" tone="white" labelledBy="dc-faq-title">
        <div className="dc-faq-layout">
          <div>
            <Eyebrow>Quick answers</Eyebrow>
            <h2 id="dc-faq-title">Questions we hear a lot</h2>
            <p><a href={href('faq')}>All questions and answers <ArrowIcon /></a></p>
          </div>
          <FaqList faqs={generalFaqs.slice(0, 6)} />
        </div>
      </Section>

      <Section tone="night" labelledBy="dc-final-title" className="dc-final">
        <div className="dc-final-inner">
          <h2 id="dc-final-title">Need a plumber? Let’s get it fixed.</h2>
          <p className="dc-lede">Book online in about two minutes, or call the office {business.hours.short}, {business.hours.label}</p>
          <CallBook tone="dark" />
          <div className="dc-final-review"><ReviewCard review={quote('Jennifer K.')} /></div>
        </div>
      </Section>
    </>
  )
}
