import BucyrusAppointment from './BucyrusAppointment'
import BucyrusFilm from './BucyrusFilm.tsx'

const MEDIA = '/media/bucyrus'
const PHONE = 'tel:+19134209865'

function Arrow() { return <span aria-hidden="true">↗</span> }
function Wordmark() {
  return <a className="ba-wordmark" href="#home" aria-label="Bucyrus Auto and Drivetrain home">
    <span className="ba-mark" aria-hidden="true">B<span>↗</span></span>
    <span>BUCYRUS AUTO<small>& DRIVETRAIN</small></span>
  </a>
}

function Hero() {
  return <section className="ba-hero" aria-labelledby="ba-title">
    <BucyrusFilm />
    <div className="ba-wrap ba-hero-content">
      <p className="ba-eyebrow"><span /> BUCYRUS, KANSAS</p>
      <h1 id="ba-title">For the love<br />of the <em>drive.</em></h1>
      <p className="ba-hero-lede">Auto repair. Drivetrain care.<br />A local shop for the road ahead.</p>
      <a className="ba-button" href="#appointment">Request an appointment <Arrow /></a>
      <a className="ba-hero-phone" href={PHONE}>Or give us a call <strong>(913) 420-9865</strong></a>
    </div>
    <p className="ba-image-note">Illustrative car imagery · Not customer vehicles</p>
  </section>
}

export default function BucyrusAuto() {
  return <div className="ba-site" id="home">
    <a className="ba-skip" href="#main">Skip to content</a>
    <div className="ba-demo-bar">A website concept for Bucyrus Auto & Drivetrain <span>by Wallace Shift · Demo only</span></div>
    <header className="ba-header">
      <div className="ba-wrap ba-header-inner">
        <Wordmark />
        <nav aria-label="Main navigation"><a href="#care">Auto care</a><a href="#shop">The shop</a><a href="#appointment">Get in touch</a></nav>
        <a className="ba-header-phone" href={PHONE}><span aria-hidden="true">↗</span> (913) 420-9865</a>
      </div>
    </header>
    <main id="main">
      <Hero />
      <div className="ba-intro-strip"><div className="ba-wrap"><span>LOCAL ROOTS.</span><span>MECHANICAL KNOW-HOW.</span><span>OPEN ROAD ENERGY.</span><a href="#care" aria-label="Explore auto care">↓</a></div></div>
      <section className="ba-section ba-wrap ba-care" id="care" aria-labelledby="care-title">
        <div className="ba-section-heading">
          <p className="ba-eyebrow">01 / WHAT BRINGS YOU IN?</p>
          <h2 id="care-title">Every drive starts<br />with the <em>details.</em></h2>
          <p>A new sound. A change in the way it drives. Something that just feels off. Tell us what you’re noticing and let’s start there.</p>
        </div>
        <div className="ba-care-list">
          <a href="#appointment"><span className="ba-list-number">01</span><div><h3>Auto repair</h3><p>Tell us about your vehicle and what needs attention.</p></div><Arrow /></a>
          <a href="#appointment"><span className="ba-list-number">02</span><div><h3>Drivetrain concerns</h3><p>A noise, vibration or change in shifting? Describe it here.</p></div><Arrow /></a>
          <a href="#appointment"><span className="ba-list-number">03</span><div><h3>Not sure where to start?</h3><p>You don’t need the technical terms. Start with a conversation.</p></div><Arrow /></a>
          <p className="ba-care-note">Call to confirm service availability for your vehicle.</p>
        </div>
      </section>
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
    </main>
    <footer className="ba-footer"><div className="ba-wrap"><div className="ba-footer-top"><Wordmark /><p>Here for the road ahead.</p><a href="#home">Back to top ↑</a></div><div className="ba-footer-bottom"><p>Website concept by <a href="https://www.wallaceshift.com">Wallace Shift</a>. Not the shop’s official website.</p><p>Hero vehicles are illustrative. Appointment form is a demo.</p></div></div></footer>
  </div>
}
