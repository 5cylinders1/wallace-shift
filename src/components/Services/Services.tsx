import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { services } from '../../content/siteConfig'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { LineReveal } from '../LineReveal/LineReveal'
import { Reveal } from '../Reveal/Reveal'
import { PageLink } from '../PageLink/PageLink'
import { ServiceRow } from './ServiceRow'
import './Services.css'

export function Services() {
  const sectionRef = useRef<HTMLElement>(null)
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([])

  const [scrollActiveIndex, setScrollActiveIndex] = useState(0)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const reducedMotion = useReducedMotion()
  const isMobile = useMediaQuery('(max-width: 767px)')

  const activeIndex = hoverIndex ?? scrollActiveIndex

  // Activates whichever row is nearest the vertical center of the viewport.
  // Each row gets its own ScrollTrigger with a start/end band centered on
  // the viewport's midline; since rows are stacked with no gaps, exactly
  // one band contains that midline at a time. onToggle only fires on the
  // discrete crossing, not per scroll frame, and re-fires correctly when
  // scrolling back upward re-enters a previous row's band.
  useGSAP(
    () => {
      const rows = rowRefs.current.filter(
        (row): row is HTMLButtonElement => row !== null,
      )
      if (rows.length === 0) return

      const triggers = rows.map((row, index) =>
        ScrollTrigger.create({
          trigger: row,
          start: 'top center',
          end: 'bottom center',
          onToggle: (self) => {
            if (self.isActive) setScrollActiveIndex(index)
          },
        }),
      )

      return () => {
        triggers.forEach((trigger) => trigger.kill())
      }
    },
    { scope: sectionRef, dependencies: [] },
  )

  const clearHover = (index: number) => {
    setHoverIndex((current) => (current === index ? null : current))
  }

  return (
    <section id="services" className="services" ref={sectionRef}>
      <div className="container">
        <LineReveal
          lines={services.headingLines}
          className="services__heading"
        />

        <div className="services__rows">
          {services.items.map((item, index) => (
            <Reveal key={item.index} delay={index * 0.08}>
              <ServiceRow
                ref={(el) => {
                  rowRefs.current[index] = el
                }}
                item={item}
                isActive={activeIndex === index}
                reducedMotion={reducedMotion}
                isMobile={isMobile}
                onPointerEnter={() => setHoverIndex(index)}
                onPointerLeave={() => clearHover(index)}
                onFocus={() => setHoverIndex(index)}
                onBlur={() => clearHover(index)}
                onClick={() => setHoverIndex(index)}
              />
            </Reveal>
          ))}
        </div>

        {/* Two exits, given the same weight as the rows above them: a
            rule, a label, and the question each answers. Previously a pair
            of trailing text links, which read as an afterthought next to
            the rest of the section. */}
        <Reveal delay={0.08}>
          <div className="services__exits">
            {[services.detailLink, services.pricingLink].map((exit) => (
              <PageLink
                key={exit.href}
                href={exit.href}
                className="services__exit"
              >
                <span className="services__exit-eyebrow">{exit.eyebrow}</span>
                <span className="services__exit-label">{exit.label}</span>
                <span className="services__exit-arrow" aria-hidden="true">
                  &#8599;
                </span>
              </PageLink>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
