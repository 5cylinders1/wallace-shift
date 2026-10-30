import { useEffect, useId, useRef, useState } from 'react'
import { brand } from '../brand'
import { nav } from '../content'
import { pageHref, type PageId } from '../routes'
import { BrandMark } from './BrandMark'
import './SiteHeader.css'

export function SiteHeader({ page }: { page: PageId }) {
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
        <a className="rf-header__brand" href={pageHref('home')} aria-label={page === 'home' ? `${brand.company}, back to top` : `${brand.company} home`}>
          <BrandMark />
          <span className="rf-header__name">{brand.company}</span>
        </a>

        <nav className="rf-header__nav" aria-label="Sections">
          <ul>
            {nav.map((item) => (
              <li key={item.label}>
                <a href={pageHref(item.page, item.section)} aria-current={!item.section && item.page === page ? 'page' : undefined}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="rf-header__actions">
          <a className="rf-header__phone" href={brand.phoneHref}>
            <span className="rf-visually-hidden">Call </span>
            {brand.phoneDisplay}
          </a>
          <a className="rf-button rf-button--primary rf-header__cta" href={pageHref('home', 'estimate')}>
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
              <li key={item.label}>
                <a
                  href={pageHref(item.page, item.section)}
                  aria-current={!item.section && item.page === page ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="rf-header__panel-actions">
          <a className="rf-button rf-button--primary rf-button--block" href={pageHref('home', 'estimate')} onClick={() => setOpen(false)}>
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
