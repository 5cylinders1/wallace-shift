import { useRef, useState, type KeyboardEvent } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { collections, links, titleHref, titleSrc } from './content'
import { useReducedMotion } from './hooks'

gsap.registerPlugin(useGSAP)

/** The catalog's own three shelves, as tabs over one horizontally scrolling rail. */
export default function Catalog() {
  const reduced = useReducedMotion()
  const [active, setActive] = useState(collections[0].id)
  const rail = useRef<HTMLUListElement>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const switched = useRef(false)
  const current = collections.find((c) => c.id === active) ?? collections[0]

  useGSAP(() => {
    if (!switched.current) return
    rail.current?.scrollTo({ left: 0 })
    if (reduced) return
    gsap.from('.otv-card', { opacity: 0, y: 16, duration: 0.5, stagger: 0.035, ease: 'power2.out' })
  }, { dependencies: [active], scope: rail })

  const select = (id: string) => {
    switched.current = true
    setActive(id)
  }

  const onTabKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = collections.findIndex((c) => c.id === active)
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    event.preventDefault()
    const next = (index + step + collections.length) % collections.length
    select(collections[next].id)
    tabs.current[next]?.focus()
  }

  const scroll = (direction: 1 | -1) => {
    const node = rail.current
    if (!node) return
    node.scrollBy({ left: direction * node.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <section id="watch" className="otv-catalog otv-dark" aria-labelledby="otv-catalog-title">
      <div className="otv-wrap">
        <div className="otv-catalog-head" data-rise>
          <div>
            <p className="otv-kicker otv-kicker--live"><i aria-hidden="true" />On the OTV app</p>
            <h2 id="otv-catalog-title" className="otv-h2">now streaming.</h2>
          </div>
          <div className="otv-tabs" role="tablist" aria-label="Collections" onKeyDown={onTabKeys}>
            {collections.map((c, i) => (
              <button
                key={c.id}
                ref={(node) => { tabs.current[i] = node }}
                type="button"
                role="tab"
                id={`otv-tab-${c.id}`}
                aria-selected={c.id === active}
                aria-controls="otv-rail-panel"
                tabIndex={c.id === active ? 0 : -1}
                className="otv-tab"
                onClick={() => select(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div id="otv-rail-panel" role="tabpanel" aria-labelledby={`otv-tab-${current.id}`} className="otv-rail-panel">
        <p className="otv-wrap otv-rail-note">{current.note}</p>
        <ul ref={rail} className={`otv-rail${current.titles[0]?.poster ? ' is-posters' : ''}`}>
          {current.titles.map((title) => (
            <li key={`${current.id}-${title.slug}`} className={`otv-card${title.poster ? ' is-poster' : ''}`}>
              <a href={titleHref(title.slug)}>
                <span className="otv-card-media">
                  <img src={titleSrc(title)} alt="" loading="lazy" decoding="async" width={title.poster ? 600 : 800} height={title.poster ? 900 : 450} />
                </span>
                <span className="otv-card-title">{title.title}</span>
                <span className="otv-card-cta">Watch on OTV <span aria-hidden="true">↗</span></span>
              </a>
            </li>
          ))}
          <li className="otv-card otv-card--more">
            <a href={links.browse}>
              <span className="otv-card-more-label">Hundreds more pilots, series, shorts and video art</span>
              <span className="otv-card-cta">Browse the full catalog <span aria-hidden="true">↗</span></span>
            </a>
          </li>
        </ul>
        <div className="otv-wrap otv-rail-controls">
          <button type="button" className="otv-icon-btn otv-icon-btn--lg" onClick={() => scroll(-1)} aria-label="Scroll titles back">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <button type="button" className="otv-icon-btn otv-icon-btn--lg" onClick={() => scroll(1)} aria-label="Scroll titles forward">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </section>
  )
}
