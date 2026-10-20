import { useEffect, useRef, useState, type RefObject } from 'react'

export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const change = () => setMatches(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [query])
  return matches
}

/** True while the element is on screen (with a margin), for pausing work off screen. */
export function useInView<T extends Element>(margin = '0px'): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: margin })
    observer.observe(node)
    return () => observer.disconnect()
  }, [margin])
  return [ref, visible]
}

/**
 * Adds `is-revealed` to every `[data-reveal]` element under the root once it
 * scrolls into view. The resting state is visible: the CSS only hides
 * elements while `.tb-js-reveal` is on the root and motion is allowed.
 */
export function useReveal(dependency: unknown) {
  useEffect(() => {
    const root = document.querySelector('.tb-site')
    if (!root) return
    root.classList.add('tb-js-reveal')
    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-revealed)'))
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-revealed')
        observer.unobserve(entry.target)
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    items.forEach(item => observer.observe(item))
    return () => observer.disconnect()
  }, [dependency])
}
