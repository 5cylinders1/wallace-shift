import { rooms, type Room } from '../content'
import { href, onLink } from '../routes'
import { builds } from '../builds'
import Anatomy from '../components/Anatomy'
import BuildFilm from '../components/BuildFilm'
import Lookbook from '../components/Lookbook'
import Photo from '../components/Photo'
import { ClosingCta, SectionHead } from '../components/Sections'
import TambourDoor from '../components/TambourDoor'

/** Kitchens, baths and built-ins share one editorial template. */
export default function RoomPage({ page }: { page: Room['page'] }) {
  const room = rooms[page]
  return <main id="main" className={`tb-room-page is-${page}`}>
    {room.build ? <BuildFilm build={builds[room.build]} titleId="tb-page-title" short intro={<>
      <p className="tb-label">{room.kicker}</p>
      <h1 id="tb-page-title" tabIndex={-1} data-split>{room.title} <em>{room.em}</em></h1>
      <p className="tb-build-lede">{room.lede}</p>
      <div className="tb-actions">
        <a className="tb-button tb-button-brass" href={href.page('consultation')} onClick={onLink}>Book a design consultation</a>
        <a className="tb-button tb-button-line is-light" href="#tb-lookbook-title">See the lookbook</a>
      </div>
    </>} /> : <section className="tb-page-hero" aria-labelledby="tb-page-title">
      <div className="tb-page-hero-media" data-drift data-settle="load"><Photo slug={room.hero} className="tb-page-hero-photo" sizes="100vw" position={room.heroPosition} priority /></div>
      <div className="tb-wrap tb-page-hero-inner">
        <p className="tb-label" data-reveal>{room.kicker}</p>
        <h1 id="tb-page-title" tabIndex={-1} data-split>{room.title} <em>{room.em}</em></h1>
      </div>
    </section>}

    <section className="tb-section" aria-label="Overview">
      <div className="tb-wrap tb-intro-grid">
        <p className="tb-big-copy" data-split>{room.intro}</p>
        <dl className="tb-facts is-stacked" data-reveal>
          {room.facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
        </dl>
      </div>
    </section>

    <section className="tb-section tb-paper-2" aria-labelledby="tb-lookbook-title">
      <div className="tb-wrap">
        <SectionHead kicker="Lookbook" title="Rooms in" em="real light." id="tb-lookbook-title">
          <p>Open any photograph to see it larger. These are licensed photographs standing in for a cabinetmaker’s own project photography.</p>
        </SectionHead>
        <Lookbook items={room.lookbook} label={`${room.kicker} photographs`} />
      </div>
    </section>

    {page === 'kitchens' && <section className="tb-section" aria-labelledby="tb-anatomy-title">
      <div className="tb-wrap">
        <SectionHead kicker="Anatomy of a kitchen" title="What custom looks like" em="up close." id="tb-anatomy-title">
          <p>Each number is a decision we make with you during design. Choose one to read about it.</p>
        </SectionHead>
        <Anatomy />
      </div>
    </section>}

    <section className={`tb-section ${page === 'kitchens' ? 'tb-ink' : ''}`} aria-labelledby="tb-features-title">
      <div className="tb-wrap">
        <SectionHead kicker={room.kicker} title={room.featuresTitle} id="tb-features-title" light={page === 'kitchens'} />
        <ul className="tb-features">
          {room.features.map(feature => <li key={feature.title}>
            {feature.slug && <div className="tb-feature-image" data-uncover><Photo slug={feature.slug} sizes="(min-width: 900px) 30vw, 100vw" /></div>}
            <h3 data-reveal>{feature.title}</h3>
            <p data-reveal>{feature.body}</p>
          </li>)}
        </ul>
      </div>
    </section>

    {page === 'kitchens' && <section className="tb-section tb-paper-2" aria-labelledby="tb-door-title">
      <div className="tb-wrap tb-door-grid">
        <div className="tb-door-copy">
          <p className="tb-label" data-reveal>Appliance garages</p>
          <h2 id="tb-door-title" data-split>A clear counter, <em>every morning.</em></h2>
          <p className="tb-big-copy" data-split>The espresso machine, the toaster and the chargers live behind a tambour door that rolls up when you need them and disappears when you don’t.</p>
          <p data-reveal>Outlets, ventilation and a pull-out shelf are planned into the cabinet, so nothing is unplugged to put it away.</p>
        </div>
        <TambourDoor />
      </div>
    </section>}

    <section className="tb-section tb-next" aria-label="Next steps">
      <div className="tb-wrap tb-next-grid">
        <a href={href.home('#materials')} onClick={onLink} className="tb-next-card" data-reveal>
          <p className="tb-label">Touch it</p>
          <h3>The material library</h3>
          <p>Choose up to six samples to see at your consultation.</p>
          <span className="tb-link-arrow">Choose samples <span aria-hidden="true">→</span></span>
        </a>
        <a href={href.page('investment')} onClick={onLink} className="tb-next-card" data-reveal>
          <p className="tb-label">Plan it</p>
          <h3>Planning prices</h3>
          <p>A range for your room before anyone visits.</p>
          <span className="tb-link-arrow">Build a range <span aria-hidden="true">→</span></span>
        </a>
        <a href={href.page('workshop')} onClick={onLink} className="tb-next-card" data-reveal>
          <p className="tb-label">See it made</p>
          <h3>The workshop</h3>
          <p>How a Tambour cabinet is built, and what is inside it.</p>
          <span className="tb-link-arrow">Read <span aria-hidden="true">→</span></span>
        </a>
      </div>
    </section>
    <ClosingCta />
  </main>
}
