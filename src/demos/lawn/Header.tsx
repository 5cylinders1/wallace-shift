import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { business } from './content'

const NAV = [
  { href: '#estimate', label: 'Instant price' },
  { href: '#services', label: 'Services' },
  { href: '#about', label: 'About Ben' },
  { href: '#faq', label: 'FAQ' },
]

export function Wordmark() {
  return (
    <span className="tw-wordmark">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="currentColor" className="tw-wordmark-tile" />
        <path d="M-8 64 30 0h12L4 64Zm24 0L54 0h12L28 64Z" className="tw-wordmark-stripe" />
      </svg>
      <span className="tw-wordmark-text">Trawsome<small>Lawn Care</small></span>
    </span>
  )
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
    document.body.classList.add('tw-menu-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('tw-menu-open')
    }
  }, [open])

  return (
    <header className={`tw-header${scrolled || open ? ' is-solid' : ''}`}>
      <a className="tw-skip" href="#main">Skip to content</a>
      <div className="tw-header-inner">
        <a href="#top" className="tw-header-brand" aria-label={`${business.name}, back to top`}><Wordmark /></a>
        <nav className="tw-nav" aria-label="Primary">
          {NAV.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <div className="tw-header-actions">
          <a className="tw-header-phone" href={business.phoneHref}>{business.phone}</a>
          <a className="tw-button tw-button-lime tw-button-small" href="#estimate">Get my price</a>
          <button
            ref={toggle}
            type="button"
            className="tw-menu-toggle"
            aria-expanded={open}
            aria-controls="tw-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            <span /><span />
          </button>
        </div>
      </div>
      <div id="tw-menu" ref={menu} className="tw-menu" hidden={!open}>
        <nav aria-label="Mobile">
          {NAV.map((item) => <a key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</a>)}
        </nav>
        <div className="tw-menu-contact">
          <a className="tw-button tw-button-lime" href="#estimate" onClick={() => setOpen(false)}>Get my instant price</a>
          <a className="tw-button tw-button-ghost" href={business.phoneHref}>Call {business.phone}</a>
        </div>
      </div>
    </header>
  )
}
