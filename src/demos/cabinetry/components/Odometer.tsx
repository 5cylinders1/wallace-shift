import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { DUR, prefersReducedMotion } from '../motion'

const CELLS = Array.from({ length: 20 }, (_, n) => n % 10)
/** Each strip holds 0–9 twice, so even a 0 rolls a full turn. One cell is 5% of a strip. */
const target = (digit: number) => -(10 + digit) * 5

/**
 * A figure whose digits roll into place like slats. It rolls once when it
 * scrolls into view (`trigger="view"`) or every time the value changes
 * (`trigger="change"`). Screen readers get the plain value. Only transforms move.
 */
export default function Odometer({ value, trigger = 'view' }: { value: string; trigger?: 'view' | 'change' }) {
  const root = useRef<HTMLSpanElement>(null)
  const first = useRef(true)
  const chars = [...value]

  useGSAP(() => {
    const strips = Array.from(root.current?.querySelectorAll<HTMLElement>('.tb-odo-strip') ?? [])
    const to = (n: number) => target(Number(strips[n].dataset.digit))
    if (prefersReducedMotion()) { gsap.set(strips, { yPercent: to, y: 0 }); return }
    if (first.current && trigger === 'view') {
      gsap.fromTo(strips, { yPercent: 0, y: 0 }, {
        yPercent: to, duration: DUR.roll, ease: 'tambour', stagger: 0.06,
        scrollTrigger: { trigger: root.current, start: 'top 92%', once: true },
      })
    } else {
      gsap.to(strips, { yPercent: to, y: 0, duration: first.current ? 0 : DUR.roll * 0.6, ease: 'tambour', stagger: 0.035, overwrite: true })
    }
    first.current = false
  }, { scope: root, dependencies: [value] })

  return <span className="tb-odo">
    <span className="tb-visually-hidden">{value}</span>
    <span className="tb-odo-visual" ref={root} aria-hidden="true">
      {chars.map((char, n) => {
        // Keyed from the right, so the units stay put when the figure grows.
        const key = chars.length - n
        if (!/\d/.test(char)) return <span key={`c${key}`} className="tb-odo-char">{char}</span>
        return <span key={`d${key}`} className="tb-odo-digit">
          <span className="tb-odo-strip" data-digit={char}>{CELLS.map((cell, i) => <span key={i}>{cell}</span>)}</span>
        </span>
      })}
    </span>
  </span>
}
