import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

type Direction = 1 | -1
type Entrance = { direction: Direction; fadeOnly: boolean }

/** Only the outgoing question pauses input. The answer entrance is always interactive. */
export function useQuizQuestionMotion(questionKey: string, scrollRef: RefObject<HTMLDivElement | null>) {
  const panelRef = useRef<HTMLDivElement>(null)
  const animations = useRef<Animation[]>([])
  const entrance = useRef<Entrance | null>(null)
  const inputMethod = useRef<'pointer' | 'keyboard'>('keyboard')
  const locked = useRef(false)
  const revision = useRef(0)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const finishMotion = () => {
      if (preference.matches) animations.current.forEach(animation => animation.finish())
    }
    preference.addEventListener('change', finishMotion)
    return () => {
      preference.removeEventListener('change', finishMotion)
      revision.current += 1
      animations.current.forEach(animation => animation.cancel())
      animations.current = []
    }
  }, [])

  useLayoutEffect(() => {
    animations.current.forEach(animation => animation.cancel())
    animations.current = []
    const nextEntrance = entrance.current
    entrance.current = null
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' })
    const panel = panelRef.current
    if (!nextEntrance || !panel || typeof panel.animate !== 'function') return

    const easing = getComputedStyle(panel).getPropertyValue('--ease-premium').trim()
    if (nextEntrance.fadeOnly || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      animations.current = [panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 125, easing })]
      return
    }

    const copy = panel.querySelector<HTMLElement>('.qf-question-copy')
    const answers = Array.from(panel.querySelectorAll<HTMLElement>('.qf-choice, .qf-fields > .ao-field'))
    const firstRow = answers[0]?.offsetTop
    const enter = (element: HTMLElement, distance: number, duration: number, delay = 0) => element.animate([
      { opacity: 0, transform: `translateX(${distance * nextEntrance.direction}px)` },
      { opacity: 1, transform: 'translateX(0)' },
    ], { duration, delay, easing, fill: 'backwards' })

    if (copy) animations.current.push(enter(copy, 16, 180))
    answers.forEach(answer => {
      // Two short waves, even for long answer lists. No cumulative wait per option.
      const isFirstRow = answer.offsetTop === firstRow
      animations.current.push(enter(answer, 12, isFirstRow ? 150 : 125, isFirstRow ? 30 : 60))
    })
  }, [questionKey, scrollRef])

  function transition(commit: () => void, direction: Direction, immediate = false) {
    if (locked.current) return
    const panel = panelRef.current
    const keyboard = inputMethod.current === 'keyboard'
    const fadeOnly = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (immediate || keyboard || !panel || typeof panel.animate !== 'function') {
      entrance.current = null
      animations.current.forEach(animation => animation.cancel())
      animations.current = []
      commit()
      return
    }

    entrance.current = { direction, fadeOnly }
    if (fadeOnly) {
      commit()
      return
    }

    locked.current = true
    setLeaving(true)
    const currentRevision = ++revision.current
    const easing = getComputedStyle(panel).getPropertyValue('--ease-premium').trim()
    const exit = panel.animate([
      { opacity: 1, transform: 'translateX(0)' },
      { opacity: 0, transform: `translateX(${-8 * direction}px)` },
    ], { duration: 100, easing, fill: 'forwards' })
    animations.current.push(exit)
    void exit.finished.then(() => {
      if (revision.current !== currentRevision) return
      locked.current = false
      setLeaving(false)
      commit()
    }).catch(() => {
      // Unmount cancellation must not commit a delayed navigation.
    })
  }

  function onKeyDownCapture() {
    inputMethod.current = 'keyboard'
    entrance.current = null
    // Keyboard users never have to chase a moving option or wait for an entrance.
    animations.current.forEach(animation => animation.finish())
  }

  return {
    panelRef,
    leaving,
    isLocked: () => locked.current,
    transition,
    onPointerDownCapture: () => { inputMethod.current = 'pointer' },
    onKeyDownCapture,
  }
}
