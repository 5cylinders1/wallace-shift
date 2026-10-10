import { useEffect, useId, useRef, useState } from 'react'
import { brand } from '../brand'
import { nav, WALLACE_SHIFT_URL } from '../content'
import { BrandMark } from './BrandMark'
import './SiteHeader.css'

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    const toggle = toggleRef.current
    const focusables = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [])
    focusables()[0]?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        toggle?.focus()
        return
      }
      if (event.key !== 'Tab') return
      // Keep focus inside the toggle + panel while the menu is open.
      const items = [toggle, ...focusables()].filter((node): node is HTMLElement => !!node)
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1080px)')
    const close = () => query.matches && setOpen(false)
    query.addEventListener('change', close)
    return () => query.removeEventListener('change', close)
  }, [])

  return (
    <header className={`rf-header${open ? ' is-open' : ''}`}>
      <div className="rf-header__bar">
        <a className="rf-header__brand" href="#top" aria-label={`${brand.company}, back to top`}>
          <BrandMark />
          <span className="rf-header__name">{brand.company}</span>
        </a>
        <a
          className="rf-header__demo"
          href={WALLACE_SHIFT_URL}
          target="_blank"
          rel="noopener"
          title="This is a concept site designed by Wallace Shift"
        >
          <span className="rf-header__demo-short">Demo</span>
          <span className="rf-header__demo-long">Demo by Wallace Shift</span>
        </a>

        <nav className="rf-header__nav" aria-label="Sections">
          <ul>
            {nav.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="rf-header__actions">
          <a className="rf-header__phone" href={brand.phoneHref}>
            <span className="rf-visually-hidden">Call </span>
            {brand.phoneDisplay}
          </a>
          <a className="rf-button rf-button--primary rf-header__cta" href="#estimate">
            Free estimate
          </a>
          <button
            ref={toggleRef}
            type="button"
            className="rf-header__toggle"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="rf-visually-hidden">{open ? 'Close menu' : 'Open menu'}</span>
            <span className="rf-header__toggle-lines" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div ref={panelRef} id={menuId} className="rf-header__panel" hidden={!open}>
        <nav aria-label="Sections">
          <ul>
            {nav.map((item) => (
              <li key={item.href}>
                <a href={item.href} onClick={() => setOpen(false)}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="rf-header__panel-actions">
          <a className="rf-button rf-button--primary rf-button--block" href="#estimate" onClick={() => setOpen(false)}>
            Get my free estimate
          </a>
          <a className="rf-button rf-button--ghost rf-button--block" href={brand.phoneHref}>
            Call {brand.phoneDisplay}
          </a>
        </div>
      </div>
    </header>
  )
}
