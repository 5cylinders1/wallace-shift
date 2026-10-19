import { useEffect, useRef, useState } from 'react'
import { materials, money } from './content'
import './material-gallery.css'

export default function MaterialGallery() {
  const root = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const rail = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const metrics = useRef({ pinned: false, distance: 0, top: 72, start: 0, travel: 0, reduced: false })

  useEffect(() => {
    const section = root.current
    const pin = stage.current
    const track = rail.current
    if (!section || !pin || !track) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let inView = false
    const cards = Array.from(track.querySelectorAll<HTMLElement>('.hr-gallery-card'))
    const draw = () => {
      frame = 0
      const state = metrics.current
      if (state.pinned) {
        const progress = Math.max(0, Math.min(1, (window.scrollY - state.start) / state.travel))
        track.scrollLeft = progress * state.distance
      }
      const stride = (cards[1]?.offsetLeft ?? 0) - (cards[0]?.offsetLeft ?? 0)
      const current = stride > 0 ? Math.max(0, Math.min(materials.length - 1, Math.round(track.scrollLeft / stride))) : 0
      setActive(previous => previous === current ? previous : current)
      section.style.setProperty('--hr-gallery-progress', String(state.distance ? track.scrollLeft / state.distance : 0))
      cards.forEach(card => {
        const image = card.querySelector<HTMLElement>('.hr-gallery-photo img')
        if (!image) return
        const offset = state.pinned ? Math.max(-1, Math.min(1, (card.offsetLeft - cards[0].offsetLeft - track.scrollLeft) / card.offsetWidth)) : 0
        image.style.transform = state.pinned ? `scale(1.065) translateX(${offset * -16}px)` : ''
      })
    }
    const schedule = () => { if (!frame && (inView || metrics.current.pinned)) frame = requestAnimationFrame(draw) }
    const measure = () => {
      const top = document.querySelector('.hr-header')?.getBoundingClientRect().height ?? 72
      const distance = Math.max(0, track.scrollWidth - track.clientWidth)
      const pinned = !preference.matches && window.innerWidth >= 1100 && pin.scrollHeight <= window.innerHeight - top && distance > 0
      const travel = distance * .88 + window.innerHeight * .2
      section.dataset.scroll = String(pinned)
      section.dataset.reduced = String(preference.matches)
      section.style.setProperty('--hr-gallery-top', `${top}px`)
      section.style.height = pinned ? `${pin.offsetHeight + travel}px` : ''
      const start = section.getBoundingClientRect().top + window.scrollY - top
      metrics.current = { pinned, distance, top, start, travel, reduced: preference.matches }
      schedule()
    }
    const observer = new ResizeObserver(measure)
    observer.observe(pin)
    observer.observe(track)
    const visibility = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; if (inView) { measure(); schedule() } }, { rootMargin: '300px' })
    visibility.observe(section)
    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', measure)
    track.addEventListener('scroll', schedule, { passive: true })
    preference.addEventListener('change', measure)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      visibility.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', measure)
      track.removeEventListener('scroll', schedule)
      preference.removeEventListener('change', measure)
      section.style.removeProperty('height')
      delete section.dataset.scroll
      delete section.dataset.reduced
    }
  }, [])

  function goTo(index: number) {
    const track = rail.current
    if (!track) return
    const cards = track.querySelectorAll<HTMLElement>('.hr-gallery-card')
    const next = Math.max(0, Math.min(materials.length - 1, index))
    const left = cards[next].offsetLeft - cards[0].offsetLeft
    const state = metrics.current
    if (state.pinned) window.scrollTo({ top: state.start + (Math.min(left, state.distance) / state.distance) * state.travel, behavior: 'smooth' })
    else track.scrollTo({ left, behavior: state.reduced ? 'instant' : 'smooth' })
  }

  return <section ref={root} id="materials" className="hr-material-gallery" aria-labelledby="hr-material-title">
    <div ref={stage} className="hr-gallery-stage">
      <div className="hr-wrap hr-gallery-heading">
        <div>
          <p className="hr-kicker"><span /> Materials</p>
          <h2 id="hr-material-title">Five finishes we install. Each one chosen for the architecture, not the catalog.</h2>
        </div>
        <span className="hr-gallery-instruction"><span aria-hidden="true">↓</span> Scroll to explore</span>
      </div>
      <div className="hr-gallery-window">
        <div ref={rail} className="hr-gallery-rail" role="region" aria-roledescription="carousel" aria-label="Roof materials" tabIndex={0} onKeyDown={event => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); goTo(active + (event.key === 'ArrowRight' ? 1 : -1)) }
          if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); goTo(event.key === 'Home' ? 0 : materials.length - 1) }
        }}>
          {materials.map((material, i) => <article key={material.id} className="hr-gallery-card" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${materials.length}: ${material.name}`}>
            <div className="hr-gallery-photo">
              <img src={material.image} alt={material.alt} loading="lazy" width="1440" height="1080" />
              <span className="hr-gallery-photo-label">Halcyon material study</span>
              <span className="hr-gallery-number" aria-hidden="true">0{i + 1}</span>
            </div>
            <div className="hr-gallery-body">
              <p className="hr-gallery-type">{material.short}</p>
              <h3>{material.name}</h3>
              <p>{material.character}</p>
              <dl>
                <div><dt>Service life</dt><dd>{material.lifespan}</dd></div>
                <div><dt>Weight</dt><dd>{material.weight}</dd></div>
                <div><dt>Planning rate</dt><dd>{money(material.rate[0])} to {money(material.rate[1])} per sq ft installed</dd></div>
              </dl>
              <ul>{material.performance.map(point => <li key={point}>{point}</li>)}</ul>
            </div>
          </article>)}
        </div>
      </div>
      <div className="hr-wrap hr-gallery-footer">
        <div className="hr-gallery-pagination">
          <span className="hr-gallery-count" aria-live="polite">0{active + 1}<i> / 05</i></span>
          <div className="hr-gallery-progress" aria-hidden="true"><span /></div>
          <div className="hr-gallery-buttons">
            <button type="button" aria-label="Previous material" disabled={active === 0} onClick={() => goTo(active - 1)}>←</button>
            <button type="button" aria-label="Next material" disabled={active === materials.length - 1} onClick={() => goTo(active + 1)}>→</button>
          </div>
        </div>
        <p className="hr-fine">Service lives are typical ranges for properly installed systems in temperate climates, not a warranty term. Planning rates are illustrative for this demo.</p>
      </div>
    </div>
  </section>
}
