import { useEffect, useRef, useState } from 'react'
import { business, nav } from '../content'
import { galleryPath, href, onLink, type Page } from '../routes'

export function Mark({ className = '' }: { className?: string }) {
  return <svg className={`tb-mark ${className}`} viewBox="0 0 28 32" aria-hidden="true">
    <path d="M3 30V8a11 6 0 0 1 22 0v22" fill="none" stroke="currentColor" strokeWidth="1.4" />
    {[7.5, 11.5, 15.5, 19.5].map(x => <path key={x} d={`M${x} 12v18`} stroke="currentColor" strokeWidth="1.4" />)}
  </svg>
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return <a className={`tb-wordmark ${light ? 'is-light' : ''}`} href={href.home()} onClick={onLink} aria-label={`${business.full}, home`}>
    <Mark />
    <span className="tb-wordmark-name">Tambour</span>
    <span className="tb-wordmark-trade">{business.trade}</span>
  </a>
}

export function Header({ page }: { page: Page }) {
  const [scrolled, setScrolled] = useState(() => typeof window !== 'undefined' && window.scrollY > 40)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  useEffect(() => {
    if (!open) return
    const menu = menuRef.current
    const focusable = () => Array.from(menu?.querySelectorAll<HTMLElement>('a, button') ?? [])
    focusable()[0]?.focus()
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); buttonRef.current?.focus() }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', key)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = '' }
  }, [open])

  const go = (event: React.MouseEvent<HTMLAnchorElement>) => { setOpen(false); onLink(event) }
  const current = (name: string) => page.kind === name ? 'page' : undefined

  return <header className={`tb-header ${scrolled ? 'is-scrolled' : ''}`}>
    <div className="tb-wrap tb-header-inner">
      <Wordmark light />
      <nav className="tb-nav" aria-label="Main">
        {nav.map(link => <a key={link.page} href={href.page(link.page)} onClick={go} aria-current={current(link.page)}>{link.label}</a>)}
      </nav>
      <div className="tb-header-actions">
        <a className="tb-header-phone" href={business.phoneHref}>{business.phone}</a>
        <a className="tb-button tb-button-brass tb-button-small" href={href.page('consultation')} onClick={go} aria-current={current('consultation')}>Book a consultation</a>
        <button ref={buttonRef} type="button" className="tb-menu-button" aria-expanded={open} aria-controls="tb-menu" onClick={() => setOpen(value => !value)}>
          <span className="tb-visually-hidden">{open ? 'Close menu' : 'Open menu'}</span>
          <span aria-hidden="true" className={`tb-burger ${open ? 'is-open' : ''}`}><i /><i /></span>
        </button>
      </div>
    </div>
    <div id="tb-menu" ref={menuRef} className={`tb-menu ${open ? 'is-open' : ''}`} hidden={!open}>
      <nav aria-label="Menu">
        <a href={href.home()} onClick={go} aria-current={current('home')}>Home</a>
        {nav.map(link => <a key={link.page} href={href.page(link.page)} onClick={go} aria-current={current(link.page)}>{link.label}</a>)}
      </nav>
      <a className="tb-button tb-button-brass" href={href.page('consultation')} onClick={go}>Book a design consultation</a>
      <a className="tb-menu-phone" href={business.phoneHref}>{business.phone}</a>
    </div>
  </header>
}

export function Footer() {
  return <footer className="tb-footer">
    <div className="tb-wrap tb-footer-grid">
      <div className="tb-footer-brand">
        <Wordmark light />
        <p>Drawn for one room. Built in our workshop. Installed by the people who built it.</p>
      </div>
      <nav aria-label="Footer" className="tb-footer-links">
        <a href={href.page('kitchens')} onClick={onLink}>Kitchens</a>
        <a href={href.page('baths')} onClick={onLink}>Baths</a>
        <a href={href.page('built-ins')} onClick={onLink}>Built-ins</a>
        <a href={href.page('workshop')} onClick={onLink}>Workshop</a>
        <a href={href.page('investment')} onClick={onLink}>Investment</a>
      </nav>
      <div className="tb-footer-contact">
        <p className="tb-label">{business.hours}</p>
        <a href={business.phoneHref}>{business.phone}</a>
        <a href={`mailto:${business.email}`}>{business.email}</a>
        <p>{business.area}</p>
        <a className="tb-link-arrow" href={href.page('consultation')} onClick={onLink}>Book a design consultation <span aria-hidden="true">→</span></a>
      </div>
    </div>
    <div className="tb-wrap tb-footer-base">
      <p>Tambour is a fictional company created by Wallace Shift to show a website concept. Photographs are licensed stock and real material scans standing in for a cabinetmaker’s own project photography; the build sequence at the top of the home page is generated concept imagery. Phone and email are placeholders, and prices are illustrative. <a href={href.page('photography')} onClick={onLink}>Photography credits</a></p>
      <a href={galleryPath}>A website concept by Wallace Shift <span aria-hidden="true">→</span></a>
    </div>
  </footer>
}
