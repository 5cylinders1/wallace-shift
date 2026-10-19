import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import './roof-system.css'

const layers = [
  { title: 'Deck and structure', description: 'Inspected and repaired before anything is covered. Slate and clay loads are reviewed by an engineer.', icon: 'structure' },
  { title: 'Ice barrier and underlayment', description: 'High-temperature, self-sealing membranes at eaves, valleys and penetrations, full-coverage synthetic elsewhere.', icon: 'barrier' },
  { title: 'Ventilation and insulation', description: 'Balanced intake and exhaust so attics stay dry in winter and cool in summer, with the finish never fighting condensation.', icon: 'air' },
  { title: 'Flashing and drainage', description: 'Copper or matched metal at every transition, concealed where the architecture wants it quiet, expressed where it wants a line.', icon: 'drainage' },
  { title: 'Ratings that matter', description: 'Class A fire assemblies and Class 4 impact-rated options, which insurers increasingly recognize.', icon: 'rating' },
] as const

function LayerIcon({ kind }: { kind: typeof layers[number]['icon'] }) {
  return <svg viewBox="0 0 112 112" fill="none" aria-hidden="true">
    <path className="hr-system-icon-guide" d="M12 20H100M12 92H100M20 12V100M92 12V100" />
    {kind === 'structure' && <>
      <path d="M18 62L56 26L94 62M26 58V87H86V58M36 87V56L56 38L76 56V87M26 68H86M36 56H76M56 38V87" />
      <path className="hr-system-icon-accent" d="M20 62L56 28L92 62M43 86L56 68L69 86" />
    </>}
    {kind === 'barrier' && <>
      <path d="M15 54L56 32L97 54L56 76L15 54ZM15 66L56 88L97 66M15 78L56 100L97 78" />
      <path className="hr-system-icon-accent" d="M56 12C56 12 47 23 47 28C47 33 51 37 56 37C61 37 65 33 65 28C65 23 56 12 56 12ZM41 52L56 60L72 52" />
    </>}
    {kind === 'air' && <>
      <path d="M17 71L56 41L95 71M26 65V89H86V65M35 78H77M35 86H77" />
      <path className="hr-system-icon-accent" d="M16 31H65C78 31 78 16 67 16C62 16 59 19 59 22M29 42H84C96 42 97 58 86 58M12 20H37M47 53V64M65 53V64" />
    </>}
    {kind === 'drainage' && <>
      <path d="M16 50L54 28L91 50M23 54L54 36L84 54M23 58H87V69H96V91M77 58V76H86V94" />
      <path className="hr-system-icon-accent" d="M55 49L69 57M39 58L54 66M88 78V88M36 75C36 75 29 84 29 88C29 97 43 97 43 88C43 84 36 75 36 75Z" />
    </>}
    {kind === 'rating' && <>
      <path d="M56 20L87 32V57C87 77 56 94 56 94C56 94 25 77 25 57V32L56 20Z" />
      <path className="hr-system-icon-accent" d="M39 55L51 67L74 43M48 13H64M20 24L15 18M92 24L97 18" />
    </>}
  </svg>
}

function Direction({ previous = false }: { previous?: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={previous ? { transform: 'rotate(180deg)' } : undefined}>
    <path d="M4 12H20M14 6L20 12L14 18" stroke="currentColor" strokeWidth="1.4" />
  </svg>
}

export default function RoofSystem() {
  const headingId = useId()
  const trackId = useId()
  const sectionRef = useRef<HTMLDivElement>(null)
  const photoRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(1)
  const [position, setPosition] = useState(0)
  const lastPosition = layers.length - visibleCount

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let frame = 0
    const measure = () => {
      const first = track.children[0] as HTMLElement | undefined
      const second = track.children[1] as HTMLElement | undefined
      if (!first || !second) return
      const stride = second.offsetLeft - first.offsetLeft
      const count = track.clientWidth >= 650 ? 2 : 1
      setVisibleCount(count)
      setPosition(Math.min(layers.length - count, Math.max(0, Math.round(track.scrollLeft / stride))))
    }
    const requestMeasure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    const observer = new ResizeObserver(requestMeasure)
    observer.observe(track)
    track.addEventListener('scroll', requestMeasure, { passive: true })
    requestMeasure()
    return () => {
      observer.disconnect()
      track.removeEventListener('scroll', requestMeasure)
      cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    const photo = photoRef.current
    if (!section || !photo) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let inView = false
    const paint = () => {
      frame = 0
      if (preference.matches || !inView) {
        photo.style.setProperty('--hr-system-drift', '0px')
        return
      }
      const rect = section.getBoundingClientRect()
      const progress = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)))
      photo.style.setProperty('--hr-system-drift', `${(progress - 0.5) * 42}px`)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint)
    }
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      schedule()
    }, { rootMargin: '100px' })
    observer.observe(section)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    preference.addEventListener('change', schedule)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      preference.removeEventListener('change', schedule)
      cancelAnimationFrame(frame)
    }
  }, [])

  const goTo = (next: number) => {
    const track = trackRef.current
    if (!track) return
    const target = Math.min(lastPosition, Math.max(0, next))
    const card = track.children[target] as HTMLElement | undefined
    const first = track.children[0] as HTMLElement | undefined
    if (!card || !first) return
    track.scrollTo({ left: card.offsetLeft - first.offsetLeft, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      goTo(event.key === 'Home' ? 0 : event.key === 'End' ? lastPosition : position + (event.key === 'ArrowRight' ? 1 : -1))
    }
  }

  return <div className="hr-roof-system" ref={sectionRef}>
    <figure className="hr-roof-system-figure">
      <div className="hr-roof-system-photo" ref={photoRef}>
        <img src="/demos/roofers-4/material-build.jpg" alt="A new custom home at the framing stage with fresh roof decking and underlayment, seen from above" loading="lazy" width="1440" height="1080" />
        <div className="hr-roof-system-photo-mark" aria-hidden="true"><span /> Beneath the finish <b>05 details</b></div>
        <span className="hr-roof-system-cross hr-roof-system-cross-top" aria-hidden="true" />
        <span className="hr-roof-system-cross hr-roof-system-cross-bottom" aria-hidden="true" />
      </div>
      <figcaption>Decking, underlayment, flashing and ventilation: the four layers no one sees, and the ones that decide how long the finish lasts.</figcaption>
    </figure>
    <div className="hr-roof-system-copy">
      <div className="hr-roof-system-heading">
        <p className="hr-kicker"><span /> What performance means</p>
        <h3 id={headingId}>The finish is the last five percent. The system is the rest.</h3>
      </div>
      <div className="hr-roof-system-carousel" role="region" aria-roledescription="carousel" aria-labelledby={headingId}>
        <div className="hr-roof-system-track" id={trackId} ref={trackRef} tabIndex={0} onKeyDown={onKeyDown} aria-label="Roof system details. Use the arrow keys to explore.">
          {layers.map((layer, index) => <article className="hr-roof-system-card" key={layer.icon} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${layers.length}: ${layer.title}`}>
            <div className="hr-roof-system-card-top"><LayerIcon kind={layer.icon} /><span>0{index + 1}</span></div>
            <h4>{layer.title}</h4>
            <p>{layer.description}</p>
          </article>)}
        </div>
        <div className="hr-roof-system-controls">
          <div className="hr-roof-system-count" aria-live="polite" aria-atomic="true"><b>0{position + 1}{visibleCount > 1 && <> / 0{position + visibleCount}</>}</b><span>of 05</span></div>
          <div className="hr-roof-system-indicators" aria-label="Choose system detail">
            {Array.from({ length: lastPosition + 1 }, (_, index) => <button type="button" key={index} aria-label={`Show ${layers[index].title}${visibleCount > 1 ? ` and ${layers[index + 1].title}` : ''}`} aria-controls={trackId} aria-current={position === index ? 'true' : undefined} onClick={() => goTo(index)}><span /></button>)}
          </div>
          <div className="hr-roof-system-arrows">
            <button type="button" aria-label="Previous system detail" aria-controls={trackId} disabled={position === 0} onClick={() => goTo(position - 1)}><Direction previous /></button>
            <button type="button" aria-label="Next system detail" aria-controls={trackId} disabled={position === lastPosition} onClick={() => goTo(position + 1)}><Direction /></button>
          </div>
        </div>
      </div>
    </div>
  </div>
}
