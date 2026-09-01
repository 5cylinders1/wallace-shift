import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type RefObject } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import './SpotlightMedia.css'

export type SpotlightMediaHandle = {
  /** Aims the light at whatever vertical position `clientY` represents,
   * using the same section-relative mapping as live pointer tracking below
   * — for keyboard focus and selection, where there's no pointer event to
   * read a position from directly. */
  aimAtClientY: (clientY: number) => void
  /** Eases back to the resting, level-aim position. */
  resetToNeutral: () => void
}

interface SpotlightMediaProps {
  /** Where pointermove/pointerleave are attached — the whole interactive
   * area (the ShiftQuiz section), so the light responds anywhere in view,
   * not only directly over an answer. */
  listenRef: RefObject<HTMLElement | null>
  /** Returns the rect the 0-1 Y position is normalized against. This is
   * deliberately *not* the same rect as `listenRef`: the section includes
   * a lot of heading/intro copy above the answers, and normalizing against
   * the full section pushed every answer's own position into the bottom
   * half of the aim range (hovering the first, topmost answer already
   * read as more than halfway to "max downward"). Normalizing against the
   * answers themselves instead means the first answer reads as aiming up,
   * the last as aiming down, matching how a stacked list actually reads —
   * re-queried on every use since the answers remount each quiz step. */
  getBoundsRect: () => DOMRect | null
}

const VIDEO_SRC = '/media/spotlight-final.mp4'
const POSTER = '/media/spotlight-final-poster.webp'

// The source clip (1916x1080, 24fps, 73 frames, 3.041667s) carries the
// beam's full on/aim/off sequence, but only 1.250-2.125s is the usable
// aiming sweep — everything outside that is startup, hold, or shutdown
// footage and must never be reachable through interaction.
const AIM_MIN_TIME = 1.25
const AIM_MAX_TIME = 2.125
const NEUTRAL_TIME = 1.5

// Nonlinear progress -> time lookup compensating for the source clip's own
// eased aim movement, so the beam tracks the pointer at a roughly constant
// perceived rate instead of the video's native ease-in/out.
const AIM_MAP = [
  { progress: 0, time: 1.25 },
  { progress: 0.2, time: 1.375 },
  { progress: 0.42, time: 1.5 },
  { progress: 0.6, time: 1.625 },
  { progress: 0.76, time: 1.75 },
  { progress: 0.89, time: 1.875 },
  { progress: 0.97, time: 2.0 },
  { progress: 1, time: 2.125 },
] as const

// Smoothing time-constant for the displayed-time ease — within the
// requested 100-160ms restrained-smoothing range.
const SMOOTHING_TAU = 0.11

// One frame at the source's 24fps. Used both as "close enough to stop
// easing" and as the minimum `video.currentTime` write worth making, so a
// settled light never keeps nudging the video by imperceptible amounts.
const FRAME_TIME = 1 / 24
const SEEK_EPSILON = FRAME_TIME / 2

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function progressForClientY(clientY: number, rect: DOMRect): number {
  const rawY = (clientY - rect.top) / rect.height
  return clamp01((rawY - 0.1) / 0.8)
}

function timeForProgress(progress: number): number {
  const p = clamp01(progress)
  for (let i = 0; i < AIM_MAP.length - 1; i++) {
    const from = AIM_MAP[i]
    const to = AIM_MAP[i + 1]
    if (p <= to.progress) {
      const span = to.progress - from.progress
      const t = span <= 0 ? 0 : (p - from.progress) / span
      return from.time + (to.time - from.time) * t
    }
  }
  return AIM_MAP[AIM_MAP.length - 1].time
}

function clampAimTime(time: number): number {
  return Math.min(AIM_MAX_TIME, Math.max(AIM_MIN_TIME, time))
}

export const SpotlightMedia = forwardRef<SpotlightMediaHandle, SpotlightMediaProps>(
  function SpotlightMedia({ listenRef, getBoundsRect }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [ready, setReady] = useState(false)
    const [failed, setFailed] = useState(false)
    const readyHandledRef = useRef(false)
    const reducedMotion = useReducedMotion()
    const canTrackPointer = useMediaQuery('(hover: hover) and (pointer: fine)')

    // Mutable easing state — refs, not state: this updates up to once per
    // animation frame and must never trigger a React re-render.
    const targetTimeRef = useRef(NEUTRAL_TIME)
    const displayTimeRef = useRef(NEUTRAL_TIME)
    const lastWrittenRef = useRef(NEUTRAL_TIME)
    const rafIdRef = useRef<number | null>(null)
    const lastFrameAtRef = useRef<number | null>(null)

    const ensureLoopRunning = useCallback(() => {
      if (rafIdRef.current !== null) return
      const video = videoRef.current
      if (!video) return

      const tick = (timestamp: number) => {
        if (lastFrameAtRef.current === null) lastFrameAtRef.current = timestamp
        const deltaTime = (timestamp - lastFrameAtRef.current) / 1000
        lastFrameAtRef.current = timestamp

        const target = targetTimeRef.current
        displayTimeRef.current += (target - displayTimeRef.current) * (1 - Math.exp(-deltaTime / SMOOTHING_TAU))

        const settled = Math.abs(target - displayTimeRef.current) <= SEEK_EPSILON
        if (settled) displayTimeRef.current = target

        if (Math.abs(displayTimeRef.current - lastWrittenRef.current) > SEEK_EPSILON) {
          video.currentTime = displayTimeRef.current
          lastWrittenRef.current = displayTimeRef.current
        }

        if (settled) {
          rafIdRef.current = null
          lastFrameAtRef.current = null
        } else {
          rafIdRef.current = requestAnimationFrame(tick)
        }
      }

      rafIdRef.current = requestAnimationFrame(tick)
    }, [])

    const setTarget = useCallback(
      (time: number) => {
        targetTimeRef.current = clampAimTime(time)
        ensureLoopRunning()
      },
      [ensureLoopRunning],
    )

    useImperativeHandle(
      ref,
      () => ({
        aimAtClientY(clientY: number) {
          const rect = getBoundsRect()
          if (!rect) return
          setTarget(timeForProgress(progressForClientY(clientY, rect)))
        },
        resetToNeutral() {
          setTarget(NEUTRAL_TIME)
        },
      }),
      [getBoundsRect, setTarget],
    )

    // Live pointer tracking — fine-pointer/hover devices only. Touch never
    // drives scrubbing: no listeners are attached at all, so there's
    // nothing to intercept vertical scrolling or require a drag gesture.
    useEffect(() => {
      const listenTarget = listenRef.current
      if (!listenTarget || reducedMotion || !canTrackPointer || !ready) return

      const handlePointerMove = (event: PointerEvent) => {
        const rect = getBoundsRect()
        if (!rect) return
        setTarget(timeForProgress(progressForClientY(event.clientY, rect)))
      }
      const handlePointerLeave = () => {
        setTarget(NEUTRAL_TIME)
      }

      listenTarget.addEventListener('pointermove', handlePointerMove)
      listenTarget.addEventListener('pointerleave', handlePointerLeave)
      return () => {
        listenTarget.removeEventListener('pointermove', handlePointerMove)
        listenTarget.removeEventListener('pointerleave', handlePointerLeave)
      }
    }, [listenRef, getBoundsRect, reducedMotion, canTrackPointer, ready, setTarget])

    useEffect(() => {
      return () => {
        if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current)
      }
    }, [])

    // Seeks to the neutral frame once metadata/decodable data is available,
    // then reveals the video only after that seek has actually completed —
    // otherwise `preload="auto"` can paint frame zero (the light-off start
    // of the clip) for a frame or two before the seek lands.
    const handleReady = () => {
      const video = videoRef.current
      if (!video || readyHandledRef.current) return
      readyHandledRef.current = true
      video.pause()

      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked)
        targetTimeRef.current = NEUTRAL_TIME
        displayTimeRef.current = NEUTRAL_TIME
        lastWrittenRef.current = NEUTRAL_TIME
        setReady(true)
      }
      video.addEventListener('seeked', onSeeked)
      video.currentTime = NEUTRAL_TIME
    }

    const handleError = () => {
      setFailed(true)
    }

    if (reducedMotion || failed) {
      return <img src={POSTER} alt="" className="spotlight-media__frame" />
    }

    return (
      <div className="spotlight-media">
        <img
          src={POSTER}
          alt=""
          aria-hidden="true"
          className={`spotlight-media__frame spotlight-media__poster${ready ? ' spotlight-media__poster--hidden' : ''}`}
        />
        <video
          ref={videoRef}
          className="spotlight-media__frame spotlight-media__video"
          muted
          playsInline
          preload="auto"
          poster={POSTER}
          onLoadedMetadata={handleReady}
          onCanPlay={handleReady}
          onError={handleError}
        >
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>
      </div>
    )
  },
)
