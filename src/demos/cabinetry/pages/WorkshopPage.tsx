import { specs, workshopChapters } from '../content'
import Photo from '../components/Photo'
import { ClosingCta, ProcessSection, SectionHead } from '../components/Sections'

export default function WorkshopPage() {
  return <main id="main" className="tb-workshop-page">
    <section className="tb-page-hero" aria-labelledby="tb-page-title">
      <Photo slug="shop-hand-plane" className="tb-page-hero-photo" sizes="100vw" position="50% 55%" priority />
      <div className="tb-wrap tb-page-hero-inner">
        <p className="tb-label">The workshop</p>
        <h1 id="tb-page-title" tabIndex={-1}>Built under one roof, <em>fitted in your room.</em></h1>
      </div>
    </section>

    <section className="tb-section" aria-label="How a cabinet is made">
      <div className="tb-wrap">
        <p className="tb-big-copy tb-measure" data-reveal>Nothing about a Tambour kitchen comes out of a carton. Every case, door and drawer is cut, joined and finished in our Kansas City shop for one room, then installed by the same people who built it.</p>
      </div>
      <ol className="tb-chapters">
        {workshopChapters.map((chapter, n) => <li key={chapter.slug} className={`tb-chapter ${n % 2 ? 'is-flipped' : ''}`}>
          <div className="tb-chapter-image"><Photo slug={chapter.slug} sizes="(min-width: 900px) 55vw, 100vw" /></div>
          <div className="tb-chapter-text" data-reveal>
            <p className="tb-room-n" aria-hidden="true">{String(n + 1).padStart(2, '0')}</p>
            <h2>{chapter.title}</h2>
            <p>{chapter.body}</p>
          </div>
        </li>)}
      </ol>
    </section>

    <section className="tb-section tb-ink" aria-labelledby="tb-spec-title">
      <div className="tb-wrap tb-spec-grid">
        <SectionHead kicker="Inside every cabinet" title="The parts" em="you never see." id="tb-spec-title" light>
          <p>Our standard construction, before a single upgrade. The difference shows up in year ten, not on day one.</p>
        </SectionHead>
        <dl className="tb-spec-list" data-reveal>
          {specs.map(spec => <div key={spec.label}><dt>{spec.label}</dt><dd>{spec.value}</dd></div>)}
        </dl>
      </div>
    </section>

    <ProcessSection />
    <ClosingCta />
  </main>
}
