import BucyrusAppointment from './BucyrusAppointment'
import BucyrusFilm from './BucyrusFilm.tsx'
import { BUCYRUS_HOME, ServicePage, VehicleGuide } from './BucyrusPages'
import { bucyrusServices } from './serviceContent'

const MEDIA = '/media/bucyrus'
const PHONE = 'tel:+19134209865'

function Arrow() { return <span aria-hidden="true">↗</span> }
function Wordmark() {
  return <a className="ba-wordmark" href={BUCYRUS_HOME} aria-label="Bucyrus Auto and Drivetrain home">
    <span className="ba-logo-window"><img src={`${MEDIA}/logo.jpg`} alt="Bucyrus Auto and Drivetrain LLC" width="960" height="960" /></span>
  </a>
}

function Hero() {
  return <section className="ba-hero" aria-labelledby="ba-title">
    <BucyrusFilm />
    <div className="ba-wrap ba-hero-content">
      <p className="ba-eyebrow"><span /> BUCYRUS, KANSAS</p>
      <h1 id="ba-title">For the love<br />of the <em>drive.</em></h1>
      <p className="ba-hero-lede">Repair. Maintenance. Modifications.<br />Auto and drivetrain care in Bucyrus.</p>
      <a className="ba-button" href="#appointment">Request an appointment <Arrow /></a>
      <a className="ba-hero-phone" href={PHONE}>Or give us a call <strong>(913) 420-9865</strong></a>
    </div>
    <p className="ba-image-note">Illustrative car imagery · Not customer vehicles</p>
  </section>
}

export default function BucyrusAuto({ path = BUCYRUS_HOME }: { path?: string }) {
  const service = bucyrusServices.find(item => path === `${BUCYRUS_HOME}/services/${item.slug}`)
  const guide = path === `${BUCYRUS_HOME}/vehicle-guide`
  const home = !service && !guide
  return <div className="ba-site" id="home">
    <a className="ba-skip" href="#main">Skip to content</a>
    <header className="ba-header">
      <div className="ba-wrap ba-header-inner">
        <Wordmark />
        <nav aria-label="Main navigation"><a href={`${BUCYRUS_HOME}#care`}>Services</a><a href={`${BUCYRUS_HOME}/vehicle-guide`} aria-current={guide ? 'page' : undefined}>Vehicle guide</a><a href={`${BUCYRUS_HOME}#appointment`}>Request an appointment</a></nav>
        <a className="ba-header-phone" href={PHONE}><span aria-hidden="true">↗</span> (913) 420-9865</a>
      </div>
    </header>
    <main id="main">
      {service ? <ServicePage service={service} /> : guide ? <VehicleGuide /> : <>
      <Hero />
      <div className="ba-intro-strip"><div className="ba-wrap"><span>LOCAL ROOTS.</span><span>MECHANICAL KNOW-HOW.</span><span>OPEN ROAD ENERGY.</span><a href="#care" aria-label="Explore auto care">↓</a></div></div>
      <section className="ba-section ba-wrap ba-care" id="care" aria-labelledby="care-title">
        <div className="ba-section-heading">
          <p className="ba-eyebrow">01 / WHAT BRINGS YOU IN?</p>
          <h2 id="care-title">Auto repair &amp;<br />drivetrain care<br />in <em>Bucyrus.</em></h2>
          <p>From routine upkeep to a repair or a planned upgrade, tell us what your vehicle needs. We’ll start with a conversation.</p>
        </div>
        <div className="ba-care-list">
          {bucyrusServices.map((item, index) => <a key={item.slug} href={`${BUCYRUS_HOME}/services/${item.slug}`}><span className="ba-list-number">{String(index + 1).padStart(2, '0')}</span><div><h3>{item.name}</h3><p>{item.summary}</p><span className="ba-care-read">Explore this service</span></div><Arrow /></a>)}
          <p className="ba-care-note">Not sure where to start? Call to discuss your vehicle and confirm service availability.</p>
        </div>
      </section>
      <section className="ba-guide-invite" aria-labelledby="guide-invite-title"><div className="ba-wrap"><div><p className="ba-eyebrow">A GOOD PLACE TO START</p><h2 id="guide-invite-title">Something doesn’t<br /><em>feel right?</em></h2></div><div><p>A warning light. A new sound. A change in the way your car drives. Find out what to note, which warning signs need urgent help, and what to tell the shop.</p><a className="ba-button" href={`${BUCYRUS_HOME}/vehicle-guide`}>Explore the vehicle guide <Arrow /></a></div></div></section>
      <section className="ba-shop-section" id="shop" aria-labelledby="shop-title">
        <div className="ba-wrap ba-shop-grid">
          <figure className="ba-shop-image"><img src={`${MEDIA}/shop-classic.webp`} alt="Red and white classic car outside the shop in a supplied photograph" width="720" height="960" loading="lazy" /><figcaption>From the shop · Original supplied photo</figcaption></figure>
          <div className="ba-shop-copy"><p className="ba-eyebrow">02 / A LOOK INSIDE</p><h2 id="shop-title">Real work.<br />Right here in <em>Bucyrus.</em></h2><p>There’s more to a vehicle than what you see from the driver’s seat. Take a closer look at the shop, from a classic out front to the mechanical details underneath.</p>
            <figure className="ba-detail-image"><img src={`${MEDIA}/drivetrain.webp`} alt="Underbody view of a vehicle’s differential and axle in a supplied shop photograph" width="960" height="542" loading="lazy" /><figcaption>A closer look underneath · Original supplied photo</figcaption></figure>
            <a className="ba-text-link" href={PHONE}>Talk to the shop <Arrow /></a>
          </div>
        </div>
      </section>
      <section className="ba-section ba-wrap ba-appointment" id="appointment" aria-labelledby="appointment-title">
        <div className="ba-appointment-copy"><p className="ba-eyebrow">03 / LET’S TALK ABOUT YOUR CAR</p><h2 id="appointment-title">Your next<br />good <em>mile.</em></h2><p>Start with a few details about your vehicle and what you need. An appointment request is the beginning of a conversation, not a confirmed booking.</p><div className="ba-contact-block"><span>CALL THE SHOP</span><a href={PHONE}>(913) 420-9865 <Arrow /></a><p>Bucyrus, Kansas<br />Call for current hours and directions.</p></div><a className="ba-text-link" href="https://www.facebook.com/p/Bucyrus-Auto-Drivetrain-LLC-100090214147272/" target="_blank" rel="noreferrer">Find the shop on Facebook <Arrow /></a></div>
        <div className="ba-appointment-card"><h3>Request an appointment</h3><BucyrusAppointment /></div>
      </section>
      </>}
    </main>
    <footer className="ba-footer"><div className="ba-wrap"><div className="ba-footer-top"><Wordmark /><p>Here for the road ahead.</p><a href="#home">Back to top ↑</a></div><nav className="ba-footer-nav" aria-label="Auto care links">{bucyrusServices.map(item => <a href={`${BUCYRUS_HOME}/services/${item.slug}`} key={item.slug} aria-current={service?.slug === item.slug ? 'page' : undefined}>{item.name}</a>)}<a href={`${BUCYRUS_HOME}/vehicle-guide`} aria-current={guide ? 'page' : undefined}>Vehicle symptom guide</a>{!home && <a href={`${BUCYRUS_HOME}#appointment`}>Request an appointment</a>}</nav><div className="ba-footer-bottom"><p>Website concept by <a href="https://www.wallaceshift.com">Wallace Shift</a>. Not the shop’s official website.</p><p>Hero vehicles are illustrative. Appointment form is a demo.</p></div></div></footer>
  </div>
}
