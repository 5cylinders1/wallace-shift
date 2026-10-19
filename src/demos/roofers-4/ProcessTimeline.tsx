import { useEffect, useRef } from 'react'
import { steps } from './content'
import './process-motion.css'

export default function ProcessTimeline() {
  const list = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const timeline = list.current
    if (!timeline) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const cards = [...timeline.querySelectorAll<HTMLLIElement>('li')]
    const animations: Animation[] = []
    let observer: IntersectionObserver | undefined

    const reset = () => {
      observer?.disconnect()
      animations.splice(0).forEach(animation => animation.cancel())
      cards.forEach(card => card.style.removeProperty('opacity'))
    }
    const setup = () => {
      reset()
      if (preference.matches) return
      observer = new IntersectionObserver(entries => {
        // Choreograph the visible row in document order. On stacked layouts,
        // later steps wait for their own entrance instead of playing offscreen.
        const entering = entries.filter(entry => entry.isIntersecting)
          .sort((a, b) => cards.indexOf(a.target as HTMLLIElement) - cards.indexOf(b.target as HTMLLIElement))
        entering.forEach((entry, index) => {
          const card = entry.target as HTMLLIElement
          const delay = index * 175
          card.style.removeProperty('opacity')
          animations.push(card.animate([
            { opacity: 0, transform: 'translateY(42px)' },
            { opacity: 1, transform: 'translateY(-4px)', offset: .72 },
            { opacity: 1, transform: 'translateY(0)' },
          ], { duration: 960, delay, easing: 'cubic-bezier(.22,.68,.18,1)', fill: 'backwards' }))

          const rule = card.querySelector('.hr-process-rule')
          if (rule) animations.push(rule.animate([
            { transform: 'scaleX(0)', backgroundColor: '#80b2a1' },
            { transform: 'scaleX(1)', backgroundColor: '#151d21' },
          ], { duration: 780, delay, easing: 'cubic-bezier(.22,.7,.2,1)', fill: 'backwards' }))

          card.querySelectorAll<HTMLElement>('[data-process-detail]').forEach((detail, part) => {
            animations.push(detail.animate([
              { opacity: 0, transform: `translateY(${18 - part * 4}px)` },
              { opacity: 1, transform: 'translateY(0)' },
            ], { duration: 660, delay: delay + 80 + part * 90, easing: 'cubic-bezier(.22,.7,.2,1)', fill: 'backwards' }))
          })
          observer?.unobserve(card)
        })
      }, { threshold: .15, rootMargin: '0px 0px -10% 0px' })
      cards.forEach(card => {
        if (card.getBoundingClientRect().bottom <= 0) return
        card.style.opacity = '0'
        observer?.observe(card)
      })
    }
    setup()
    preference.addEventListener('change', setup)
    return () => { reset(); preference.removeEventListener('change', setup) }
  }, [])

  return <section className="hr-process hr-process-wave" id="process">
    <div className="hr-wrap">
      <div className="hr-section-head">
        <p className="hr-kicker"><span /> The Halcyon process</p>
        <h2>Five steps, one dedicated crew, no surprises.</h2>
      </div>
      <ol ref={list} className="hr-steps">
        {steps.map(step => <li key={step.n}>
          <i className="hr-process-rule" aria-hidden="true" />
          <span data-process-detail>{step.n}</span>
          <h3 data-process-detail>{step.title}</h3>
          <p data-process-detail>{step.text}</p>
        </li>)}
      </ol>
    </div>
  </section>
}
