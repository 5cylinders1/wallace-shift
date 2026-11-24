import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { business } from './content'

const NAV = [
  { href: '#services', label: 'Services' },
  { href: '#work', label: 'Our work' },
  { href: '#about', label: 'About' },
  { href: '#reviews', label: 'Reviews' },
]

/** The business's own logo (white version, from its website); decorative where a link already names it. */
export function Wordmark({ decorative = false }: { decorative?: boolean }) {
  return <img className="ll-wordmark" src="/demos/lawn/logo-white.png" alt={decorative ? '' : business.name} width={525} height={129} />
}

const subscribeScroll = (onChange: () => void) => {
  window.addEventListener('scroll', onChange, { passive: true })
  return () => window.removeEventListener('scroll', onChange)
}

export default function Header() {
  const scrolled = useSyncExternalStore(subscribeScroll, () => window.scrollY > 24, () => false)
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
    document.body.classList.add('ll-menu-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('ll-menu-open')
    }
  }, [open])

  return (
    <header className={`ll-header${scrolled || open ? ' is-solid' : ''}`}>
      <a className="ll-skip" href="#main">Skip to content</a>
      <div className="ll-header-inner">
        <a href="#top" className="ll-header-brand" aria-label={`${business.name}, back to top`}><Wordmark decorative /></a>
        <nav className="ll-nav" aria-label="Primary">
          {NAV.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <div className="ll-header-actions">
          <a className="ll-header-phone" href={business.phoneHref}>{business.phone}</a>
          <a className="ll-button ll-button-green ll-button-small" href="#plan">Free consultation</a>
          <button
            ref={toggle}
            type="button"
            className="ll-menu-toggle"
            aria-expanded={open}
            aria-controls="ll-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            <span /><span />
          </button>
        </div>
      </div>
      <div id="ll-menu" ref={menu} className="ll-menu" hidden={!open}>
        <nav aria-label="Mobile">
          {NAV.map((item) => <a key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</a>)}
        </nav>
        <div className="ll-menu-contact">
          <a className="ll-button ll-button-green" href="#plan" onClick={() => setOpen(false)}>Plan my project</a>
          <a className="ll-button ll-button-ghost" href={business.phoneHref}>Call {business.phone}</a>
        </div>
      </div>
    </header>
  )
}
