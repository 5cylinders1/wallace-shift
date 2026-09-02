import { useEffect, useState, type RefObject } from 'react'

/** How long each stage holds before the next one takes over. Long enough
 *  to read a step's two lines without hurrying. */
const STAGE_HOLD_MS = 3400
/** How much of the section must be on screen before the cycle runs. */
const CYCLE_THRESHOLD = 0.3

/**
 * Drives the three-beat approach sequence: which stage is showing, and
 * whether the section is on screen at all.
 *
 * The cycle is a plain timer rather than a pinned scroll scrub — the brief
 * keeps small screens off prolonged pinned scrolls, and the homepage
 * already carries the hero video and the quiz. Leaving the section rewinds
 * to the first stage, so the next arrival replays the sequence in order
 * with the car driving in rather than resuming mid tire-swap.
 */
export function useStageCycle(
  sectionRef: RefObject<HTMLElement | null>,
  stageCount: number,
  enabled: boolean,
) {
  const [stage, setStage] = useState(0)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
        if (!entry.isIntersecting) setStage(0)
      },
      { threshold: CYCLE_THRESHOLD },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [sectionRef, enabled])

  useEffect(() => {
    if (!enabled || !inView) return

    const timer = window.setInterval(() => {
      setStage((current) => (current + 1) % stageCount)
    }, STAGE_HOLD_MS)

    return () => window.clearInterval(timer)
  }, [enabled, inView, stageCount])

  return { stage, inView }
}
