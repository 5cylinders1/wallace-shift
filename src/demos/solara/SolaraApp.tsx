import { useCallback, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import Booking from './Booking'
import { emptyDraft, type Draft, type Step } from './draft'
import Header from './Header'
import Hero from './Hero'
import { CleanColor, Footer, Intro, Reviews, Services, Visit } from './Sections'
import Work from './Work'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export default function SolaraApp() {
  const root = useRef<HTMLDivElement>(null)
  const [draft, setDraftState] = useState<Draft>(emptyDraft)
  const [step, setStep] = useState<Step>(1)
  const setDraft = useCallback((update: (draft: Draft) => Draft) => setDraftState(update), [])

  // A soft entrance for the hero copy, then short reveals down the page.
  // Reduced motion gets the page as it is.
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('[data-hero-rise]', { y: 20, opacity: 0, duration: 1, stagger: 0.09, ease: 'power3.out', delay: 0.15 })
      gsap.set('[data-rise]', { opacity: 0 })
      ScrollTrigger.batch('[data-rise]', {
        start: 'top 90%',
        once: true,
        onEnter: (batch) => gsap.fromTo(batch, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.06, ease: 'power3.out', overwrite: true }),
      })
    })
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
    return () => mm.revert()
  }, { scope: root })

  return (
    <div ref={root} className="sl">
      <Header />
      <main id="main">
        <Hero setDraft={setDraft} setStep={setStep} />
        <Intro />
        <Services setDraft={setDraft} setStep={setStep} />
        <Work />
        <CleanColor />
        <Reviews />
        <Booking draft={draft} setDraft={setDraft} step={step} setStep={setStep} />
        <Visit />
      </main>
      <Footer />
    </div>
  )
}
