import { useReducedMotion } from '../../hooks/useReducedMotion'
import './HeroMedia.css'

const POSTER = '/media/wallace-shift-hero-poster.webp'

export function HeroMedia() {
  const reducedMotion = useReducedMotion()

  return (
    <div className="hero-media" aria-hidden="true">
      {reducedMotion ? (
        <img src={POSTER} alt="" className="hero-media__frame" />
      ) : (
        <video
          className="hero-media__frame"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={POSTER}
        >
          {/* Seedance 2.0 locked-camera loop grown from the approved poster
              frame: livelier water, rigid WS, and matching first/last
              frames so the loop point stays invisible. Verified against
              the original footage for motion level and zero camera drift;
              the original sources remain in /media as the known-good
              fallback. */}
          <source src="/media/generated/hero-loop.webm" type="video/webm" />
          <source src="/media/generated/hero-loop.mp4" type="video/mp4" />
        </video>
      )}
      <div className="hero-media__scrim" />
    </div>
  )
}
