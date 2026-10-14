import { useCallback, useEffect, useRef, type RefObject } from 'react'

/** Start the decoder before seeking: mobile browsers may only preload metadata. */
export function useScrollVideo(
  sectionRef: RefObject<HTMLElement | null>,
  videoRef: RefObject<HTMLVideoElement | null>,
  progressRef: RefObject<number>,
  enabled: boolean,
) {
  const primed = useRef(false)
  const priming = useRef(false)
  const cancelRef = useRef<(() => void) | null>(null)

  const seek = useCallback(() => {
    const video = videoRef.current
    if (!video || priming.current || !video.paused || video.seeking || !Number.isFinite(video.duration) || video.duration <= 0) return
    const target = Math.max(0, Math.min(1, progressRef.current)) * Math.max(0, video.duration - 0.06)
    if (Math.abs(video.currentTime - target) > 0.03) video.currentTime = target
  }, [videoRef, progressRef])

  // Call synchronously before explicit playback, so an older play() promise
  // cannot pause a film the visitor has just asked to watch.
  const cancelPreparation = useCallback(() => cancelRef.current?.(), [])
  const markPrepared = useCallback(() => { primed.current = true }, [])

  useEffect(() => {
    if (!enabled) return
    const video = videoRef.current
    const section = sectionRef.current
    if (!video || !section || primed.current) return
    let disposed = false
    let generation = 0

    const prepare = () => {
      if (disposed || primed.current || priming.current || video.error) return
      const request = ++generation
      video.muted = true
      video.playsInline = true
      video.preload = 'auto'
      priming.current = true
      void video.play().then(() => {
        if (disposed || request !== generation) return
        primed.current = true
        priming.current = false
        video.pause()
        seek()
      }).catch(() => {
        if (!disposed && request === generation) {
          priming.current = false
          seek()
        }
        // A browser policy or interrupted load is retryable on the next
        // gesture. It must not disable the visitor's Play film button.
      })
    }

    const cancel = () => {
      generation += 1
      if (priming.current) video.pause()
      priming.current = false
    }
    cancelRef.current = cancel
    prepare()
    section.addEventListener('touchstart', prepare, { passive: true })
    section.addEventListener('touchend', prepare, { passive: true })
    section.addEventListener('pointerdown', prepare, { passive: true })
    section.addEventListener('keydown', prepare)
    return () => {
      disposed = true
      cancel()
      cancelRef.current = null
      section.removeEventListener('touchstart', prepare)
      section.removeEventListener('touchend', prepare)
      section.removeEventListener('pointerdown', prepare)
      section.removeEventListener('keydown', prepare)
    }
  }, [enabled, sectionRef, videoRef, seek])

  return { seek, cancelPreparation, markPrepared }
}
