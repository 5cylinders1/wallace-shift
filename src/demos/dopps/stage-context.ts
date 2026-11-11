import { createContext, useContext, useEffect, useRef, useSyncExternalStore, type RefObject } from 'react'
import type { Hit, Shot } from './engine/SpineStage'

export function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Phones and portrait tablets stack the copy over the spine instead of beside it. */
export const useNarrow = () => useMedia('(max-width: 899px)')

export interface StageApi {
  setShot: (shot: Shot) => void
  onSelect: (handler: ((hit: Hit) => void) | null) => void
  status: 'loading' | 'ready' | 'fallback'
}

export const StageContext = createContext<StageApi>({ setShot: () => {}, onSelect: () => {}, status: 'loading' })
export const useStage = () => useContext(StageContext)

/**
 * Hands the camera to a section while it crosses the middle of the screen. If the
 * shot changes while the section holds the camera (a new symptom, a rotated phone),
 * the new shot applies straight away.
 */
export function useStageSection(ref: RefObject<HTMLElement | null>, shot: Shot) {
  const { setShot } = useStage()
  const active = useRef(false)
  const latest = useRef(shot)

  useEffect(() => {
    latest.current = shot
    if (active.current) setShot(shot)
  }, [shot, setShot])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      active.current = entry.isIntersecting
      if (entry.isIntersecting) setShot(latest.current)
    }, { rootMargin: '-48% 0px -48% 0px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, setShot])
}
