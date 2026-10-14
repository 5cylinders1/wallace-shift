import { useEffect, useRef, useState } from 'react'
import { useScrollVideo } from '../../hooks/useScrollVideo'

/**
 * Scroll-driven drone film. The section is a tall runway; its first child
 * stays pinned while the visitor's scroll position seeks the film. Chapter
 * buttons, play/pause and a still view provide keyboard, touch and
 * reduced-motion routes to the same content.
 */

const chapters = [
  { short: 'Approach', title: 'Seen from above, first.', text: 'Every estate is photographed, appraised and remembered from the air. The roof is what that view is made of.' },
  { short: 'Roofline', title: 'Proportion is the architecture.', text: 'Pitch, eave depth and the way planes meet decide whether a home looks composed or merely covered.' },
  { short: 'Material', title: 'The finish you choose is permanent.', text: 'Standing-seam metal, slate, cedar or clay. A material that performs for fifty years should also be beautiful for fifty years.' },
  { short: 'Detail', title: 'Close enough to judge.', text: 'Seams, ridge caps and chimney flashing are where craftsmanship shows. It is also what your project ledger photographs every working day.' },
]
const starts = [0, 0.27, 0.54, 0.8, 1]
const frames = [0.02, 0.38, 0.66, 0.96]
const filmVersion = 'halcyon-v1'
const poster = '/demos/roofers-4/estate-poster.jpg'

function prefersReduced(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function DroneFilm() {
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressRef = useRef(0)
  const holdFrame = useRef(false)
  const playbackRequest = useRef(0)
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [still, setStill] = useState(prefersReduced)
  const [wantsMedia, setWantsMedia] = useState(() => !prefersReduced())
  const { seek, cancelPreparation, markPrepared } = useScrollVideo(sectionRef, videoRef, progressRef, !playing && (!still || wantsMedia))

  const phase = Math.max(0, Math.min(chapters.length - 1, starts.findLastIndex(start => progress >= start)))
  const introGone = progress > 0.1

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setStill(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])

  useEffect(() => {
    if (still || playing) return
    let frame = 0
    const update = () => {
      frame = 0
      const section = sectionRef.current
      if (!section) return
      const pinned = section.firstElementChild?.clientHeight ?? window.innerHeight
      const distance = Math.max(1, section.offsetHeight - pinned)
      const p = Math.max(0, Math.min(1, -section.getBoundingClientRect().top / distance))
      progressRef.current = p
      section.style.setProperty('--hr-progress', String(p))
      setProgress(p)
      seek()
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    if (!holdFrame.current) onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
  }, [playing, still, ready, seek])

  const goTo = (p: number) => {
    playbackRequest.current += 1
    holdFrame.current = true
    setPlaying(false)
    if (playing) videoRef.current?.pause()
    progressRef.current = p
    setProgress(p)
    sectionRef.current?.style.setProperty('--hr-progress', String(p))
    if (!still) {
      const section = sectionRef.current
      if (section) {
        const pinned = section.firstElementChild?.clientHeight ?? window.innerHeight
        const top = window.scrollY + section.getBoundingClientRect().top
        window.scrollTo({ top: top + p * (section.offsetHeight - pinned), behavior: 'instant' })
      }
    }
    const video = videoRef.current
    if (video && Number.isFinite(video.duration) && video.duration > 0) seek()
    else if (video && !failed) {
      setWantsMedia(true)
      if (video.preload === 'none') { video.preload = 'auto'; video.load() }
    }
  }

  const togglePlay = async () => {
    const video = videoRef.current
    if (!video) return
    cancelPreparation()
    const request = ++playbackRequest.current
    holdFrame.current = true
    if (playing) { video.pause(); setPlaying(false); return }
    setWantsMedia(true)
    if (video.currentTime >= video.duration - 0.1) video.currentTime = 0
    setPlaying(true)
    try { await video.play() } catch (error) {
      if (request !== playbackRequest.current) return
      setPlaying(false)
      if (!(error instanceof DOMException && ['AbortError', 'NotAllowedError'].includes(error.name))) setFailed(true)
    }
  }

  const toggleStill = () => {
    playbackRequest.current += 1
    holdFrame.current = true
    videoRef.current?.pause()
    setPlaying(false)
    setStill(current => !current)
    requestAnimationFrame(() => {
      const section = sectionRef.current
      if (section) window.scrollTo({ top: window.scrollY + section.getBoundingClientRect().top, behavior: 'instant' })
    })
  }

  const live = ready && !failed

  return <section className={`hr-film ${still ? 'is-still' : ''}`} ref={sectionRef} id="top" aria-label="A drone flight over a Halcyon roof">
    <div className="hr-film-pin">
      <img className="hr-film-poster" src={poster} alt="A mountain-contemporary estate with a charcoal standing-seam metal roof at golden hour, seen from a drone" width="1920" height="1080" fetchPriority="high" />
      <video
        ref={videoRef}
        className={`hr-film-video ${live ? 'is-live' : ''}`}
        muted playsInline disablePictureInPicture
        preload={wantsMedia ? 'auto' : 'none'}
        poster={poster}
        aria-label="AI concept drone film of a luxury estate roof"
        onLoadedMetadata={() => { if (!playing) seek() }}
        onPlaying={markPrepared}
        onLoadedData={() => { setReady(true); setFailed(false) }}
        onCanPlay={() => { setReady(true); setFailed(false); if (!playing) seek() }}
        onSeeked={() => {
          if (videoRef.current && videoRef.current.readyState >= 2) setReady(true)
          if (!playing) seek()
        }}
        onError={event => { if (event.target === event.currentTarget) { playbackRequest.current += 1; setPlaying(false); setFailed(true) } }}
        onEnded={() => { playbackRequest.current += 1; holdFrame.current = true; progressRef.current = 1; setProgress(1); setPlaying(false); sectionRef.current?.style.setProperty('--hr-progress', '1') }}
        onTimeUpdate={() => {
          const video = videoRef.current
          if (playing && video && Number.isFinite(video.duration) && video.duration > 0) {
            const p = video.currentTime / video.duration
            progressRef.current = p
            setProgress(p)
            sectionRef.current?.style.setProperty('--hr-progress', String(p))
          }
        }}
      >
        <source media="(max-width: 720px)" src={`/demos/roofers-4/estate-flight-mobile.mp4?v=${filmVersion}`} type="video/mp4" />
        <source src={`/demos/roofers-4/estate-flight.mp4?v=${filmVersion}`} type="video/mp4" />
      </video>
      <div className="hr-film-grade" aria-hidden="true" />

      <div className="hr-film-intro" inert={introGone} aria-hidden={introGone} style={{ opacity: still ? 1 : Math.max(0, 1 - progress * 9) }}>
        <p className="hr-kicker hr-kicker-light"><span /> Luxury roof installation, new builds and performance re-roofs</p>
        <h1>The architecture<br /><em>above you.</em></h1>
        <p className="hr-film-deck">Standing-seam metal, slate, cedar and clay roofs for custom estates, specified like architecture and documented like a project you can watch.</p>
        <div className="hr-film-ctas">
          <a className="hr-cta-primary" href="#visualizer">Try a roof on your home <span aria-hidden="true">↗</span></a>
          <a className="hr-cta-ghost" href="#investment">Why the roof is the investment</a>
        </div>
      </div>

      <div className={`hr-film-caption ${introGone || still ? 'is-visible' : ''}`} aria-live="polite">
        <span className="hr-caption-index">0{phase + 1} <i>/ 04</i></span>
        <h2>{chapters[phase].title}</h2>
        <p>{chapters[phase].text}</p>
      </div>

      <div className="hr-film-bottom">
        <div className="hr-film-controls">
          <span className="hr-film-tag"><span className="hr-live-dot" /> {still ? 'Still view' : 'Scroll to fly the roof'}</span>
          <div className="hr-film-actions">
            <button type="button" className="hr-film-button" onClick={togglePlay} disabled={failed}>{playing ? 'Pause' : 'Play film'}</button>
            <button type="button" className="hr-film-button" onClick={toggleStill}>{still ? 'Scroll view' : 'Still view'}</button>
          </div>
        </div>
        <div className="hr-chapters" aria-label="Film chapters">
          {chapters.map((chapter, i) => <button type="button" key={chapter.short} onClick={() => goTo(frames[i])} aria-current={phase === i ? 'step' : undefined} aria-label={`Chapter ${i + 1}: ${chapter.short}`}>
            <span className="hr-chapter-line"><i style={{ width: `${Math.max(0, Math.min(100, (progress - starts[i]) / (starts[i + 1] - starts[i]) * 100))}%` }} /></span>
            <span><b>0{i + 1}</b> {chapter.short}</span>
          </button>)}
        </div>
        <p className="hr-film-note">AI concept film. The estate and flight are illustrative of the work, not a specific project.{failed ? ' Film unavailable; the chapters above still describe each view.' : ''}</p>
      </div>
    </div>
  </section>
}
