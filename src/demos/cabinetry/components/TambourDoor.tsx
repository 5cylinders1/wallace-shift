import { useEffect, useRef, useState, type CSSProperties } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useMedia } from '../hooks'
import Photo from './Photo'

gsap.registerPlugin(useGSAP)
const SLATS = 22

/**
 * The namesake: a roll-up door of walnut slats over a real espresso station.
 * It opens once when it scrolls into view, and the button opens or closes it
 * at any time. Reduced motion skips the automatic opening and the tween.
 */
export default function TambourDoor() {
  const root = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const reduced = useMedia('(prefers-reduced-motion: reduce)')
  const opened = useRef(false)

  useEffect(() => {
    const node = root.current
    if (!node || reduced) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || opened.current) return
      opened.current = true
      setOpen(true)
      observer.disconnect()
    }, { threshold: 0.55 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [reduced])

  useGSAP(() => {
    const door = root.current
    if (!door) return
    const target = open ? 1 : 0
    if (reduced) { door.style.setProperty('--open', String(target)); return }
    const state = { value: Number(getComputedStyle(door).getPropertyValue('--open')) || 0 }
    gsap.to(state, { value: target, duration: 1.6, ease: 'power2.inOut', onUpdate: () => door.style.setProperty('--open', String(state.value)) })
  }, { scope: root, dependencies: [open, reduced] })

  const toggle = () => { opened.current = true; setOpen(value => !value) }

  return <div ref={root} className="tb-door" style={{ '--open': 0 } as CSSProperties}>
    <div className="tb-door-cabinet">
      <div className="tb-door-opening">
        <Photo slug="coffee-station" className="tb-door-inside" sizes="(min-width: 1000px) 34vw, 86vw" />
        <div className="tb-door-shadow" aria-hidden="true" />
        <div className="tb-door-slats" aria-hidden="true">
          {Array.from({ length: SLATS }, (_, i) => <span key={i} className="tb-door-slat" style={{ backgroundPosition: `${(i * 37) % 100}% ${(i * 53) % 100}%` }} />)}
          <span className="tb-door-pull" />
        </div>
      </div>
      <div className="tb-door-valance" aria-hidden="true" />
    </div>
    <button type="button" className="tb-button tb-button-line tb-door-button" aria-pressed={open} onClick={toggle}>
      {open ? 'Close the tambour' : 'Open the tambour'}
    </button>
  </div>
}
