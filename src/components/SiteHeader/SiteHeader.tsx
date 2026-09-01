import { useEffect, useRef, useState } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { navLinks, siteMeta } from '../../content/siteConfig'
import { PageLink } from '../PageLink/PageLink'
import './SiteHeader.css'

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Publishes the header's real rendered height (which changes with the
  // scrolled/solid state and viewport width) as a CSS variable so other
  // sections can reserve exact clearance beneath it instead of guessing.
  useEffect(() => {
    const header = headerRef.current
    if (!header) return

    const setHeightVar = () => {
      const previous = document.documentElement.style.getPropertyValue(
        '--site-header-height',
      )
      const next = `${header.offsetHeight}px`
      document.documentElement.style.setProperty('--site-header-height', next)
      // A changed header height can shift the layout of pinned sections
      // below it (e.g. the transparent-to-solid scroll transition) — keep
      // their ScrollTrigger start/end positions in sync.
      if (previous && previous !== next) ScrollTrigger.refresh()
    }
    setHeightVar()

    const observer = new ResizeObserver(setHeightVar)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    const panel = menuRef.current
    if (!panel) return

    const focusable = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])',
    )
    focusable[0]?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        toggleRef.current?.focus()
        return
      }

      if (event.key !== 'Tab' || focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header
      ref={headerRef}
      className={`site-header${scrolled ? ' site-header--solid' : ''}`}
    >
      <div className="site-header__inner container">
        <PageLink href="/" className="site-header__brand">
          <img
            src="/brand/wallace-shift-logo-white.svg"
            alt=""
            className="site-header__mark"
            width={22}
            height={13}
          />
          <span>{siteMeta.name.toUpperCase()}</span>
        </PageLink>

        <nav className="site-header__nav" aria-label="Primary">
          <ul>
            {navLinks.map((link) => (
              <li key={link.href}>
                <PageLink href={link.href}>{link.label}</PageLink>
              </li>
            ))}
          </ul>
        </nav>

        <PageLink href="/#contact" className="site-header__cta">
          Start a project
          <span className="site-header__cta-arrow" aria-hidden="true">
            &#8599;
          </span>
        </PageLink>

        <button
          ref={toggleRef}
          type="button"
          className="site-header__menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="visually-hidden">
            {menuOpen ? 'Close menu' : 'Open menu'}
          </span>
          <span
            className={`site-header__burger${menuOpen ? ' site-header__burger--open' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      <div
        id="mobile-menu"
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className={`mobile-menu${menuOpen ? ' mobile-menu--open' : ''}`}
        inert={!menuOpen}
      >
        <nav aria-label="Primary">
          <ul>
            {navLinks.map((link) => (
              <li key={link.href}>
                <PageLink href={link.href} onClick={closeMenu}>
                  {link.label}
                </PageLink>
              </li>
            ))}
          </ul>
        </nav>
        <PageLink
          href="/#contact"
          className="mobile-menu__cta"
          onClick={closeMenu}
        >
          Start a project
        </PageLink>
      </div>
    </header>
  )
}
