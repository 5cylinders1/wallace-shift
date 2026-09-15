import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { getInteractiveHomeHeroSnapshot, getStaticHomeHeroSnapshot, subscribeInteractiveHomeHero } from '../Hero/homeHeroDisplay'
import { aboutMeta } from '../../content/about'
import { sampleStudioJourney } from './studioDirector'

const CHAPTERS = ['Two people', 'A direct line', 'One shared standard']

/** The same physical scene is rendered in Blender from start to finish.
 * Scroll requests the latest frame; decoding finishes before another seek.
 * Mobile and reduced motion load only the opening still. */
export function AboutStudio() {
  const root = useRef<HTMLElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [chapter, setChapter] = useState(0)
  const [visibleChapter, setVisibleChapter] = useState(0)
  const eligible = useSyncExternalStore(subscribeInteractiveHomeHero,
    getInteractiveHomeHeroSnapshot, getStaticHomeHeroSnapshot)
  const cinematic = eligible && !failed

  useEffect(() => {
    const element = root.current
    if (!element) return
    const media = video.current
    let frame = 0
    let top = 0
    let distance = 1
    let latestTime = 0
    let visible = true
    let stopped = false
    let previousChapter = -1
    let previousVisibleChapter = -2
    let seekWatchdog = 0
    let loadWatchdog = 0
    const fail = () => { if (!stopped) setFailed(true) }
    const watch = () => {
      window.clearTimeout(seekWatchdog)
      window.clearTimeout(loadWatchdog)
      if (!media || !visible || document.hidden) return
      if (media.seeking) seekWatchdog = window.setTimeout(fail, 8000)
      else if (media.readyState < 2) loadWatchdog = window.setTimeout(fail, 15000)
    }
    const seek = () => {
      if (!media || stopped || !visible || document.hidden || media.readyState < 2 || media.seeking) return
      const atEnd = latestTime === 0 || latestTime >= media.duration - 1 / 24
      if (Math.abs(media.currentTime - latestTime) > (atEnd ? .00001 : 1 / 60)) {
        media.currentTime = latestTime
        watch()
      } else {
        window.clearTimeout(seekWatchdog)
        window.clearTimeout(loadWatchdog)
        setReady(true)
      }
    }
    const seeked = () => {
      window.clearTimeout(seekWatchdog)
      window.clearTimeout(loadWatchdog)
      seek()
    }
    const update = () => {
      frame = 0
      const progress = cinematic ? Math.max(0, Math.min(1, (window.scrollY - top) / distance)) : 0
      const state = sampleStudioJourney(progress)
      element.style.setProperty('--studio-opening', String(state.opening))
      element.style.setProperty('--studio-detail', String(state.detail))
      element.style.setProperty('--studio-alignment', String(state.alignment))
      element.style.setProperty('--studio-progress', String(progress))
      if (state.chapter !== previousChapter) {
        previousChapter = state.chapter
        setChapter(state.chapter)
      }
      const active = state.opening > .05 ? 0 : state.detail > .05 ? 1 : state.alignment > .05 ? 2 : -1
      if (active !== previousVisibleChapter) {
        previousVisibleChapter = active
        setVisibleChapter(active)
      }
      if (media && Number.isFinite(media.duration)) {
        latestTime = state.film * Math.max(0, media.duration - 1 / 24)
        seek()
      }
    }
    const request = () => { if (!frame) frame = requestAnimationFrame(update) }
    const measure = () => {
      top = element.getBoundingClientRect().top + window.scrollY
      distance = Math.max(1, element.offsetHeight - window.innerHeight)
      request()
    }
    const loaded = () => { window.clearTimeout(loadWatchdog); request() }
    const visibility = () => { watch(); if (!document.hidden) request() }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      watch()
      if (visible) request()
    })
    intersection.observe(element)
    media?.addEventListener('loadeddata', loaded)
    media?.addEventListener('seeked', seeked)
    media?.addEventListener('error', fail)
    if (media && media.readyState >= 2) loaded()
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', measure)
    document.addEventListener('visibilitychange', visibility)
    measure()
    return () => {
      stopped = true
      cancelAnimationFrame(frame)
      window.clearTimeout(seekWatchdog)
      window.clearTimeout(loadWatchdog)
      observer.disconnect()
      intersection.disconnect()
      media?.removeEventListener('loadeddata', loaded)
      media?.removeEventListener('seeked', seeked)
      media?.removeEventListener('error', fail)
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', measure)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [cinematic])

  return (
    <section className="about-journey" ref={root} data-cinematic={cinematic} data-media-ready={ready && cinematic} aria-label="Inside Wallace Shift">
      <div className="about-journey__stage">
        <div className="about-journey__world" aria-hidden="true">
          <picture>
            <source media="(max-width: 700px)" srcSet="/media/about/studio-world-mobile.webp" />
            <img src="/media/about/studio-world.webp" width="1920" height="1080" alt="" fetchPriority="high" />
          </picture>
          {cinematic && <video ref={video} src="/media/about/studio-journey.mp4" muted playsInline preload="auto" disablePictureInPicture aria-hidden="true" onLoadStart={() => setReady(false)} />}
        </div>
        <div className="about-journey__vignette" aria-hidden="true" />
        <div className="container about-journey__content">
          <div className="about-journey__chapter about-journey__chapter--opening" aria-hidden={cinematic && visibleChapter !== 0} inert={cinematic && visibleChapter !== 0}>
            <p className="eyebrow about-journey__eyebrow">{aboutMeta.eyebrow}</p>
            <h1>
              {aboutMeta.headlineLines.map(line => <span key={line}>{line}</span>)}
              <span className="accent-serif">{aboutMeta.headlineAccent}</span>
            </h1>
            <p className="about-journey__lead">{aboutMeta.supporting}</p>
            <a className="about-text-link" href="#people">Meet your people <span aria-hidden="true">↓</span></a>
          </div>
          {cinematic && <>
            <div className="about-journey__chapter about-journey__chapter--detail" aria-hidden={visibleChapter !== 1} inert={visibleChapter !== 1}>
              <p className="about-kicker">The conversation & the craft</p>
              <h2>A direct<br /><span className="accent-serif">line.</span></h2>
              <p className="about-journey__lead">From the first conversation to the final detail, you work with the people responsible for the result.</p>
              <p className="about-journey__note">Bella finds the need. Matthew brings it to life.</p>
            </div>
            <div className="about-journey__chapter about-journey__chapter--alignment" aria-hidden={visibleChapter !== 2} inert={visibleChapter !== 2}>
              <p className="about-kicker">Two disciplines. Working as one.</p>
              <h2>Close to<br />the work.<br /><span className="accent-serif">Close to you.</span></h2>
              <p className="about-journey__lead">A small studio, by design. Every conversation stays connected to what we build.</p>
              <a className="about-text-link" href="#people">The people behind it <span aria-hidden="true">↓</span></a>
            </div>
          </>}
          <div className="about-journey__rail">
            <span className="about-journey__rail-label">Independent by design.</span>
            {cinematic ? <>
              <span className="about-journey__chapter-label"><b>0{chapter + 1}</b> / {CHAPTERS[chapter]}</span>
              <span className="about-journey__scroll">Scroll to explore <span aria-hidden="true">↓</span></span>
              <span className="about-journey__progress" aria-hidden="true" />
            </> : <span>Design × Technology</span>}
          </div>
        </div>
      </div>
    </section>
  )
}
