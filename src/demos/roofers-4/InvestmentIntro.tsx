import { useEffect, useRef } from 'react'
import { pillars } from './content'
import RoofSystem from './RoofSystem'
import './investment-motion.css'

export default function InvestmentIntro() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = root.current
    if (!section) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let observer: IntersectionObserver | undefined
    const animations: Animation[] = []
    const reset = () => {
      observer?.disconnect()
      animations.splice(0).forEach(animation => animation.cancel())
      section.querySelectorAll<HTMLElement>('[data-intro-item]').forEach(item => item.style.removeProperty('opacity'))
    }
    const setup = () => {
      reset()
      if (preference.matches) return
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const items = entry.target.querySelectorAll<HTMLElement>('[data-intro-item]')
          items.forEach((item, index) => {
            const card = item.classList.contains('hr-pillar')
            item.style.removeProperty('opacity')
            animations.push(item.animate([
              { opacity: 0, transform: `translateY(${card ? 34 : 22}px) scale(${card ? .965 : 1})`, offset: 0 },
              { opacity: 1, transform: `translateY(0) scale(${card ? 1.008 : 1})`, offset: .78 },
              { opacity: 1, transform: 'translateY(0) scale(1)', offset: 1 },
            ], { duration: card ? 780 : 700, delay: index * (card ? 170 : 100), easing: 'cubic-bezier(.22,.7,.2,1)', fill: 'backwards' }))
          })
          observer?.unobserve(entry.target)
        }
      }, { rootMargin: '0px 0px -10% 0px', threshold: .08 })
      section.querySelectorAll<HTMLElement>('[data-intro-group]').forEach(group => {
        // Content above a direct anchor remains visible; only upcoming groups enter.
        if (group.getBoundingClientRect().bottom <= 0) return
        group.querySelectorAll<HTMLElement>('[data-intro-item]').forEach(item => { item.style.opacity = '0' })
        observer?.observe(group)
      })
    }
    setup()
    preference.addEventListener('change', setup)
    return () => { reset(); preference.removeEventListener('change', setup) }
  }, [])

  return <section ref={root} className="hr-investment" id="investment">
    <div className="hr-wrap">
      <div className="hr-section-head" data-intro-group>
        <p className="hr-kicker" data-intro-item><span /> The architectural investment</p>
        <h2 data-intro-item>A roof is the one renovation your home wears on the outside, for the rest of its life.</h2>
        <p className="hr-lede" data-intro-item>Kitchens date. Finishes change. The roof is the surface that decides how the whole house reads from the street, from the air and in every appraisal, and it is the system that protects everything underneath. For a custom home, it deserves the same attention as the facade it crowns.</p>
      </div>
      <div className="hr-pillars hr-pillars-motion" data-intro-group>
        {pillars.map((pillar, i) => <article key={pillar.kicker} className="hr-pillar" data-intro-item>
          <span className="hr-pillar-index">0{i + 1}</span>
          <p className="hr-pillar-kicker">{pillar.kicker}</p>
          <h3>{pillar.title}</h3>
          <p>{pillar.text}</p>
        </article>)}
      </div>
      <RoofSystem />
    </div>
  </section>
}
