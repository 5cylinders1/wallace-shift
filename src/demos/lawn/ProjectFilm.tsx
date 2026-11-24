import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from './hooks'

/**
 * Lareau's own 2023 project film (from its website), muted and looping over
 * a still of its first frame. Nothing loads until it nears the screen; it
 * fades in once actually playing, so a blocked autoplay leaves the still,
 * and it pauses off screen. Reduced motion shows the still only.
 */
export default function ProjectFilm() {
  const video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    const element = video.current
    if (!element) return
    element.muted = true
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) element.play().catch(() => undefined)
      else element.pause()
    }, { rootMargin: '200px 0px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [reduced])

  return (
    <figure className="ll-work-film ll-reveal">
      <div className="ll-work-film-frame">
        <picture>
          <source media="(max-width: 760px)" srcSet="/demos/lawn/film-poster-mobile.webp" />
          <img src="/demos/lawn/film-poster.webp" alt="" width={1920} height={1080} loading="lazy" decoding="async" />
        </picture>
        {!reduced && (
          <video
            ref={video}
            className={playing ? 'is-playing' : undefined}
            muted
            loop
            playsInline
            preload="none"
            disablePictureInPicture
            aria-hidden="true"
            onPlaying={() => setPlaying(true)}
          >
            <source src="/demos/lawn/film-mobile.mp4" type="video/mp4" media="(max-width: 760px)" />
            <source src="/demos/lawn/film.webm" type="video/webm" />
            <source src="/demos/lawn/film.mp4" type="video/mp4" />
          </video>
        )}
      </div>
      <figcaption>Recent Lareau projects, from the company’s own film.</figcaption>
    </figure>
  )
}
