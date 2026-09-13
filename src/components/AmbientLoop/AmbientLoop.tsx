import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import type { AmbientMediaAsset } from '../../content/mediaAssets'
import './AmbientLoop.css'

interface AmbientLoopProps {
  media: AmbientMediaAsset
  className?: string
  active?: boolean
}

// Decorative looping background media. The poster paints immediately; the
// muted looping video only starts downloading once the element approaches
// the viewport, and only plays while actually visible. Reduced motion or a
// playback error simply leaves the poster in place — the loop's first and
// last frames match the poster, so the video appearing over it is
// seamless.
export function AmbientLoop({ media, className, active = true }: AmbientLoopProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [failed, setFailed] = useState(false)
  const reducedMotion = useReducedMotion()

  const showVideo = Boolean(media.video) && !reducedMotion && !failed

  useEffect(() => {
    if (!showVideo || shouldLoad || !active) return
    const root = rootRef.current
    if (!root) return

    const loadObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true)
          loadObserver.disconnect()
        }
      },
      { rootMargin: '240px' },
    )
    loadObserver.observe(root)
    return () => loadObserver.disconnect()
  }, [showVideo, shouldLoad, active])

  useEffect(() => {
    if (!showVideo || !shouldLoad) return
    const root = rootRef.current
    const videoEl = videoRef.current
    if (!root || !videoEl) return
    if (!active) { videoEl.pause(); return }

    const playObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            videoEl.play().catch(() => {
              // Autoplay refusals are non-fatal: the poster stays.
            })
          } else {
            videoEl.pause()
          }
        }
      },
      { threshold: 0.1 },
    )
    playObserver.observe(root)
    return () => { playObserver.disconnect(); videoEl.pause() }
  }, [showVideo, shouldLoad, active])

  return (
    <div
      ref={rootRef}
      className={`ambient-loop${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      <img
        src={media.poster}
        alt=""
        className="ambient-loop__frame"
        loading="lazy"
        decoding="async"
      />
      {showVideo && shouldLoad && (
        <video
          ref={videoRef}
          className="ambient-loop__frame ambient-loop__video"
          muted
          loop
          playsInline
          preload="auto"
          src={media.video}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}
