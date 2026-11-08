import { useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Header from './Header'
import Hero from './Hero'
import Doors from './Doors'
import Catalog from './Catalog'
import Guide from './Guide'
import Story from './Story'
import Studio from './Studio'
import Credits from './Credits'
import Footer, { StationId } from './Footer'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export default function OtvApp() {
  const root = useRef<HTMLDivElement>(null)

  // Section reveals and the credits roll. Reduced motion gets the page as-is.
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.set('[data-rise]', { opacity: 0 })
      ScrollTrigger.batch('[data-rise]', {
        start: 'top 88%',
        once: true,
        onEnter: (batch) => gsap.fromTo(batch, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.07, ease: 'power3.out', overwrite: true }),
      })

      // End credits drift upward a little faster than the page, like a roll.
      gsap.fromTo('[data-roll]', { y: 80 }, {
        y: -40,
        ease: 'none',
        scrollTrigger: { trigger: '.otv-credits', start: 'top bottom', end: 'bottom top', scrub: true },
      })
    })
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
    return () => mm.revert()
  }, { scope: root })

  return (
    <div ref={root} className="otv">
      <Header />
      <main id="main">
        <Hero />
        <Doors />
        <Catalog />
        <Guide />
        <Story />
        <Studio />
        <Credits />
        <StationId />
      </main>
      <Footer />
    </div>
  )
}
