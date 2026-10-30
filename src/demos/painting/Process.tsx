import { useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { process } from './content'
import { clamp, roomyMotion, stepped } from './motion'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const PER_STOP = 0.75
const GAP = 44
const narrowMotion = '(prefers-reduced-motion: no-preference) and (max-width: 899px), (prefers-reduced-motion: no-preference) and (max-height: 599px)'

/**
 * The repaint's steps on the inside of a curved wall. On wide screens the
 * section pins and the view pans along the wall one step at a time, the way
 * you'd turn to look around a room. Narrower screens list the steps and tilt
 * each into place; reduced motion gets the plain list.
 */
export default function Process() {
  const root = useRef<HTMLElement>(null)

  useGSAP(() => {
    const section = root.current
    if (!section) return
    const media = gsap.matchMedia()

    media.add(roomyMotion, () => {
      const world = section.querySelector<HTMLElement>('.cp-ring-world')
      const cards = gsap.utils.toArray<HTMLElement>('.cp-steps > li', section)
      if (!world || !cards.length) return
      section.classList.add('is-ring')
      // `enter` swings the wall round as the section arrives; `progress` pans along it while pinned.
      const view = { enter: -1.4, progress: 0 }

      const place = () => {
        const width = cards[0].offsetWidth
        const radius = Math.max(900, width * 2.9)
        const step = (width + GAP) / radius
        const at = view.enter + stepped(view.progress, cards.length, 0.65)
        world.style.transform = `translateZ(${radius.toFixed(1)}px) rotateY(${(at * step).toFixed(4)}rad)`
        cards.forEach((card, index) => {
          const off = Math.abs(index - at)
          card.style.transform = `rotateY(${(-index * step).toFixed(4)}rad) translateZ(${(-radius).toFixed(1)}px)`
          const opacity = clamp(1 - (off - 0.6) * 0.45)
          card.style.opacity = opacity.toFixed(3)
          card.style.visibility = opacity <= 0.001 ? 'hidden' : ''
          card.classList.toggle('is-front', off < 0.5)
        })
      }

      gsap.to(view, { enter: 0, ease: 'none', onUpdate: place, scrollTrigger: { trigger: section, start: 'top bottom', end: 'top top', scrub: 0.6 } })
      const tween = gsap.to(view, { progress: 1, ease: 'none', onUpdate: place })
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: () => `+=${(cards.length - 1) * PER_STOP * window.innerHeight}`,
        pin: true,
        scrub: 0.8,
        animation: tween,
        invalidateOnRefresh: true,
        onRefresh: place,
      })
      place()

      return () => {
        section.classList.remove('is-ring')
        world.style.removeProperty('transform')
        cards.forEach((card) => {
          card.style.removeProperty('transform')
          card.style.removeProperty('opacity')
          card.style.removeProperty('visibility')
          card.classList.remove('is-front')
        })
      }
    })

    media.add(narrowMotion, () => {
      gsap.utils.toArray<HTMLElement>('.cp-steps > li', section).forEach((card) => {
        gsap.fromTo(card,
          { autoAlpha: 0, rotationY: -28, z: -160, x: 40, transformPerspective: 900, transformOrigin: '0% 50%' },
          { autoAlpha: 1, rotationY: 0, z: 0, x: 0, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'top 70%', scrub: 0.5 } })
      })
    })

    return () => media.revert()
  }, { scope: root })

  return (
    <section ref={root} id="process" className="cp-process" aria-labelledby="cp-process-title">
      <div className="cp-process-inner">
        <div className="cp-section-head">
          <p className="cp-eyebrow" data-near>Process</p>
          <h2 id="cp-process-title" data-near>What a full repaint <em>involves.</em></h2>
          <p data-near>The same steps you watched at the top of the page, in order.</p>
        </div>
        <div className="cp-ring">
          <div className="cp-ring-world">
            <ol className="cp-steps">
              {process.map((step, index) => (
                <li key={step.title}>
                  <span className="cp-step-index">0{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
