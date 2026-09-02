import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import './PageHero.css'

type PageHeroProps = {
  eyebrow: string
  /** Rendered as masked lines, one per entry. */
  headlineLines: readonly string[]
  /** Optional final line, set in the editorial serif and ember accent. */
  headlineAccent?: string
  supporting: string
  note?: string
}

/**
 * The opening block every interior page shares.
 *
 * Deliberately quieter than the homepage hero — these pages exist to be
 * read, so there is no media, no pointer work, and no full viewport. The
 * masked line reveal is the same one the pricing hero uses, so the pages
 * feel like one site rather than a set of templates.
 */
export function PageHero({
  eyebrow,
  headlineLines,
  headlineAccent,
  supporting,
  note,
}: PageHeroProps) {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .from('.page-hero__eyebrow', { opacity: 0, y: 16, duration: 0.8 }, 0.05)
          .fromTo(
            '.page-hero__line-inner',
            { yPercent: 112 },
            { yPercent: 0, duration: 1, stagger: 0.12, ease: 'power4.out' },
            0.16,
          )
          .from(
            '.page-hero__supporting',
            { opacity: 0, y: 18, duration: 0.85 },
            0.5,
          )
          .from('.page-hero__note', { opacity: 0, y: 14, duration: 0.85 }, 0.62)
      })

      return () => mm.revert()
    },
    { scope: sectionRef },
  )

  return (
    <section className="page-hero" ref={sectionRef}>
      <div className="container page-hero__inner">
        <p className="eyebrow page-hero__eyebrow">{eyebrow}</p>

        <h1 className="page-hero__headline">
          {headlineLines.map((line) => (
            <span className="page-hero__line" key={line}>
              <span className="page-hero__line-inner">{line}</span>
            </span>
          ))}
          {headlineAccent && (
            <span className="page-hero__line">
              <span className="page-hero__line-inner accent-serif">
                {headlineAccent}
              </span>
            </span>
          )}
        </h1>

        <p className="page-hero__supporting">{supporting}</p>
        {note && <p className="page-hero__note">{note}</p>}
      </div>
    </section>
  )
}
