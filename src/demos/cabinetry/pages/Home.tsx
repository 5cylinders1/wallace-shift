import { pillars } from '../content'
import { href, onLink } from '../routes'
import BuildHero from '../components/BuildHero'
import MaterialLibrary from '../components/MaterialLibrary'
import Photo from '../components/Photo'
import { ClosingCta, FaqSection, InvestmentTeaser, ProcessSection, SectionHead, WorkshopStrip } from '../components/Sections'
import TambourDoor from '../components/TambourDoor'

function Statement() {
  return <section className="tb-section tb-statement" aria-labelledby="tb-statement-title">
    <div className="tb-wrap tb-statement-grid">
      <div data-reveal>
        <p className="tb-label">The difference</p>
        <h2 id="tb-statement-title">We don’t sell cabinet boxes. <em>We draw rooms.</em></h2>
      </div>
      <div className="tb-statement-body" data-reveal>
        <p className="tb-big-copy">A stock cabinet is built to a catalog size and patched in around your walls. Ours start with a tape measure in your kitchen, become drawings you approve line by line, and are built to fit the room that exists, including the wall that is not quite plumb.</p>
        <ol className="tb-pillars">
          {pillars.map((pillar, n) => <li key={pillar.title}><span aria-hidden="true">{String(n + 1).padStart(2, '0')}</span><h3>{pillar.title}</h3><p>{pillar.body}</p></li>)}
        </ol>
      </div>
    </div>
  </section>
}

const roomBlocks = [
  { page: 'kitchens', kicker: 'Kitchens', title: 'The room everyone', em: 'ends up in.', body: 'Islands sized for how you gather, pantries that swallow a week of groceries, and drawers right where the pots go.', slug: 'kitchen-island-brass', cta: 'See kitchens' },
  { page: 'baths', kicker: 'Baths', title: 'Quiet, considered,', em: 'built to stay dry.', body: 'Vanities, linen towers and tub surrounds in sealed hardwoods and stone, with the whole remodel built around them.', slug: 'bath-arabescato', cta: 'See baths' },
  { page: 'built-ins', kicker: 'Built-ins', title: 'Every room has a wall', em: 'that could work harder.', body: 'Dressing rooms, libraries, laundry rooms and media walls, made with the same joinery as our kitchens.', slug: 'builtin-dressing-room', cta: 'See built-ins' },
] as const

function Rooms() {
  return <section className="tb-section tb-rooms" aria-label="Kitchens, baths and built-ins">
    {roomBlocks.map((block, n) => <article key={block.page} className={`tb-room ${n % 2 ? 'is-flipped' : ''}`}>
      <a className="tb-room-image" href={href.page(block.page)} onClick={onLink} tabIndex={-1} aria-hidden="true">
        <Photo slug={block.slug} sizes="(min-width: 900px) 60vw, 100vw" decorative />
      </a>
      <div className="tb-room-text" data-reveal>
        <p className="tb-room-n" aria-hidden="true">{String(n + 1).padStart(2, '0')}</p>
        <p className="tb-label">{block.kicker}</p>
        <h2>{block.title} <em>{block.em}</em></h2>
        <p>{block.body}</p>
        <a className="tb-link-arrow" href={href.page(block.page)} onClick={onLink}>{block.cta} <span aria-hidden="true">→</span></a>
      </div>
    </article>)}
  </section>
}

function DoorSection() {
  return <section className="tb-section tb-paper-2" aria-labelledby="tb-door-title">
    <div className="tb-wrap tb-door-grid">
      <div className="tb-door-copy" data-reveal>
        <p className="tb-label">Our namesake</p>
        <h2 id="tb-door-title">The tambour <em>door.</em></h2>
        <p className="tb-big-copy">A tambour is a door of narrow wooden slats glued to a flexible backing, so it rolls up and slides out of sight.</p>
        <p>Cabinetmakers have built them since the late 1700s, first for writing desks. We still make them by hand, most often to hide the espresso machine and the toaster behind a counter that stays clear.</p>
        <dl className="tb-facts">
          <div><dt>Slats</dt><dd>Solid walnut or oak, eased on every edge</dd></div>
          <div><dt>Backing</dt><dd>Canvas, glued under clamps</dd></div>
          <div><dt>Track</dt><dd>Routed into the cabinet sides</dd></div>
        </dl>
      </div>
      <TambourDoor />
    </div>
  </section>
}

export default function Home() {
  return <main id="main" className="tb-home">
    <BuildHero />
    <Statement />
    <Rooms />
    <DoorSection />
    <WorkshopStrip />
    <section id="materials" className="tb-section" aria-labelledby="tb-materials-title">
      <div className="tb-wrap">
        <SectionHead kicker="Material library" title="Touch it" em="before you choose it." id="tb-materials-title">
          <p>Pick up to six samples. We bring the real boards, stone and hardware to your consultation, and you see them in your own light.</p>
        </SectionHead>
        <MaterialLibrary />
      </div>
    </section>
    <ProcessSection dark />
    <InvestmentTeaser />
    <FaqSection />
    <ClosingCta />
  </main>
}
