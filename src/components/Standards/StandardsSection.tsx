import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { standards } from '../../content/siteConfig'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { DiagonalRun } from '../DiagonalRun/DiagonalRun'
import { StandardPrinciple } from './StandardPrinciple'
import './StandardsSection.css'

export function StandardsSection() {
  const reducedMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const eyebrowRef = useRef<HTMLParagraphElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const principleRefs = useRef<(HTMLLIElement | null)[]>([])

  useGSAP(
    () => {
      const section = sectionRef.current
      const eyebrow = eyebrowRef.current
      const headline = headlineRef.current
      const rows = principleRefs.current.filter((row): row is HTMLLIElement => !!row)

      if (!section || !eyebrow || !headline || rows.length === 0) return

      const rules = rows.map((row) => row.querySelector<HTMLElement>('.standard-principle__rule'))
      const copyGroups = rows.map((row) =>
        row.querySelectorAll<HTMLElement>('.standard-principle__number, .standard-principle__title, .standard-principle__description'),
      )

      if (reducedMotion) {
        // Static, fully visible layout — CSS defaults already show
        // everything without JS, so reduced motion just skips creating
        // any timeline or ScrollTrigger at all.
        return
      }

      gsap.set(eyebrow, { opacity: 0 })
      gsap.set(headline, { opacity: 0, y: 22 })
      gsap.set(rules, { scaleX: 0, transformOrigin: 'left center' })
      copyGroups.forEach((group) => gsap.set(group, { opacity: 0, y: 12 }))

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
        defaults: { ease: 'power2.out' },
      })

      tl.to(eyebrow, { opacity: 1, duration: 0.35 }, 0)
      tl.to(headline, { opacity: 1, y: 0, duration: 0.65 }, 0.08)

      rows.forEach((_row, i) => {
        const start = 0.28 + i * 0.1
        tl.to(rules[i], { scaleX: 1, duration: 0.5 }, start)
        tl.to(copyGroups[i], { opacity: 1, y: 0, duration: 0.5, stagger: 0.03 }, start + 0.05)
      })
    },
    { scope: sectionRef, dependencies: [reducedMotion] },
  )

  return (
    <section id="about" className="standards" ref={sectionRef}>
      <div className="container standards__grid">
        <div className="standards__intro">
          <p className="eyebrow standards__eyebrow" ref={eyebrowRef}>
            {standards.eyebrow}
          </p>
          <h2 className="standards__headline" ref={headlineRef}>
            {standards.headline}
          </h2>
        </div>

        <ol className="standards__list">
          {standards.principles.map((item, index) => (
            <StandardPrinciple
              key={item.number}
              item={item}
              ref={(el) => {
                principleRefs.current[index] = el
              }}
            />
          ))}
        </ol>
      </div>

      <DiagonalRun />
    </section>
  )
}
