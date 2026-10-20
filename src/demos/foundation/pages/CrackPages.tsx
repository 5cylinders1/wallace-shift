import { useEffect } from 'react'
import { href, onLink } from '../routes'
import CrackDecoder, { SymptomResult, TierBadge } from '../sections/CrackDecoder'
import CrackFigure from '../sections/CrackFigure'
import { areas, symptomBySlug, symptoms, type Area } from '../symptoms'

export function CracksPage() {
  useEffect(() => { document.title = 'Crack decoder: is my foundation crack serious? | Datum Foundation & Waterproofing' }, [])
  return <main id="main" className="dt-page">
    <div className="dt-wrap">
      <nav className="dt-crumbs" aria-label="Breadcrumb"><a href={href.home()} onClick={onLink}>Home</a><span aria-hidden="true">/</span><span aria-current="page">Crack decoder</span></nav>
      <header className="dt-page-head">
        <p className="dt-eyebrow">Crack decoder</p>
        <h1>Is this crack serious?</h1>
        <p className="dt-lede">Most aren’t. Pick what you’re seeing for the usual cause, how soon to act and what the fix usually involves. It’s a guide, not a diagnosis.</p>
      </header>
      <CrackDecoder />
      <section className="dt-index" aria-labelledby="all-symptoms">
        <h2 id="all-symptoms">All ten symptoms</h2>
        {(Object.keys(areas) as Area[]).map(area => <div key={area} className="dt-index-group">
          <h3>{areas[area]}</h3>
          <ul>{symptoms.filter(item => item.area === area).map(item => <li key={item.slug}>
            <a href={href.crack(item.slug)} onClick={onLink}>
              <CrackFigure figure={item.figure} />
              <span className="dt-index-title">{item.title}</span>
              <TierBadge tier={item.tier} />
            </a>
          </li>)}</ul>
        </div>)}
      </section>
    </div>
  </main>
}

export function CrackPage({ slug }: { slug: string }) {
  const symptom = symptomBySlug(slug)
  useEffect(() => { document.title = symptom ? `${symptom.title}: what it means | Datum Foundation & Waterproofing` : 'Not found | Datum' }, [symptom])
  if (!symptom) return <main id="main" className="dt-page"><div className="dt-wrap dt-page-head">
    <h1>We couldn’t find that page.</h1>
    <p><a className="dt-text-link" href={href.cracks()} onClick={onLink}>Go to the crack decoder →</a></p>
  </div></main>
  const related = symptoms.filter(item => item.slug !== symptom.slug && (item.area === symptom.area || item.repairs.some(id => symptom.repairs.includes(id)))).slice(0, 3)
  return <main id="main" className="dt-page">
    <div className="dt-wrap">
      <nav className="dt-crumbs" aria-label="Breadcrumb"><a href={href.home()} onClick={onLink}>Home</a><span aria-hidden="true">/</span><a href={href.cracks()} onClick={onLink}>Crack decoder</a><span aria-hidden="true">/</span><span aria-current="page">{symptom.short}</span></nav>
      <article className="dt-symptom-page">
        <header className="dt-symptom-head">
          <div>
            <p className="dt-eyebrow">{areas[symptom.area]}</p>
            <h1>{symptom.title}</h1>
            <p className="dt-lede">{symptom.meaning}</p>
          </div>
          <CrackFigure figure={symptom.figure} className="dt-figure dt-figure-large" />
        </header>
        <SymptomResult symptom={symptom} headingLevel={2} hideMeaning />
        <p className="dt-sources">Based on published home-inspection guidance on foundation cracks and drainage. Datum’s urgency labels are its own and are not an engineering standard.</p>
      </article>
      {related.length > 0 && <section className="dt-related" aria-labelledby="related-title">
        <h2 id="related-title">Often seen with this</h2>
        <ul>{related.map(item => <li key={item.slug}><a href={href.crack(item.slug)} onClick={onLink}><CrackFigure figure={item.figure} /><span>{item.title}</span></a></li>)}</ul>
      </section>}
    </div>
  </main>
}
