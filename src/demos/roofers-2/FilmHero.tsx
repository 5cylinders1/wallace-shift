import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const stages = [
  { name: 'Before the first shingle', short: 'Prepare', time: 'DAY 01 · MORNING', text: 'An agreed scope. A protected property. Every detail planned before work begins.' },
  { name: 'A sound foundation', short: 'Inspect', time: 'DAY 01 · AFTERNOON', text: 'Remove the old covering and inspect the deck. Hidden damage is documented before it is repaired.' },
  { name: 'Protected through the night', short: 'Protect', time: 'BETWEEN WORKDAYS', text: 'Underlayment and weather protection go in before the crew leaves. The forecast guides the schedule.' },
  { name: 'Built as a complete system', short: 'Install', time: 'DAY 02 · MORNING', text: 'Roof covering, flashing and ventilation work together. The details matter as much as the shingles.' },
  { name: 'Ready for what comes next', short: 'Finish', time: 'DAY 02 · AFTERNOON', text: 'A final walkthrough, site cleanup and written warranty information bring the project together.' },
]
// Align chapters with the truck's departure, empty night and daylight return.
const chapterStarts = [0, .12, .38, .71, .91, 1]
const chapterFrames = [0, .25, .56, .81, .99]
const filmVersion = '955d826a-underlayment-v2'

export default function FilmHero() {
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressRef = useRef(0)
  const playbackRequest = useRef(0)
  const preserveFrame = useRef(false)
  const changingView = useRef(false)
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [requestedMedia, setRequestedMedia] = useState(false)
  const [ready, setReady] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const phase = Math.max(0, Math.min(4, chapterStarts.findLastIndex(start => progress >= start)))
  const introHidden = progress > (playing || reduced ? .08 : .14)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])

  useLayoutEffect(() => {
    if (!changingView.current) return
    changingView.current = false
    const section = sectionRef.current
    if (!section) return
    const header = document.querySelector('.er-header')?.clientHeight ?? 82
    const top = window.scrollY + section.getBoundingClientRect().top - header
    const height = section.firstElementChild?.clientHeight ?? window.innerHeight - header
    // Collapsing the scroll runway must keep the film in view. Restoring
    // it aligns the page with the chosen chapter before the browser paints.
    const distance = Math.max(0, section.offsetHeight - height)
    window.scrollTo({ top: top + (reduced ? 0 : progressRef.current * distance), behavior: 'instant' })
  }, [reduced])

  useEffect(() => {
    if (reduced || playing) return
    let frame = 0
    const update = () => {
      frame = 0
      const section = sectionRef.current
      if (!section) return
      const header = document.querySelector('.er-header')?.clientHeight ?? 82
      const distance = Math.max(1, section.offsetHeight - (section.firstElementChild?.clientHeight ?? window.innerHeight - header))
      const p = Math.max(0, Math.min(1, (header - section.getBoundingClientRect().top) / distance))
      progressRef.current = p
      section.style.setProperty('--er-progress', String(p))
      setProgress(p)
      const video = videoRef.current
      if (video && Number.isFinite(video.duration) && !video.seeking && Math.abs(video.currentTime - p * (video.duration - .06)) > .04) {
        video.currentTime = p * (video.duration - .06)
      }
    }
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    // Pausing or finishing a user-started film keeps that frame. Resume
    // the document-driven position only when the visitor actually scrolls.
    if (!preserveFrame.current) scroll()
    window.addEventListener('scroll', scroll, { passive: true })
    window.addEventListener('resize', scroll)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', scroll); window.removeEventListener('resize', scroll) }
  }, [playing, reduced, ready])

  const scrub = (p: number) => {
    playbackRequest.current += 1
    preserveFrame.current = true
    setPlaying(false)
    videoRef.current?.pause()
    setProgress(p)
    progressRef.current = p
    const section = sectionRef.current
    if (!section) return
    section.style.setProperty('--er-progress', String(p))
    if (!reduced) {
      const header = document.querySelector('.er-header')?.clientHeight ?? 82
      const top = window.scrollY + section.getBoundingClientRect().top - header
      const height = section.firstElementChild?.clientHeight ?? window.innerHeight - header
      window.scrollTo({ top: top + p * (section.offsetHeight - height), behavior: 'instant' })
    }
    const video = videoRef.current
    if (video && Number.isFinite(video.duration)) video.currentTime = p * Math.max(0, video.duration - .06)
    else if (video && !unavailable) {
      // Reduced motion leaves the movie unloaded initially. An explicit
      // chapter request may load it and seek one still, without playback.
      setRequestedMedia(true)
      video.preload = 'auto'
      video.load()
    }
  }

  const togglePlayback = async () => {
    const video = videoRef.current
    if (!video) return
    const request = ++playbackRequest.current
    preserveFrame.current = true
    if (playing) { video.pause(); setPlaying(false); return }
    setRequestedMedia(true)
    if (video.currentTime >= video.duration - .1) video.currentTime = 0
    setPlaying(true)
    try { await video.play() } catch (error) {
      // A pause or chapter click can intentionally interrupt play() while
      // media is loading. That is not a failed film or a reason to disable it.
      if (request !== playbackRequest.current) return
      setPlaying(false)
      if (!(error instanceof DOMException && error.name === 'AbortError')) setUnavailable(true)
    }
  }

  const toggleView = () => {
    playbackRequest.current += 1
    preserveFrame.current = true
    changingView.current = true
    const video = videoRef.current
    video?.pause()
    if (video && Number.isFinite(video.duration) && video.duration > 0) {
      const p = Math.max(0, Math.min(1, video.currentTime / Math.max(.001, video.duration - .06)))
      progressRef.current = p
      setProgress(p)
      sectionRef.current?.style.setProperty('--er-progress', String(p))
    }
    setPlaying(false)
    setReduced(current => !current)
  }

  return <section className={`er-film ${reduced ? 'er-film-reduced' : ''}`} ref={sectionRef} aria-label="An illustrated roof replacement, from start to finish">
    <div className="er-film-sticky">
      <img className="er-film-poster" src="/demos/roofers-2/house-poster.webp" alt="A stone home with a sweeping charcoal roof, surrounded by mature trees and lawn" fetchPriority="high" width="1920" height="1080" />
      <video ref={videoRef} className={`er-film-video ${ready && !unavailable ? 'is-ready' : ''}`} muted playsInline preload={reduced && !requestedMedia ? 'none' : 'auto'} poster="/demos/roofers-2/house-poster.webp" aria-label="AI-generated roof replacement timelapse" onLoadedMetadata={() => {
        const video = videoRef.current
        if (!playing && video && Number.isFinite(video.duration)) video.currentTime = progressRef.current * Math.max(0, video.duration - .06)
      }} onLoadedData={() => { setReady(true); setUnavailable(false) }} onError={event => {
        // A rejected <source> may bubble an error while a later source works.
        if (event.target !== event.currentTarget) return
        playbackRequest.current += 1
        setPlaying(false)
        setUnavailable(true)
      }} onEnded={() => {
        playbackRequest.current += 1
        preserveFrame.current = true
        progressRef.current = 1
        setProgress(1)
        setPlaying(false)
        sectionRef.current?.style.setProperty('--er-progress', '1')
      }} onSeeked={() => {
        const video = videoRef.current
        if (!playing && video && Number.isFinite(video.duration)) {
          const target = progressRef.current * (video.duration - .06)
          if (Math.abs(video.currentTime - target) > .08) video.currentTime = target
        }
      }} onTimeUpdate={() => {
        if (playing && videoRef.current && Number.isFinite(videoRef.current.duration) && videoRef.current.duration > 0) {
          const p = videoRef.current.currentTime / videoRef.current.duration
          progressRef.current = p
          setProgress(p)
          sectionRef.current?.style.setProperty('--er-progress', String(p))
        }
      }}>
        <source media="(max-width: 720px)" src={`/demos/roofers-2/roof-transformation-mobile.mp4?v=${filmVersion}`} type="video/mp4" />
        <source src={`/demos/roofers-2/roof-transformation.mp4?v=${filmVersion}`} type="video/mp4" />
      </video>
      <div className="er-film-shade" />
      <div className="er-film-intro" inert={introHidden} aria-hidden={introHidden} style={{ opacity: playing || reduced ? (progress > .08 ? 0 : 1) : Math.max(0, 1 - progress * 7), pointerEvents: introHidden ? 'none' : 'auto' }}>
        <p className="er-eyebrow"><span /> THOUGHTFULLY BUILT. CLEARLY EXPLAINED.</p>
        <h1>A stronger roof.<br /><em>A clearer path.</em></h1>
        <p className="er-film-deck">Protect what matters. Understand the work,<br className="er-desktop-break" /> the investment, and what happens next.</p>
        <a className="er-button er-button-gold" href="/demos/roofers-2/estimate/">Plan my roofing project <span aria-hidden="true">↗</span></a>
      </div>
      <div className="er-film-tag"><span className="er-live-dot" /> THE MAKING OF A ROOF <span>48 HOUR CONCEPT FILM</span></div>
      <div className={`er-film-caption ${progress > .12 ? 'is-visible' : ''}`} aria-hidden={progress <= .12}>
        <span className="er-eyebrow">{stages[phase].time}</span>
        <h2>{stages[phase].name}</h2>
        <p>{stages[phase].text}</p>
      </div>
      <div className="er-film-bottom">
        <div className="er-film-controls">
          <a href="#essentials" className="er-scroll-note"><span aria-hidden="true">↓</span> {reduced ? 'Explore the essentials' : 'Scroll to see the transformation'}</a>
          <div className="er-film-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="er-film-play" type="button" onClick={togglePlayback} disabled={unavailable}>{playing ? 'Ⅱ Pause film' : '▷ Play film'}</button>
            <button className="er-film-play" type="button" onClick={toggleView} aria-label={reduced ? 'Switch to scroll view' : 'Switch to still view'}>{reduced ? 'Scroll view' : 'Still view'}</button>
          </div>
        </div>
        <div className="er-stage-track" aria-label="Roof replacement chapters">{stages.map((stage, i) => <button type="button" onClick={() => scrub(chapterFrames[i])} key={stage.short} aria-label={`Show chapter ${i + 1}: ${stage.short}`} aria-current={phase === i ? 'step' : undefined}><span className="er-stage-line"><i style={{ width: `${Math.max(0, Math.min(100, (progress - chapterStarts[i]) / (chapterStarts[i + 1] - chapterStarts[i]) * 100))}%` }} /></span><span><b>0{i + 1}</b> {stage.short}</span></button>)}</div>
        <p className="er-film-disclosure">AI concept film · sequence is illustrative, not a promised project schedule.{unavailable ? ' Film unavailable; explore each chapter above.' : ''}</p>
      </div>
    </div>
  </section>
}
