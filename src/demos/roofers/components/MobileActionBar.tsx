import { useEffect, useState } from 'react'
import type { LeadContext } from '../lead'
import { money } from '../pricing'
import { brand } from '../brand'
import { pageHref } from '../routes'
import './MobileActionBar.css'

/** Phones keep the live estimate in reach; guide pages retain their call shortcuts.
 * Hide the bar while the inspection form is in view so it never covers its fields. */
export function MobileActionBar({ ballpark = null, estimator = false }: { ballpark?: LeadContext['ballpark']; estimator?: boolean }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const hero = (estimator ? document.getElementById('estimator') : null) ?? document.getElementById('process') ?? document.querySelector('main .rf-section__head')
    const form = document.getElementById('estimate') ?? document.querySelector('.rf-next')
    if (!hero) return
    const update = () => {
      const heroBox = hero.getBoundingClientRect()
      const formBox = form?.getBoundingClientRect()
      const reachedTool = estimator ? heroBox.top < window.innerHeight : heroBox.bottom <= 0
      const formInView = formBox && formBox.top < window.innerHeight && formBox.bottom > 0
      setVisible(Boolean(reachedTool && !formInView))
    }
    const observer = new IntersectionObserver(update)
    observer.observe(hero)
    if (form) observer.observe(form)
    // Step changes resize the page without necessarily crossing an intersection threshold.
    const resize = new ResizeObserver(update)
    resize.observe(document.querySelector('main') ?? hero)
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    update()
    return () => {
      observer.disconnect()
      resize.disconnect()
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [estimator])

  return (
    <div className={`rf-mobile-bar${estimator ? ' rf-mobile-bar--estimate' : ''}${visible ? ' is-visible' : ''}`} aria-hidden={!visible} inert={!visible}>
      {estimator ? <>
        <div className="rf-mobile-bar__price" role="status" aria-live="polite" aria-atomic="true">
          <span>{ballpark ? 'Estimated range' : 'Your roof estimate'}</span>
          <strong>{ballpark ? `${money(ballpark.low)}–${money(ballpark.high)}` : 'Start with your house'}</strong>
          <small>{ballpark ? 'Planning estimate · inspection confirms price' : 'Find your roof to see your price'}</small>
        </div>
        <a href={ballpark ? '#estimate' : '#estimator'} className="rf-mobile-bar__primary" onClick={() => {
          if (!ballpark) return
          requestAnimationFrame(() => {
            const heading = document.getElementById('rf-lead-step-title')
            heading?.focus({ preventScroll: true })
            const target = document.querySelector('.rf-estimate__attachment') ?? heading
            target?.scrollIntoView({ block: 'start', behavior: 'instant' })
          })
        }}>{ballpark ? 'Request inspection' : 'Find my roof'}</a>
      </> : <><a href={brand.phoneHref} tabIndex={visible ? undefined : -1}>
        Call
      </a>
      <a href={pageHref('home', 'estimate')} className="rf-mobile-bar__primary" tabIndex={visible ? undefined : -1}>
        Get my estimate
      </a></>}
    </div>
  )
}
