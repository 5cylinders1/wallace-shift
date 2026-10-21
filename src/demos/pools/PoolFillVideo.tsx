import { forwardRef, useCallback, useImperativeHandle, useRef, useState, type RefObject } from 'react'
import { useScrollVideo } from '../../hooks/useScrollVideo'
import './pool-fill-video.css'

export interface PoolFillVideoHandle {
  setProgress: (value: number, visible: boolean) => void
}

interface PoolFillVideoProps {
  sectionRef: RefObject<HTMLElement | null>
  reducedMotion: boolean
}

const poster = '/demos/pools/pool-fill-poster.webp'
const clamp = (value: number) => Math.max(0, Math.min(1, value))
// Both encodes contain 193 complete scene frames at 24 fps.
const targetTime = (progress: number, duration: number) => progress >= 1
  ? Math.max(0, duration - 1 / 48)
  : progress * Math.max(0, duration - .06)

const PoolFillVideo = forwardRef<PoolFillVideoHandle, PoolFillVideoProps>(function PoolFillVideo({ sectionRef, reducedMotion }, ref) {
  const layerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressRef = useRef(0)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const { seek, markPrepared } = useScrollVideo(sectionRef, videoRef, progressRef, !reducedMotion)

  const syncFrame = useCallback(() => {
    const video = videoRef.current
    if (progressRef.current < 1) {
      seek()
    } else if (video && video.paused && !video.seeking && Number.isFinite(video.duration) && video.duration > 0) {
      // Hold the actual last frame; the shared hook leaves a larger end margin.
      const lastFrame = targetTime(1, video.duration)
      if (Math.abs(video.currentTime - lastFrame) > .01) video.currentTime = lastFrame
    }
  }, [seek])

  useImperativeHandle(ref, () => ({
    setProgress(value: number, visible: boolean) {
      const progress = Number.isFinite(value) ? clamp(value) : 0
      progressRef.current = progress
      const layer = layerRef.current
      if (layer) {
        layer.dataset.active = String(visible)
        layer.dataset.progress = progress.toFixed(3)
        layer.dataset.complete = String(progress >= 1)
      }
      syncFrame()
    },
  }), [syncFrame])

  const reconcile = () => {
    syncFrame()
    const video = videoRef.current
    if (!video || !video.paused || video.seeking || video.readyState < 2 || !Number.isFinite(video.duration)) return
    if (Math.abs(video.currentTime - targetTime(progressRef.current, video.duration)) > .07) return
    // Do not expose decoder priming or the wrong initial frame on a deep link.
    setReady(true)
    if (layerRef.current) layerRef.current.dataset.currentTime = video.currentTime.toFixed(3)
  }

  return <div
    ref={layerRef}
    className="sw-fill-video"
    data-active={reducedMotion ? 'true' : 'false'}
    data-complete={reducedMotion ? 'true' : 'false'}
    data-state={reducedMotion ? 'still' : failed ? 'unavailable' : ready ? 'ready' : 'loading'}
    aria-hidden="true"
  >
    <img className="sw-fill-poster" src={poster} width="1916" height="1080" alt="" decoding="async" fetchPriority={reducedMotion ? 'high' : 'auto'} />
    {!reducedMotion && <video
      ref={videoRef}
      muted
      playsInline
      disablePictureInPicture
      preload="auto"
      poster="/demos/pools/pool-finish.webp"
      onLoadedMetadata={syncFrame}
      onLoadedData={reconcile}
      onCanPlay={reconcile}
      onPlaying={markPrepared}
      onPause={reconcile}
      onSeeked={reconcile}
      onError={event => {
        if (event.target === event.currentTarget) {
          event.currentTarget.pause()
          setFailed(true)
        }
      }}
    >
      <source media="(max-width: 700px)" src="/demos/pools/pool-fill-mobile.mp4" type="video/mp4" />
      <source src="/demos/pools/pool-fill.mp4" type="video/mp4" />
    </video>}
  </div>
})

export default PoolFillVideo
