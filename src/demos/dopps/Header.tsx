import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { nav, practice } from './content'

const subscribe = (onChange: () => void) => {
  window.addEventListener('scroll', onChange, { passive: true })
  window.addEventListener('resize', onChange)
  return () => {
    window.removeEventListener('scroll', onChange)
    window.removeEventListener('resize', onChange)
  }
}

/** 'top' over the hero, 'dark' over the rest of the 3D tour, 'light' over the solid sections. */
const mode = () => {
  const immersive = document.getElementById('immersive')
  if (immersive && immersive.getBoundingClientRect().bottom > 70) return window.scrollY < 40 ? 'top' : 'dark'
  return 'light'
}

export function Wordmark() {
  return (
    <span className="dp-wordmark">
      <span className="dp-wordmark-dots" aria-hidden="true">{[0, 1, 2, 3, 4, 5, 6].map((i) => <i key={i} />)}</span>
      <span className="dp-wordmark-name">Dopps</span>
      <span className="dp-wordmark-sub">Chiropractic</span>
    </span>
  )
}

export default function Header() {
  const state = useSyncExternalStore(subscribe, mode, () => 'top')
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)

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
    document.body.classList.add('dp-menu-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
      document.body.classList.remove('dp-menu-open')
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <header className="dp-header" data-mode={open ? 'light' : state}>
      <a className="dp-skip" href="#main">Skip to content</a>
      <div className="dp-wrap dp-header-inner">
        <a href="#top" className="dp-brand" aria-label={`${practice.name}, back to top`}><Wordmark /></a>
        <nav className="dp-nav" aria-label="Primary">
          {nav.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <div className="dp-header-actions">
          <a className="dp-header-phone" href={practice.phoneHref}>{practice.phone}</a>
          <a className="dp-btn dp-btn--primary dp-btn--sm" href="#book">Book</a>
          <button ref={toggle} type="button" className="dp-menu-toggle" aria-expanded={open} aria-controls="dp-menu" onClick={() => setOpen((o) => !o)}>
            <span className="dp-menu-bars" aria-hidden="true"><i /><i /></span>
            <span className="dp-visually-hidden">{open ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </div>
      <div id="dp-menu" ref={menu} className="dp-menu" hidden={!open}>
        <nav aria-label="Menu">
          {nav.map((item) => <a key={item.href} href={item.href} onClick={close}>{item.label}</a>)}
          <a href="#book" onClick={close}>Book a visit</a>
          <a href={practice.phoneHref} onClick={close} className="dp-menu-phone">Call {practice.phone}</a>
        </nav>
      </div>
    </header>
  )
}
