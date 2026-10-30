import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { business } from './content'

const NAV = [
  { href: '#services', label: 'Services' },
  { href: '#studio', label: 'Color studio' },
  { href: '#process', label: 'Process' },
  { href: '#about', label: 'About' },
]

/** A fan-deck chip: the house's three colors, one strip each. */
export function Wordmark() {
  return (
    <span className="cp-wordmark">
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <rect x="6" y="2" width="28" height="36" rx="5" className="cp-chip-card" />
        <rect x="10" y="6" width="20" height="9" rx="1.5" className="cp-chip-a" />
        <rect x="10" y="17" width="20" height="9" rx="1.5" className="cp-chip-b" />
        <rect x="10" y="28" width="20" height="6" rx="1.5" className="cp-chip-c" />
      </svg>
      <span className="cp-wordmark-text">Complete<small>Painting LLC</small></span>
    </span>
  )
}

const subscribeScroll = (onChange: () => void) => {
  window.addEventListener('scroll', onChange, { passive: true })
  window.addEventListener('resize', onChange)
  return () => {
    window.removeEventListener('scroll', onChange)
    window.removeEventListener('resize', onChange)
  }
}

/** True while the hero's photo is behind the header: until the next section's sheet slides up under it. */
const overHero = () => {
  const sheet = document.querySelector('.cp-sheet')
  return sheet ? sheet.getBoundingClientRect().top > 72 : false
}

export default function Header() {
  const dark = useSyncExternalStore(subscribeScroll, overHero, () => true)
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)

  // Escape closes the menu and returns focus; Tab stays inside it while open.
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
    document.addEventListener('keydown', onKey)
    document.body.classList.add('cp-menu-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('cp-menu-open')
    }
  }, [open])

  return (
    <header className={`cp-header${open || !dark ? ' is-solid' : ' is-over'}`}>
      <a className="cp-skip" href="#main">Skip to content</a>
      <div className="cp-header-inner">
        <a href="#top" className="cp-header-brand" aria-label={`${business.name}, back to top`}><Wordmark /></a>
        <nav className="cp-nav" aria-label="Primary">
          {NAV.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <div className="cp-header-actions">
          <a className="cp-header-phone" href={business.phoneHref}>{business.phone}</a>
          <a className="cp-button cp-button-ochre cp-button-small" href="#estimate">Request an estimate</a>
          <button
            ref={toggle}
            type="button"
            className="cp-menu-toggle"
            aria-expanded={open}
            aria-controls="cp-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            <span /><span />
          </button>
        </div>
      </div>
      <div id="cp-menu" ref={menu} className="cp-menu" hidden={!open}>
        <nav aria-label="Mobile">
          {NAV.map((item) => <a key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</a>)}
        </nav>
        <div className="cp-menu-contact">
          <a className="cp-button cp-button-ochre" href="#estimate" onClick={() => setOpen(false)}>Request an estimate</a>
          <a className="cp-button cp-button-line" href={business.phoneHref}>Call {business.phone}</a>
        </div>
      </div>
    </header>
  )
}
