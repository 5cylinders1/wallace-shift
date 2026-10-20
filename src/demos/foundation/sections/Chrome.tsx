import { useEffect, useRef, useState } from 'react'
import { business } from '../content'
import { galleryPath, href, onLink } from '../routes'

export function Mark() {
  return <svg className="dt-mark" viewBox="0 0 32 32" aria-hidden="true">
    <path d="M5 11h22" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M10.5 15.5h11L16 24z" fill="var(--dt-water)" />
  </svg>
}

const links = [
  { label: 'How it moves', to: () => href.home('#year') },
  { label: 'Crack decoder', to: () => href.cracks() },
  { label: 'Repairs', to: () => href.home('#repairs') },
  { label: 'Water', to: () => href.home('#storm') },
  { label: 'Sample report', to: () => href.report() },
]

export function Header({ solid = false }: { solid?: boolean }) {
  const [scrolled, setScrolled] = useState(() => typeof window !== 'undefined' && window.scrollY > 24)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24)
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

  return <header className={`dt-header ${scrolled || solid ? 'is-solid' : ''}`}>
    <div className="dt-wrap dt-header-inner">
      <a className="dt-brand" href={href.home()} onClick={go} aria-label={`${business.full}, home`}>
        <Mark />
        <span className="dt-brand-name">Datum</span>
        <span className="dt-brand-trade">Foundation &amp; Waterproofing</span>
      </a>
      <nav className="dt-nav" aria-label="Main">
        {links.map(link => <a key={link.label} href={link.to()} onClick={go}>{link.label}</a>)}
      </nav>
      <div className="dt-header-actions">
        <a className="dt-phone" href={business.phoneHref}>{business.phone}</a>
        <a className="dt-button dt-button-ink dt-button-small" href={href.home('#request')} onClick={go}>Book an inspection</a>
        <button ref={buttonRef} type="button" className="dt-menu-button" aria-expanded={open} aria-controls="dt-menu" onClick={() => setOpen(value => !value)}>
          <span className="dt-visually-hidden">{open ? 'Close menu' : 'Open menu'}</span>
          <span aria-hidden="true" className={`dt-burger ${open ? 'is-open' : ''}`}><i /><i /></span>
        </button>
      </div>
    </div>
    <div id="dt-menu" ref={menuRef} className={`dt-menu ${open ? 'is-open' : ''}`} hidden={!open}>
      <nav aria-label="Menu">
        {links.map(link => <a key={link.label} href={link.to()} onClick={go}>{link.label}</a>)}
        <a href={href.log()} onClick={go}>Crack log</a>
      </nav>
      <a className="dt-button dt-button-ink" href={href.home('#request')} onClick={go}>Book an inspection</a>
      <a className="dt-menu-phone" href={business.phoneHref}>{business.phone}</a>
    </div>
  </header>
}

export function Footer() {
  return <footer className="dt-footer">
    <div className="dt-wrap dt-footer-grid">
      <div>
        <a className="dt-brand dt-brand-light" href={href.home()} onClick={onLink}><Mark /><span className="dt-brand-name">Datum</span><span className="dt-brand-trade">Foundation &amp; Waterproofing</span></a>
        <p className="dt-footer-line">Measured first. Least invasive fix that deals with the cause.</p>
      </div>
      <nav aria-label="Footer" className="dt-footer-links">
        <a href={href.cracks()} onClick={onLink}>Crack decoder</a>
        <a href={href.log()} onClick={onLink}>Crack log</a>
        <a href={href.report()} onClick={onLink}>Sample report</a>
        <a href={href.home('#repairs')} onClick={onLink}>Repairs</a>
        <a href={href.home('#request')} onClick={onLink}>Book an inspection</a>
      </nav>
      <div className="dt-footer-contact">
        <a href={business.phoneHref}>{business.phone}</a>
        <a href={`mailto:${business.email}`}>{business.email}</a>
        <p>{business.area}</p>
      </div>
    </div>
    <div className="dt-wrap dt-footer-base">
      <p>Datum Foundation &amp; Waterproofing is a fictional company. Phone numbers and email are placeholders. Planning prices are illustrative.</p>
      <a href={galleryPath}>A website concept by Wallace Shift →</a>
    </div>
  </footer>
}
