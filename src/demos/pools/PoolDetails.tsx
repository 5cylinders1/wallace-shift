import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './details.css'

const inspirations = [
  {
    id: 'gathering',
    name: 'The gathering place',
    shortName: 'Classic & social',
    image: '/demos/pools/pool-complete.webp',
    alt: 'A rectangular turquoise pool framed by a warm stone terrace and a modern home',
    description: 'Room for the whole crew. A generous pool, an open terrace, and an easy rhythm between the house and the water.',
    note: 'Clean lines. Long afternoons.',
    detail: 'A place to come together',
  },
  {
    id: 'courtyard',
    name: 'The quiet courtyard',
    shortName: 'Intimate & architectural',
    image: '/demos/pools/courtyard.webp',
    alt: 'An intimate courtyard swimming pool surrounded by warm architectural walls and lush planting',
    description: 'A private little world. Thoughtful proportions, warm materials, and just enough water to make every day feel different.',
    note: 'A smaller footprint. A deeper breath.',
    detail: 'Your own corner of calm',
  },
  {
    id: 'natural',
    name: 'The natural escape',
    shortName: 'Organic & relaxed',
    image: '/demos/pools/organic.webp',
    alt: 'A softly curved swimming pool with natural stone and a leafy woodland setting',
    description: 'Let the landscape lead. Soft curves, textured stone, and planting that makes the water feel like it has always belonged.',
    note: 'Soft edges. An open invitation.',
    detail: 'Closer to the natural world',
  },
] as const

type InspirationId = typeof inspirations[number]['id']
type ProjectBrief = {
  style: typeof inspirations[number]
  features: string[]
  timeframe: string
  notes: string
}

const features = ['Spa', 'Sun shelf', 'Lighting']
const steps = [
  {
    number: '01',
    title: 'Discover your backyard.',
    body: 'Start with how you want to spend your time. The space, the landscape, and the little things that would make it feel like yours.',
    detail: 'Listen / Explore / Imagine',
  },
  {
    number: '02',
    title: 'Design the details.',
    body: 'Bring the ideas into focus. Explore the shape of the water, the materials underfoot, and how everything connects to your home.',
    detail: 'Shape / Refine / Plan',
  },
  {
    number: '03',
    title: 'Bring it to life.',
    body: 'Turn the shared vision into a clear project plan, with the scope, site requirements, and next steps worked out together.',
    detail: 'Coordinate / Create / Enjoy',
  },
]

const questions = [
  {
    question: 'Where do I start?',
    answer: 'Start with the way you want to use your backyard. A place for family time, a quiet morning swim, or weekends with friends all point toward different possibilities. The planner below helps put those first ideas on paper.',
  },
  {
    question: 'Can a smaller backyard work?',
    answer: 'A smaller space can inspire a very thoughtful pool. The right design depends on the property, access, setbacks, and local requirements. A site assessment is the next step before deciding what will fit.',
  },
  {
    question: 'What determines the project cost?',
    answer: 'Pool size, site conditions, access, materials, equipment, and features all influence the scope. A useful estimate starts with a clear design and an understanding of the property. This concept planner does not provide a price or a quote.',
  },
  {
    question: 'How long does a pool project take?',
    answer: 'Design decisions, approvals, weather, site preparation, and the construction schedule all affect timing. Share your ideal timeframe as a starting point, then confirm a realistic schedule with the contractor after the site and scope are reviewed.',
  },
]

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {diagonal ? <path d="M6 18 18 6M6 6h12v12" /> : <path d="M4 12h15m-6-6 6 6-6 6" />}
    </svg>
  )
}

export default function PoolDetails() {
  const [selectedId, setSelectedId] = useState<InspirationId>('gathering')
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [timeframe, setTimeframe] = useState('')
  const [notes, setNotes] = useState('')
  const [brief, setBrief] = useState<ProjectBrief | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const styleRef = useRef<HTMLSelectElement>(null)
  const inspiration = inspirations.find((item) => item.id === selectedId) ?? inspirations[0]
  const inspirationSrcSet = `${inspiration.image.replace('.webp', '-mobile.webp')} 1000w, ${inspiration.image} 1672w`

  useEffect(() => {
    if (brief) resultRef.current?.focus()
  }, [brief])

  function selectInspiration(id: InspirationId) {
    if (id === selectedId) return
    setSelectedId(id)
    setBrief(null)
  }

  function toggleFeature(feature: string) {
    setSelectedFeatures((previous) => previous.includes(feature)
      ? previous.filter((item) => item !== feature)
      : [...previous, feature])
  }

  function createBrief(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBrief({ style: inspiration, features: [...selectedFeatures], timeframe, notes: notes.trim() })
  }

  function editBrief() {
    setBrief(null)
    requestAnimationFrame(() => styleRef.current?.focus())
  }

  const briefText = brief ? [
    'MY BACKYARD PROJECT',
    'Stillwater Pool Co concept planner',
    '',
    `Inspiration: ${brief.style.name}`,
    `Style: ${brief.style.shortName}`,
    `Features: ${brief.features.length ? brief.features.join(', ') : 'Open to ideas'}`,
    `Ideal timeframe: ${brief.timeframe}`,
    `Notes: ${brief.notes || 'No additional notes'}`,
    '',
    'This is an idea brief, not a quote or a project booking.',
    'Created locally in your browser. Nothing was sent.',
    'Website concept by Wallace Shift. https://wallaceshift.com',
  ].join('\n') : ''

  return (
    <div className="sw-details">
      <section className="sw-inspiration sw-section" id="inspiration" aria-labelledby="sw-inspiration-heading">
        <div className="sw-section-topline"><span>A life with water</span><span>01 / Inspiration</span></div>
        <div className="sw-inspiration-intro">
          <h2 id="sw-inspiration-heading">Your kind<br />of <em>outside.</em></h2>
          <div className="sw-intro-copy">
            <p>The best part of your home might be just beyond the back door.</p>
            <p>Make room for slow mornings, impromptu gatherings, and a little more of the life you love.</p>
          </div>
        </div>
        <div className="sw-inspiration-grid">
          <figure className="sw-inspiration-photo">
            <div className="sw-inspiration-image-wrap">
              <img key={inspiration.image} src={inspiration.image} srcSet={inspirationSrcSet} sizes="(max-width: 740px) calc(100vw - 48px), (max-width: 1050px) calc(55vw - 66px), (max-width: 1700px) 48vw, 800px" alt={inspiration.alt} loading="lazy" decoding="async" width="1672" height="941" />
              <span className="sw-photo-mark" aria-hidden="true">S<span>~</span>W</span>
            </div>
            <figcaption><span>{inspiration.note}</span><span>Concept imagery</span></figcaption>
          </figure>
          <div className="sw-inspiration-menu">
            <p className="sw-eyebrow">Find your feeling</p>
            <div className="sw-inspiration-choices" aria-label="Pool inspiration">
              {inspirations.map((item, index) => (
                <button type="button" className={item.id === selectedId ? 'is-active' : ''} key={item.id} aria-pressed={item.id === selectedId} aria-controls="sw-selected-inspiration" onClick={() => selectInspiration(item.id)}>
                  <span className="sw-choice-number">0{index + 1}</span>
                  <span>{item.name}</span>
                  <Arrow diagonal />
                </button>
              ))}
            </div>
            <div className="sw-inspiration-description" id="sw-selected-inspiration" aria-live="polite" aria-atomic="true">
              <span className="sw-eyebrow">{inspiration.shortName}</span>
              <p>{inspiration.description}</p>
            </div>
            <a className="sw-text-link" href="#plan">Make it your own <Arrow /></a>
          </div>
        </div>
      </section>

      <section className="sw-approach sw-section" id="approach" aria-labelledby="sw-approach-heading">
        <div className="sw-section-topline"><span>Thoughtfully, from the start</span><span>02 / The approach</span></div>
        <div className="sw-approach-header">
          <h2 id="sw-approach-heading">Great spaces.<br /><em>Clear beginnings.</em></h2>
          <p>A backyard should feel effortless.<br />Getting there deserves a thoughtful plan.</p>
        </div>
        <div className="sw-process-list">
          {steps.map((step) => (
            <article className="sw-process-row" key={step.number}>
              <span className="sw-process-number">{step.number}</span>
              <h3>{step.title}</h3>
              <div className="sw-process-copy"><p>{step.body}</p><span>{step.detail}</span></div>
            </article>
          ))}
        </div>
      </section>

      <section className="sw-questions sw-section" aria-labelledby="sw-questions-heading">
        <div className="sw-questions-intro">
          <p className="sw-eyebrow">A little clarity</p>
          <h2 id="sw-questions-heading">Good<br /><em>questions.</em></h2>
          <p>Every backyard is different.<br />Here is a place to begin.</p>
        </div>
        <div className="sw-faq-list">
          {questions.map((item, index) => (
            <details className="sw-faq" key={item.question}>
              <summary><span className="sw-faq-number">0{index + 1}</span><span>{item.question}</span><span className="sw-faq-toggle" aria-hidden="true" /></summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="sw-planner sw-section" id="plan" aria-labelledby="sw-planner-heading">
        <div className="sw-section-topline"><span>Start with a possibility</span><span>03 / Your backyard</span></div>
        <div className="sw-planner-grid">
          <div className="sw-planner-intro">
            <p className="sw-eyebrow">The first step is a small one</p>
            <h2 id="sw-planner-heading">Let’s make<br /><em>room for it.</em></h2>
            <p>A few ideas today. A clearer picture of your backyard tomorrow. Build a simple brief you can save and share.</p>
            <div className="sw-planner-preview">
              <img src={inspiration.image} srcSet={inspirationSrcSet} sizes="(max-width: 740px) 79px, 103px" alt="" loading="lazy" decoding="async" width="1672" height="941" />
              <div><span>Your inspiration</span><p>{inspiration.name}</p></div>
            </div>
          </div>
          <div className="sw-planner-panel">
            {brief ? (
              <div className="sw-brief" ref={resultRef} tabIndex={-1}>
                <span className="sw-brief-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m6 12 4 4 8-8" /></svg></span>
                <p className="sw-eyebrow">A good place to begin</p>
                <h3>Your project brief is ready.</h3>
                <p className="sw-brief-lead">Save these ideas for your first conversation.</p>
                <dl>
                  <div><dt>The feeling</dt><dd>{brief.style.name}</dd></div>
                  <div><dt>The details</dt><dd>{brief.features.length ? brief.features.join(', ') : 'Open to ideas'}</dd></div>
                  <div><dt>The timing</dt><dd>{brief.timeframe}</dd></div>
                  {brief.notes && <div><dt>Your notes</dt><dd>{brief.notes}</dd></div>}
                </dl>
                <a className="sw-planner-submit" href={`data:text/plain;charset=utf-8,${encodeURIComponent(briefText)}`} download="my-backyard-project.txt">Download your brief <Arrow diagonal /></a>
                <button className="sw-edit-brief" type="button" onClick={editBrief}>Edit my ideas</button>
                <p className="sw-planner-notice">Saved to this page only. Nothing was sent.</p>
              </div>
            ) : (
              <form className="sw-planner-form" onSubmit={createBrief}>
                <div className="sw-form-field">
                  <label htmlFor="sw-project-style">What feels like you?</label>
                  <div className="sw-select-wrap"><select ref={styleRef} id="sw-project-style" value={selectedId} onChange={(event) => selectInspiration(event.target.value as InspirationId)}>
                    {inspirations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select></div>
                </div>
                <fieldset className="sw-feature-field">
                  <legend>A few details you might love</legend>
                  <div className="sw-feature-options">
                    {features.map((feature) => (
                      <label key={feature} className={selectedFeatures.includes(feature) ? 'is-checked' : ''}>
                        <input type="checkbox" name="features" value={feature} checked={selectedFeatures.includes(feature)} onChange={() => toggleFeature(feature)} />
                        <span className="sw-checkbox-mark" aria-hidden="true" />{feature}
                      </label>
                    ))}
                  </div>
                  <span className="sw-field-hint">Choose any, or leave room for ideas.</span>
                </fieldset>
                <div className="sw-form-field">
                  <label htmlFor="sw-project-timeframe">When are you imagining this? <span>Required</span></label>
                  <div className="sw-select-wrap"><select id="sw-project-timeframe" value={timeframe} onChange={(event) => setTimeframe(event.target.value)} required>
                    <option value="" disabled>Choose a timeframe</option>
                    <option value="As soon as it makes sense">As soon as it makes sense</option>
                    <option value="Within the next year">Within the next year</option>
                    <option value="A little further out">A little further out</option>
                    <option value="Just exploring for now">Just exploring for now</option>
                  </select></div>
                </div>
                <div className="sw-form-field">
                  <label htmlFor="sw-project-notes">Anything else on your mind? <span>Optional</span></label>
                  <textarea id="sw-project-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={1200} placeholder="A favorite material, a small backyard, a big idea…" />
                </div>
                <button className="sw-planner-submit" type="submit">Create my project brief <Arrow diagonal /></button>
                <p className="sw-planner-notice">Concept planner. Nothing is sent.</p>
              </form>
            )}
          </div>
        </div>
      </section>

      <footer className="sw-footer">
        <div className="sw-footer-main">
          <a className="sw-footer-wordmark" href="#top" aria-label="Stillwater Pool Co, back to top">stillwater<span>POOL CO.</span></a>
          <p>A little closer to<br /><em>the good life.</em></p>
          <a className="sw-footer-top" href="#top">Back to top <Arrow diagonal /></a>
        </div>
        <div className="sw-footer-bottom"><span>Stillwater Pool Co. / A website concept</span><a href="https://wallaceshift.com" target="_blank" rel="noopener noreferrer">Imagined by Wallace Shift <Arrow diagonal /></a></div>
      </footer>
    </div>
  )
}
