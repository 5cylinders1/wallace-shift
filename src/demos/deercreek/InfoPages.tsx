import type { ReactNode } from 'react'
import AreaChecker from './AreaChecker'
import { AREA, bandFor, milesFromShop } from './area'
import { placePoints } from './areaData'
import { business, generalFaqs, href, promises, reviews, reviewStats, services, team, visitPreferences } from './content'
import { ArrowIcon, ClockIcon, PhoneIcon, ShieldIcon, Stars } from './Icons'
import Scheduler from './Scheduler'
import { CallBook, CheckList, Eyebrow, FaqList, PromiseList, ReviewBrowser, ReviewCard, Section } from './ui'

function PageHero({ eyebrow, title, lede, children }: { eyebrow: string; title: string; lede: string; children?: ReactNode }) {
  return (
    <section className="dc-page-hero" aria-labelledby="dc-page-title">
      <div className="dc-wrap dc-page-hero-inner">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 id="dc-page-title">{title}</h1>
        <p className="dc-lede">{lede}</p>
        {children}
      </div>
    </section>
  )
}

const normalize = (value: string) => value.toLowerCase().replace(/[’']/g, '')
const AREA_GROUPS: Array<{ title: string; state: 'KS' | 'MO'; towns: string[] }> = [
  { title: 'Johnson County, Kansas', state: 'KS', towns: ['Olathe', 'Overland Park', 'Lenexa', 'Shawnee', 'Leawood', 'Prairie Village', 'Merriam', 'Mission', 'Roeland Park', 'Fairway', 'Mission Hills', 'Gardner', 'Spring Hill', 'De Soto', 'Edgerton', 'Lake Quivira'] },
  { title: 'Miami County, Kansas', state: 'KS', towns: ['Paola', 'Louisburg', 'Osawatomie', 'Bucyrus', 'Hillsdale', 'Fontana'] },
  { title: 'Wyandotte, Leavenworth & Douglas counties, Kansas', state: 'KS', towns: ['Kansas City', 'Bonner Springs', 'Edwardsville', 'Basehor', 'Tonganoxie', 'Lansing', 'Leavenworth', 'Lawrence', 'Eudora', 'Baldwin City'] },
  { title: 'Jackson & Cass counties, Missouri', state: 'MO', towns: ['Kansas City', 'Lee’s Summit', 'Raytown', 'Grandview', 'Belton', 'Raymore', 'Peculiar', 'Harrisonville', 'Independence', 'Blue Springs', 'Grain Valley', 'Pleasant Hill'] },
  { title: 'Clay & Platte counties, Missouri', state: 'MO', towns: ['North Kansas City', 'Gladstone', 'Liberty', 'Parkville', 'Riverside', 'Platte City', 'Smithville'] },
]

function townMiles(name: string, state: string) {
  const point = placePoints.find(([placeName, placeState]) => normalize(placeName) === normalize(name) && placeState === state)
  return point ? milesFromShop(point[2], point[3]) : null
}

export function AreaPage() {
  return (
    <>
      <PageHero eyebrow="Service area" title="Plumbing service across Olathe and the Kansas City metro" lede="Our shop is in south Olathe, and our plumbers work across the Kansas City metro on both sides of State Line. Check your ZIP code or town below." />
      <Section tone="white" labelledBy="dc-check-title">
        <h2 id="dc-check-title" className="dc-visually-hidden">Check your address</h2>
        <AreaChecker />
      </Section>
      <Section tone="sand" labelledBy="dc-towns-title">
        <div className="dc-split-head">
          <h2 id="dc-towns-title">Communities we serve</h2>
          <p>Distances are straight-line miles from our shop. Anywhere within about {AREA.coreMiles} miles is our everyday area; farther out, give us a call and we’ll tell you straight.</p>
        </div>
        <div className="dc-town-groups">
          {AREA_GROUPS.map(group => (
            <div key={group.title} className="dc-town-group">
              <h3>{group.title}</h3>
              <ul>
                {group.towns.map(town => {
                  const miles = townMiles(town, group.state)
                  const band = miles === null ? 'core' : bandFor(miles)
                  return (
                    <li key={town} data-band={band}>
                      <span>{town}</span>
                      {miles !== null && <span className="dc-town-miles">{Math.max(1, Math.round(miles))} mi{band === 'edge' ? <span className="dc-town-call"> · call to confirm</span> : null}</span>}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
        <p className="dc-note">Don’t see your town? Call <a href={business.phoneHref}>{business.phone}</a>.</p>
      </Section>
      <Section tone="night" labelledBy="dc-afinal-title" className="dc-final">
        <div className="dc-final-inner">
          <h2 id="dc-afinal-title">In our area? Let’s get you on the schedule.</h2>
          <CallBook tone="dark" />
        </div>
      </Section>
    </>
  )
}

export function ReviewsPage() {
  const max = Math.max(...reviewStats.distribution.map(row => row.count))
  return (
    <>
      <PageHero eyebrow="Reviews" title={`Deer Creek Plumbing reviews: ${reviewStats.rating} stars from ${reviewStats.count} Google reviews`} lede="We don’t pick and choose what shows up on Google. Here’s the full rating breakdown, the topics Google pulls from reviews, and what customers wrote in their own words." />
      <Section tone="white" labelledBy="dc-summary-title">
        <h2 id="dc-summary-title" className="dc-visually-hidden">Rating summary</h2>
        <div className="dc-rating-summary">
          <div className="dc-rating-big">
            <p className="dc-rating-number">{reviewStats.rating}</p>
            <Stars label="5.0 out of 5 stars" />
            <p>{reviewStats.count} Google reviews<br /><span className="dc-muted">as of {reviewStats.asOf}</span></p>
          </div>
          <table className="dc-distribution">
            <caption className="dc-visually-hidden">Google reviews by star rating</caption>
            <thead className="dc-visually-hidden"><tr><th scope="col">Rating</th><th scope="col">Reviews</th></tr></thead>
            <tbody>
              {reviewStats.distribution.map(row => (
                <tr key={row.stars}>
                  <th scope="row">{row.stars} star{row.stars === 1 ? '' : 's'}</th>
                  <td><span className="dc-bar" aria-hidden="true"><span style={{ width: `${(row.count / max) * 100}%` }} /></span><span className="dc-bar-count">{row.count}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="dc-topics">
            <h3>What reviewers mention most</h3>
            <p className="dc-muted">Google’s own topic summary of the reviews.</p>
            <ul>{reviewStats.topics.map(topic => <li key={topic.label}><span>{topic.label}</span> <span className="dc-topic-count">{topic.count}</span></li>)}</ul>
          </div>
        </div>
        <div className="dc-cta-row">
          <a className="dc-button dc-button-quiet" href={business.googleMaps} rel="noopener">Read all {reviewStats.count} on Google<span className="dc-visually-hidden"> (opens Google Maps)</span></a>
          <a className="dc-button dc-button-quiet" href={business.facebook} rel="noopener">Facebook recommendations<span className="dc-visually-hidden"> (opens Facebook)</span></a>
        </div>
      </Section>
      <Section tone="sand" labelledBy="dc-words-title">
        <h2 id="dc-words-title">In their own words</h2>
        <p className="dc-note">Quoted from Google and Facebook reviews. Names are shortened to protect privacy; longer reviews are trimmed where you see “…”.</p>
        <ReviewBrowser />
      </Section>
      <Section tone="night" labelledBy="dc-rfinal-title" className="dc-final">
        <div className="dc-final-inner">
          <h2 id="dc-rfinal-title">See for yourself</h2>
          <p className="dc-lede">Book a visit and find out why {reviewStats.distribution[0].count} customers gave five stars.</p>
          <CallBook tone="dark" />
        </div>
      </Section>
    </>
  )
}

export function AboutPage() {
  const menards = reviews.find(review => review.name === 'David H.')!
  return (
    <>
      <PageHero eyebrow="About Deer Creek" title="Family-owned in Olathe since 2017" lede="Deer Creek Plumbing is a family and locally owned plumbing company. We do residential and commercial work across the Kansas City metro, and we run it the way we’d want our own homes treated." />
      <Section tone="white" labelledBy="dc-story-title">
        <div className="dc-two-col dc-two-col-wide">
          <div className="dc-prose">
            <h2 id="dc-story-title">Small on purpose</h2>
            <p>Beau started Deer Creek in 2017, and it’s still small enough that customers know the people by name: Ryan, Mark and Matt in the field, and Laura in the office, who sets up the visit.</p>
            <p>Our certified plumbers bring over 100 years of combined experience and keep up with continuing education. We give same-day estimates, service is typically available within 24 hours, and every job carries a 1-year parts and labor warranty.</p>
            <blockquote className="dc-pullquote">
              <p>“My plan is to use the page to offer some maintenance reminders, tips, and tricks in the plumbing world to inform customers and potentially avoid costly repairs.”</p>
              <footer>Beau, on starting Deer Creek’s Facebook page</footer>
            </blockquote>
          </div>
          <figure className="dc-about-photo">
            <img src="/demos/deercreek/photos/truck-800.webp" alt="A Deer Creek plumber leans out of the company truck" width="800" height="1199" loading="lazy" />
          </figure>
        </div>
      </Section>
      <Section tone="sand" labelledBy="dc-values-title">
        <h2 id="dc-values-title">What you can count on</h2>
        <PromiseList />
      </Section>
      <Section tone="paper" labelledBy="dc-team2-title">
        <h2 id="dc-team2-title">The team</h2>
        <ul className="dc-team-cards">
          {team.map(person => (
            <li key={person.name}>
              <h3>{person.name}</h3>
              <p className="dc-team-role">{person.role}</p>
              <p>{person.note}</p>
              {person.mentions > 2 && <p className="dc-muted">Named in {person.mentions} Google reviews</p>}
            </li>
          ))}
        </ul>
        <div className="dc-story-review">
          <h3>Help even when you’re not a customer</h3>
          <ReviewCard review={menards} headingLevel={4} />
        </div>
      </Section>
      <Section tone="white" labelledBy="dc-brands-title">
        <div className="dc-two-col">
          <div>
            <h2 id="dc-brands-title">Brands we install</h2>
            <CheckList items={[...business.brands]} columns={1} />
            <p className="dc-note">We honor manufacturer warranties on everything we install.</p>
          </div>
          <div>
            <h2>Ways to pay</h2>
            <CheckList items={[...business.payments]} columns={1} />
          </div>
        </div>
      </Section>
      <Section tone="night" labelledBy="dc-abfinal-title" className="dc-final">
        <div className="dc-final-inner">
          <h2 id="dc-abfinal-title">Meet us at your place</h2>
          <CallBook tone="dark" />
        </div>
      </Section>
    </>
  )
}

export function SchedulePage() {
  return (
    <>
      <PageHero eyebrow="Book a visit" title="Book a plumber online" lede="It takes about two minutes. Tell us what’s wrong, pick a day and a time window, and the office will contact you by the next business day to confirm." />
      <Section tone="white" labelledBy="dc-book-title" className="dc-book">
        <h2 id="dc-book-title" className="dc-visually-hidden">Booking request</h2>
        <div className="dc-book-grid">
          <div className="dc-book-main">
            <noscript><p className="dc-callout">The online booking form needs JavaScript. Please call <a href={business.phoneHref}>{business.phone}</a> or email <a href={`mailto:${business.email}`}>{business.email}</a>.</p></noscript>
            <Scheduler />
          </div>
          <aside className="dc-book-aside" aria-label="Other ways to reach us">
            <div className="dc-aside-card dc-aside-urgent">
              <h3>Water leaking right now?</h3>
              <p>Shut off the main water valve, then call. It’s the fastest way to reach us.</p>
              <a className="dc-button" href={business.phoneHref}><PhoneIcon /> {business.phone}</a>
            </div>
            <div className="dc-aside-card">
              <h3><ClockIcon /> Office hours</h3>
              <p>{business.hours.days}, {business.hours.label}; closed Saturday and Sunday.</p>
            </div>
            <div className="dc-aside-card">
              <h3><ShieldIcon /> Every job includes</h3>
              <ul className="dc-aside-list">{promises.slice(0, 4).map(item => <li key={item.title}>{item.title}</li>)}</ul>
            </div>
          </aside>
        </div>
      </Section>
    </>
  )
}

export function FaqPage() {
  return (
    <>
      <PageHero eyebrow="Questions & answers" title="Plumbing questions, answered" lede="Straight answers about booking, pricing, emergencies and the work itself. Can’t find yours? Call the office and ask." />
      <Section tone="white" labelledBy="dc-faq-general">
        <div className="dc-faq-layout">
          <h2 id="dc-faq-general">Booking, pricing and hours</h2>
          <FaqList faqs={generalFaqs} />
        </div>
      </Section>
      {services.map((service, index) => (
        <Section key={service.slug} tone={index % 2 === 0 ? 'paper' : 'white'} labelledBy={`dc-faq-${service.slug}`}>
          <div className="dc-faq-layout">
            <div>
              <h2 id={`dc-faq-${service.slug}`}>{service.name}</h2>
              <p><a href={href(`services/${service.slug}`)}>About our {service.name.toLowerCase()} service <ArrowIcon /></a></p>
            </div>
            <FaqList faqs={service.faqs} />
          </div>
        </Section>
      ))}
    </>
  )
}

export function AccessibilityPage() {
  return (
    <>
      <PageHero eyebrow="Accessibility" title="Accessibility statement" lede="Deer Creek Plumbing wants every customer to be able to find what they need, book a visit and get help, whatever their ability or the technology they use." />
      <Section tone="white" labelledBy="dc-a11y-standard">
        <div className="dc-prose dc-prose-wide">
          <h2 id="dc-a11y-standard">Our standard</h2>
          <p>This website is designed and tested to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA. Body text meets the stronger AAA contrast level wherever it sits on a plain background.</p>
          <h2>What’s built in</h2>
          <CheckList columns={1} items={[
            'Every page and form works with a keyboard alone, with a clearly visible focus outline.',
            'A “Skip to main content” link at the top of every page.',
            'Headings, landmarks and labels that make sense to screen readers such as VoiceOver, NVDA and JAWS.',
            'The Atkinson Hyperlegible typeface, designed by the Braille Institute for readers with low vision.',
            'Pages that reflow at 400% zoom and on small screens without sideways scrolling.',
            'Animations that stop on their own, respect your device’s reduced-motion setting, and can be switched off.',
            'Form errors described in words, linked from a summary, and never shown by color alone.',
            'Buttons and links at least 44 pixels tall, so they are easy to tap.',
            'Text descriptions for every meaningful image.',
          ]} />
          <h2>Adjust the display</h2>
          <p>Use <strong>Display settings</strong> at the top of any page to make the text larger, raise the contrast, turn off motion, underline every link or add extra spacing. Your choices are saved on your device. Your browser’s own zoom and text-size settings also work throughout the site.</p>
          <h2>Help during a visit</h2>
          <p>When you book, you can tell us what makes a visit easier for your household. For example:</p>
          <CheckList columns={1} items={visitPreferences.filter(item => item !== 'Pets at home')} />
          <p>You can also call the office at <a href={business.phoneHref}>{business.phone}</a> and tell us. If you prefer writing, email <a href={`mailto:${business.email}`}>{business.email}</a> or send a text.</p>
          <h2>Known limitations</h2>
          <p>Links to Google Maps and Facebook open those services, which have their own accessibility. The service-area map is a simplified drawing; its information is always given as text beside it.</p>
          <h2>Tell us about a barrier</h2>
          <p>If anything on this site is hard to use, please let us know and we’ll fix it, and help you in the meantime. Call <a href={business.phoneHref}>{business.phone}</a>, text the same number, or email <a href={`mailto:${business.email}`}>{business.email}</a>. We aim to reply within two business days.</p>
          <p className="dc-muted">Statement prepared November 2026.</p>
        </div>
      </Section>
    </>
  )
}
