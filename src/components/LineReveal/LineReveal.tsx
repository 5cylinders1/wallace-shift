import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import './LineReveal.css'

interface LineRevealProps {
  lines: readonly string[]
  className?: string
  /** Seconds to wait after the section is reached. */
  delay?: number
}

/**
 * A headline that reveals line by line, each sliding up from behind its own
 * mask — the hero's entrance, made reusable so the site's large editorial
 * headings all move the same way instead of some fading and some not.
 *
 * Renders an <h2>; the caller supplies the section's own heading class.
 */
export function LineReveal({ lines, className, delay = 0 }: LineRevealProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const reducedMotion = useReducedMotion()

  useGSAP(
    () => {
      const heading = headingRef.current
      if (!heading || reducedMotion) return

      const inners = heading.querySelectorAll<HTMLElement>('.line-reveal__inner')
      if (inners.length === 0) return

      gsap.fromTo(
        inners,
        { yPercent: 112 },
        {
          yPercent: 0,
          duration: 1.05,
          stagger: 0.12,
          delay,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: heading,
            start: 'top 88%',
            toggleActions: 'play none none none',
          },
        },
      )
    },
    { scope: headingRef, dependencies: [reducedMotion] },
  )

  return (
    <h2 className={className} ref={headingRef}>
      {lines.map((line) => (
        <span className="line-reveal__line" key={line}>
          <span className="line-reveal__inner">{line}</span>
        </span>
      ))}
    </h2>
  )
}
