import { useEffect, useRef, useState } from 'react'
import { cameraTransform, filmFrame, filmShots, shotStarts } from './filmTimeline'

/** One shared playhead drives camera moves, edits and the progress line.
 * Pausing freezes the exact frame; no React render is needed per frame. */
export default function BucyrusFilm() {
  const root = useRef<HTMLDivElement>(null)
  const images = useRef<(HTMLImageElement | null)[]>([])
  const progress = useRef<HTMLSpanElement>(null)
  const shotNumber = useRef<HTMLSpanElement>(null)
  const elapsed = useRef(0)
  const [loaded, setLoaded] = useState<string[]>([])
  const [failed, setFailed] = useState<string[]>([])
  const [announcement, setAnnouncement] = useState('')
  const [paused, setPaused] = useState(false)
  // Keep the server and first client frame static and identical.
  const [reduced, setReduced] = useState(true)
  const [visible, setVisible] = useState(false)
  const [inView, setInView] = useState(true)
  const ready = loaded.length > 0 && loaded.length + failed.length === filmShots.length
  const running = ready && !paused && !reduced && visible && inView

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMotion = () => setReduced(media.matches)
    const onVisibility = () => setVisible(!document.hidden)
    onMotion()
    onVisibility()
    // Images can finish loading before hydration attaches their onLoad handlers.
    images.current.forEach((image, index) => {
      if (!image?.complete) return
      const asset = filmShots[index].asset
      const record = image.naturalWidth ? setLoaded : setFailed
      record(previous => previous.includes(asset) ? previous : [...previous, asset])
    })
    media.addEventListener('change', onMotion)
    document.addEventListener('visibilitychange', onVisibility)
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting))
    if (root.current) observer.observe(root.current)
    return () => {
      media.removeEventListener('change', onMotion)
      document.removeEventListener('visibilitychange', onVisibility)
      observer.disconnect()
    }
  }, [])

  function paint(staticFrame: boolean) {
    const frame = filmFrame(elapsed.current)
    images.current.forEach((image, index) => {
      if (!image) return
      const active = index === frame.index
      const outgoing = !staticFrame && frame.opacity < 1 && index === frame.previous
      image.style.opacity = String(active ? (staticFrame ? 1 : frame.opacity) : outgoing ? 1 : 0)
      image.style.willChange = active || outgoing ? 'transform, opacity' : 'auto'
      image.style.zIndex = active ? '2' : '1'
      if (active || outgoing) image.style.transform = staticFrame ? 'none' : cameraTransform(index, active ? frame.progress : frame.outgoingProgress)
    })
    if (progress.current) progress.current.style.transform = `scaleX(${frame.reelProgress})`
    if (shotNumber.current) {
      const label = `${String(frame.index + 1).padStart(2, '0')} / ${String(filmShots.length).padStart(2, '0')}`
      if (shotNumber.current.textContent !== label) shotNumber.current.textContent = label
    }
  }

  useEffect(() => {
    function skipFailedShot() {
      const current = filmFrame(elapsed.current).index
      if (!failed.includes(filmShots[current].asset)) return
      for (let offset = 1; offset <= filmShots.length; offset++) {
        const next = (current + offset) % filmShots.length
        if (loaded.includes(filmShots[next].asset)) {
          elapsed.current = shotStarts[next] + filmShots[next].dissolve
          return
        }
      }
    }
    skipFailedShot()
    paint(reduced)
    if (!running) return
    let request = 0
    let last: number | null = null
    const tick = (time: number) => {
      if (last !== null) elapsed.current += Math.min(time - last, 100)
      last = time
      skipFailedShot()
      paint(false)
      request = requestAnimationFrame(tick)
    }
    request = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(request)
  }, [running, reduced, loaded, failed])

  function seek(direction: number) {
    let index = filmFrame(elapsed.current).index
    for (let step = 0; step < filmShots.length; step++) {
      index = (index + direction + filmShots.length) % filmShots.length
      if (loaded.includes(filmShots[index].asset)) break
    }
    // Land after the edit so a paused/manual shot is completely visible.
    elapsed.current = shotStarts[index] + filmShots[index].dissolve
    setPaused(true)
    setAnnouncement(`Shot ${index + 1} of ${filmShots.length}: ${filmShots[index].name}`)
    paint(reduced)
  }

  return <>
    <div className="ba-hero-images ba-film" ref={root} role="img" aria-label="Illustrative automotive film: an American classic, chrome details, an immaculate engine with the hood open, an aerial road scene, and a rear view. Not customer vehicles.">
      {filmShots.map((shot, index) => <img key={shot.asset} ref={element => { images.current[index] = element }}
        src={`/media/bucyrus/${shot.asset}.webp`}
        srcSet={`/media/bucyrus/${shot.asset}-small.webp ${shot.smallWidth}w, /media/bucyrus/${shot.asset}.webp ${shot.width}w`}
        sizes="(max-width: 760px) 135vw, 100vw" alt="" aria-hidden="true" width={shot.width} height={shot.width * 9 / 16}
        style={{ transformOrigin: shot.origin }} loading="eager" fetchPriority={index === 0 ? 'high' : 'low'}
        onError={() => setFailed(previous => previous.includes(shot.asset) ? previous : [...previous, shot.asset])}
        onLoad={() => setLoaded(previous => previous.includes(shot.asset) ? previous : [...previous, shot.asset])} />)}
    </div>
    <span className="ba-sr-only" role="status">{announcement}</span>
    <div className="ba-wrap ba-hero-bottom">
      <p>GOOD CARS. GREAT ROADS.<br /><span>Let’s keep you connected to both.</span></p>
      <div className="ba-film-player" role="group" aria-label="Automotive film controls">
        <div className="ba-film-caption" aria-hidden="true"><span>THE DRIVE</span><span ref={shotNumber}>01 / 05</span></div>
        <div className="ba-film-timeline" aria-hidden="true"><span ref={progress} /></div>
        <button type="button" aria-label="Previous film shot" onClick={() => seek(-1)} disabled={!ready}>‹</button>
        {!reduced && <button type="button" aria-label={paused ? 'Play automotive film' : 'Pause automotive film'} aria-pressed={paused} onClick={() => setPaused(value => !value)} disabled={!ready}>{paused ? '▶' : 'Ⅱ'}</button>}
        <button type="button" aria-label="Next film shot" onClick={() => seek(1)} disabled={!ready}>›</button>
      </div>
    </div>
  </>
}
