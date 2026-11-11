import { useCallback, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Booking from './Booking'
import Header from './Header'
import { Explorer, Hero, Journey } from './Immersive'
import { Care, Doctor, Footer, Reviews, Visit } from './Sections'
import StageProvider from './StageProvider'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export default function DoppsApp() {
  const root = useRef<HTMLDivElement>(null)
  const immersive = useRef<HTMLDivElement>(null)
  const [reason, setReason] = useState('')

  const bookFor = useCallback((label: string) => {
    setReason(label)
    window.requestAnimationFrame(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      document.getElementById('book')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    })
  }, [])

  // Copy rises in as it arrives; the 3D layer does its own easing. Reduced motion skips both.
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.dp-hero [data-rise]', { y: 22, opacity: 0, duration: 1, stagger: 0.08, ease: 'power3.out', delay: 0.1 })
      gsap.set('main [data-rise]:not(.dp-hero [data-rise])', { opacity: 0 })
      ScrollTrigger.batch('main [data-rise]:not(.dp-hero [data-rise])', {
        start: 'top 88%',
        once: true,
        onEnter: (batch) => gsap.fromTo(batch, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.07, ease: 'power3.out', overwrite: true }),
      })
    })
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
    return () => mm.revert()
  }, { scope: root })

  return (
    <div ref={root} className="dp">
      <StageProvider scope={immersive}>
        <Header />
        <main id="main">
          <div ref={immersive} id="immersive" className="dp-immersive">
            <Hero />
            <Journey />
            <Explorer onBook={bookFor} />
          </div>
          <div className="dp-solid">
            <Care />
            <Doctor />
            <Reviews />
            <Booking reason={reason} setReason={setReason} />
            <Visit />
          </div>
        </main>
        <Footer />
      </StageProvider>
    </div>
  )
}
