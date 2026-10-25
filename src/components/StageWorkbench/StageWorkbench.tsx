import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { workbench } from '../../content/approachPage'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import './StageWorkbench.css'

type Variant = 'structure' | 'launch'

interface StageWorkbenchProps {
  variant: Variant
  compact?: boolean
}

/** How long each width is held before the layout reflows. */
const REFLOW_MS = 3200

/**
 * The artifact beside each stage.
 *
 * One panel per stage rather than a single panel spanning both: the stage
 * grounds are full-bleed bands painted by `.stage::before`, and a shared
 * panel would either break that bleed or need an `overflow` ancestor —
 * which silently kills `position: sticky`, because the sticky element then
 * resolves against a container that never scrolls. Two panels at identical
 * geometry read as one workbench that re-establishes as the ground shifts,
 * and the artifact changing at the same seam as the ground is the state
 * change rather than a cut away from it.
 *
 * Neither variant depicts work that has not been done — see the
 * non-fabrication note on `workbench` in content/approachPage.ts.
 */
export function StageWorkbench({ variant, compact = false }: StageWorkbenchProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const [inView, setInView] = useState(false)
  const [narrow, setNarrow] = useState(false)

  // Runs only while the panel is on screen, so an off-screen stage is not
  // animating a layout nobody is looking at.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  /* The reflow is the point of this artifact, so reduced motion does not
     remove it — it settles on the wide layout and stops cycling, which is
     a legible still rather than an empty frame. */
  useEffect(() => {
    if (variant !== 'structure' || !inView || reducedMotion) return
    const timer = window.setInterval(() => setNarrow((n) => !n), REFLOW_MS)
    return () => window.clearInterval(timer)
  }, [variant, inView, reducedMotion])

  useGSAP(
    () => {
      if (variant !== 'launch' || !inView) return
      const items = gsap.utils.toArray<HTMLElement>('.wb-check')
      if (!items.length) return

      if (reducedMotion) {
        gsap.set(items, { opacity: 1, x: 0 })
        gsap.set('.wb-check__mark', { scale: 1, opacity: 1 })
        return
      }

      // Resolving one at a time, in the order the checks actually run.
      const tl = gsap.timeline()
      tl.fromTo(
        items,
        { opacity: 0.25, x: -8 },
        { opacity: 1, x: 0, duration: 0.45, stagger: 0.16, ease: 'power2.out' },
      ).fromTo(
        '.wb-check__mark',
        { scale: 0.4, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, stagger: 0.16, ease: 'back.out(2)' },
        0.12,
      )
    },
    { scope: ref, dependencies: [variant, inView, reducedMotion] },
  )

  const data = variant === 'structure' ? workbench.structure : workbench.launch

  return (
    <div className="workbench" ref={ref}>
      <p className="workbench__label">{data.label}</p>

      <div
        className={`workbench__frame${narrow ? ' workbench__frame--narrow' : ''}`}
      >
        {/* A plain bezel, not a drawn browser or phone: the chrome is not
            the artifact and a fake address bar would be decoration. */}
        <div className="workbench__screen">
          {variant === 'structure' ? (
            <ul className="wb-blocks">
              {workbench.structure.blocks.map((block) => (
                <li
                  className={`wb-block wb-block--${block.span}`}
                  key={block.role}
                >
                  <span className="wb-block__role">{block.role}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="wb-checks">
              {workbench.launch.checks.map((check) => (
                <li className="wb-check" key={check}>
                  <span className="wb-check__mark" aria-hidden="true" />
                  <span className="wb-check__label">{check}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {variant === 'structure' && (
        <p className="workbench__width" aria-hidden="true">
          {compact ? narrow ? 'Narrow layout' : 'Wide layout' : narrow ? '390px' : '1440px'}
        </p>
      )}

      <p className="workbench__caption">
        {compact
          ? variant === 'structure'
            ? 'An interface layout demonstration. Your own system takes shape in a working preview you can review.'
            : 'Review areas for the agreed build, including website checks where relevant. An illustration of the process, not a live test report.'
          : data.caption}
      </p>
    </div>
  )
}
