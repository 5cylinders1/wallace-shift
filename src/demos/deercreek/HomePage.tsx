import AreaChecker from './AreaChecker'
import { business, generalFaqs, href, reviews, team, visitPreferences, type Review } from './content'
import { ArrowIcon, CheckIcon } from './Icons'
import ProblemFinder from './ProblemFinder'
import { CallBook, Eyebrow, FaqList, ProcessSteps, RatingBadge, Section, ServiceRows } from './ui'

const quote = (name: string) => reviews.find(review => review.name === name)!

/** The two reviews that back the headline, quoted whole: one on pricing, one
 * on care and reliability. `emphasis` is set in a highlight and must appear
 * in the review word for word (the build test checks). Everything else lives
 * on the Reviews page. */
const featured: Array<{ topic: string; review: Review; emphasis: string }> = [
  { topic: 'Pricing', review: quote('Elizabeth M.'), emphasis: 'What Beau quoted us on the phone is exactly what we paid.' },
  { topic: 'Care and reliability', review: quote('Jennifer K.'), emphasis: 'I literally trust him with my house keys.' },
]

function Emphasis({ text, emphasis }: { text: string; emphasis: string }) {
  const at = text.indexOf(emphasis)
  if (at < 0) return <>{text}</>
  return <>{text.slice(0, at)}<mark className="dc-voice-key">{emphasis}</mark>{text.slice(at + emphasis.length)}</>
}

export default function HomePage() {
  return (
    <>
      <section className="dc-hero" aria-labelledby="dc-hero-title">
        <div className="dc-wrap dc-hero-grid">
          <div className="dc-hero-copy">
            <Eyebrow>Olathe plumber · Kansas City metro</Eyebrow>
            <h1 id="dc-hero-title" className="dc-hero-title">
              <span>Plumbing fixed.</span> <span>Price agreed first.</span>
            </h1>
            <p className="dc-hero-lede">Family and locally owned since 2017. Every service is backed by a one-year parts and labor warranty.</p>
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
          <p>Choose the closest match for quick safety steps, then request a visit or call. Office hours are {business.hours.short}, {business.hours.label}</p>
        </div>
        <ProblemFinder />
      </Section>

      <Section id="why" tone="sand" labelledBy="dc-why-title" className="dc-voices">
        <Eyebrow>In customers’ words</Eyebrow>
        <h2 id="dc-why-title">Why neighbors keep calling back</h2>
        <div className="dc-voice-grid">
          {featured.map(({ topic, review, emphasis }) => (
            <figure key={review.name} className="dc-voice">
              <p className="dc-voice-topic">{topic}</p>
              <blockquote><p>“<Emphasis text={review.text} emphasis={emphasis} />”</p></blockquote>
              <figcaption><span className="dc-voice-name">{review.name}</span> <span className="dc-voice-meta">{review.source} review, {review.year}</span></figcaption>
            </figure>
          ))}
        </div>
        <p className="dc-more-link"><a href={href('reviews')}>Read more reviews <ArrowIcon /></a></p>
      </Section>

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
            <p className="dc-lede">From the office to the job site, these are the people you’re likely to deal with.</p>
            <ul className="dc-team-list">
              {team.map(person => (
                <li key={person.name}>
                  <span className="dc-team-name">{person.name}</span>
                  <span className="dc-team-detail">
                    <span className="dc-team-role">{person.role}</span>
                    {person.note && <span className="dc-team-note">{person.note}</span>}
                  </span>
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
            <p className="dc-lede">A plumber in the house can be a lot, especially for a family member with a disability, sensory needs or a mobility aid. When you request a visit, tell us what helps and we’ll plan the visit around it.</p>
            <p>Need larger text or less motion on this site? Use <strong>Display settings</strong> at the top of any page.</p>
            <p><a href={href('accessibility')}>Read our accessibility statement <ArrowIcon /></a></p>
          </div>
          <div className="dc-access-card">
            <h3>Things you can ask for</h3>
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
          <p className="dc-lede">Choose your preferred day and time. Our office will contact you by the next business day to confirm availability.</p>
          <CallBook tone="dark" />
          <p className="dc-final-hours">Office hours {business.hours.short}, {business.hours.label}</p>
        </div>
      </Section>
    </>
  )
}
