import { useEffect, useState } from 'react'
import { brand } from '../brand'
import './MobileActionBar.css'

/**
 * Call / estimate shortcuts for phones, shown once the visitor is past the
 * timelapse and hidden again while the estimate form itself is on screen.
 */
export function MobileActionBar() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const hero = document.getElementById('process')
    const form = document.getElementById('estimate')
    if (!hero || !form) return
    const state = { pastHero: false, formInView: false }
    const update = () => setVisible(state.pastHero && !state.formInView)

    const heroObserver = new IntersectionObserver(([entry]) => {
      state.pastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0
      update()
    })
    const formObserver = new IntersectionObserver(
      ([entry]) => {
        state.formInView = entry.isIntersecting
        update()
      },
      { threshold: 0.15 },
    )
    heroObserver.observe(hero)
    formObserver.observe(form)
    return () => {
      heroObserver.disconnect()
      formObserver.disconnect()
    }
  }, [])

  return (
    <div className={`rf-mobile-bar${visible ? ' is-visible' : ''}`} aria-hidden={!visible}>
      <a href={brand.phoneHref} tabIndex={visible ? undefined : -1}>
        Call
      </a>
      <a href="#estimate" className="rf-mobile-bar__primary" tabIndex={visible ? undefined : -1}>
        Get my estimate
      </a>
    </div>
  )
}
