import { pexelsUrl, photoList, photoSrc } from '../photos'

const scans = [
  ['American walnut', 'american_walnut_veneer'], ['White oak', 'white_oak_veneer'], ['Oak', 'oak_veneer_01'],
  ['Cherry', 'cherry_veneer'], ['White maple', 'white_maple_veneer'], ['Smoked walnut', 'smoked_walnut_veneer'],
]

export default function PhotographyPage() {
  return <main id="main" className="tb-credits-page">
    <section className="tb-page-head" aria-labelledby="tb-page-title">
      <div className="tb-wrap">
        <p className="tb-label">Photography</p>
        <h1 id="tb-page-title" tabIndex={-1} data-split>Credits, <em>and what is real.</em></h1>
        <p className="tb-page-lede">Tambour is fictional. Apart from the build sequence at the top of the home page, every photograph on this site is a real photograph of a real room or workshop, used under the Pexels license as a stand-in for a cabinetmaker’s own project photography. None of the work shown was built by Tambour.</p>
      </div>
    </section>
    <section className="tb-wrap tb-credits" aria-label="Photograph credits">
      <dl className="tb-facts is-stacked">
        <div><dt>Home page build</dt><dd>Generated concept imagery, not photographs: one finished kitchen and four earlier construction stages from the same camera position, plus a blueprint and a wireframe drawn from it (OpenAI gpt-image-2). It illustrates the process; it is not a documented project.</dd></div>
        <div><dt>Wood samples</dt><dd>Real veneer scans from <a href="https://polyhaven.com/textures" target="_blank" rel="noreferrer">Poly Haven</a> (CC0): {scans.map(([name, id], n) => <span key={id}>{n ? ', ' : ''}<a href={`https://polyhaven.com/a/${id}`} target="_blank" rel="noreferrer">{name}</a></span>)}. Shown with a simulated oil or matte finish.</dd></div>
        <div><dt>Stone samples</dt><dd>Cropped from the photographs below.</dd></div>
        <div><dt>Editing</dt><dd>All photographs were graded for a consistent tone. Nothing else was added or removed.</dd></div>
      </dl>
      <ul className="tb-credit-list">
        {photoList.map(item => <li key={item.slug}>
          <img src={photoSrc(item.slug, 1000)} alt="" loading="lazy" decoding="async" width={item.w} height={item.h} />
          <div>
            <p>{item.alt}</p>
            <p className="tb-muted">{item.photographer} · <a href={pexelsUrl(item.pexelsId)} target="_blank" rel="noreferrer">Pexels {item.pexelsId}</a></p>
          </div>
        </li>)}
      </ul>
    </section>
  </main>
}
