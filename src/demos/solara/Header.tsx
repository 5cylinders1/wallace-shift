import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { nav, salon } from './content'

const subscribe = (onChange: () => void) => {
  window.addEventListener('scroll', onChange, { passive: true })
  window.addEventListener('resize', onChange)
  return () => {
    window.removeEventListener('scroll', onChange)
    window.removeEventListener('resize', onChange)
  }
}

/** Solid once the hero copy has scrolled under the bar. */
const pastHero = () => window.scrollY > Math.min(window.innerHeight * 0.6, 520)

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`sl-wordmark ${className}`}>
      <span className="sl-wordmark-so">So</span><span className="sl-wordmark-lara">Lara</span>
      <span className="sl-wordmark-salon">Salon</span>
    </span>
  )
}

export default function Header() {
  const solid = useSyncExternalStore(subscribe, pastHero, () => false)
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)

  // Escape closes and returns focus; Tab stays inside the open menu.
  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLElement>('a')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        toggle.current?.focus()
      } else if (event.key === 'Tab' && menu.current) {
        const items = [toggle.current, ...menu.current.querySelectorAll<HTMLElement>('a')].filter(Boolean) as HTMLElement[]
        const index = items.indexOf(document.activeElement as HTMLElement)
        if (event.shiftKey && index <= 0) {
          event.preventDefault()
          items[items.length - 1].focus()
        } else if (!event.shiftKey && index === items.length - 1) {
          event.preventDefault()
          items[0].focus()
        }
      }
    }
    const onResize = () => { if (window.innerWidth >= 960) setOpen(false) }
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    document.body.classList.add('sl-menu-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
      document.body.classList.remove('sl-menu-open')
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <header className={`sl-header${solid || open ? ' is-solid' : ''}${open ? ' is-open' : ''}`}>
      <a className="sl-skip" href="#main">Skip to content</a>
      <div className="sl-wrap sl-header-inner">
        <a href="#top" className="sl-brand" aria-label={`${salon.name}, back to top`}><Wordmark /></a>
        <nav className="sl-nav" aria-label="Primary">
          {nav.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <div className="sl-header-actions">
          <a className="sl-header-phone" href={salon.phoneHref}>{salon.phone}</a>
          <a className="sl-btn sl-btn--sm sl-btn--header" href="#book">Book</a>
          <button
            ref={toggle}
            type="button"
            className="sl-menu-toggle"
            aria-expanded={open}
            aria-controls="sl-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="sl-menu-bars" aria-hidden="true"><i /><i /></span>
            <span className="sl-visually-hidden">{open ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </div>
      <div id="sl-menu" ref={menu} className="sl-menu" hidden={!open}>
        <nav aria-label="Menu">
          {nav.map((item) => <a key={item.href} href={item.href} onClick={close}>{item.label}</a>)}
          <a href="#book" onClick={close}>Book a visit</a>
          <a href="#ask" onClick={close}>Ask a question</a>
          <a href={salon.phoneHref} onClick={close} className="sl-menu-phone">Call {salon.phone}</a>
        </nav>
      </div>
    </header>
  )
}
