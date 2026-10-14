import { useReducedMotion } from '../../hooks/useReducedMotion'
import './HeroMedia.css'

const POSTER = '/media/wallace-shift-hero-poster.webp'
const STUDIO_POSTER = '/media/about/studio-world-mobile.webp'

export type HeroAppearance = 'original' | 'studio'

export function HeroMedia({ posterOnly = false, appearance = 'original' }: {
  posterOnly?: boolean
  appearance?: HeroAppearance
}) {
  const reducedMotion = useReducedMotion()

  if (appearance === 'studio') return (
    <div className="hero-media hero-media--studio" aria-hidden="true">
      <img src={STUDIO_POSTER} className="hero-media__studio" width="720" height="720" alt="" fetchPriority="high" />
    </div>
  )

  return (
    <div className="hero-media" aria-hidden="true">
      {posterOnly || reducedMotion ? (
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
          {/* Archived Seedance 2.0 homepage loop, retained for the
              original-media experiment. Its poster and source footage
              remain in /media; the live homepage uses the WebGL scene. */}
          <source src="/media/archive/home-hero/hero-loop.webm" type="video/webm" />
          <source src="/media/archive/home-hero/hero-loop.mp4" type="video/mp4" />
        </video>
      )}
      <div className="hero-media__scrim" />
    </div>
  )
}
