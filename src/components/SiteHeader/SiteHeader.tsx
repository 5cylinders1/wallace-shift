import { useEffect, useRef, useState } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { siteMeta } from '../../content/siteConfig'
import { navRoutes } from '../../content/routeMeta'
import { useRoutePath } from '../../lib/router'
import { PageLink } from '../PageLink/PageLink'
import './SiteHeader.css'

export function SiteHeader() {
  const path = useRoutePath()
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

    // The toggle is the close button, and it lives in the header bar
    // rather than inside the panel — so it has to be part of the cycle
    // explicitly, or a keyboard user can tab the whole menu without ever
    // reaching the only control that shuts it.
    const focusable = [
      ...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
    ]
    if (toggleRef.current) focusable.push(toggleRef.current)
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

  // A route change always dismisses the menu. Each link's own onClick
  // covers the common case, but browser back/forward would otherwise
  // leave the panel open on top of the incoming page.
  //
  // Adjusted during render rather than in an effect: React re-runs this
  // component before committing, so the menu never paints in the wrong
  // state, and there is no cascading second render.
  const [lastPath, setLastPath] = useState(path)
  if (path !== lastPath) {
    setLastPath(path)
    setMenuOpen(false)
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <header
      ref={headerRef}
      className={`site-header${scrolled ? ' site-header--solid' : ''}`}
    >
      {/* First tab stop on every page: the nav is short, but the pages
          below it are long, so skipping straight to content matters. */}
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      {/* Carries the scrolled state's blur. It cannot live on the header
          itself — see the note in SiteHeader.css. */}
      <div className="site-header__veil" aria-hidden="true" />

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
            {navRoutes.map((route) => (
              <li key={route.path}>
                <PageLink
                  href={route.path}
                  aria-current={path === route.path ? 'page' : undefined}
                >
                  {route.navLabel}
                </PageLink>
              </li>
            ))}
          </ul>
        </nav>

        <PageLink href="/contact" className="site-header__cta">
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
        /* Deliberately not aria-modal: the close control sits outside this
           element, in the header bar, and aria-modal would hide it from
           assistive tech entirely — leaving no announced way out. Escape
           and the focus cycle above both reach it. */
        aria-label="Mobile navigation"
        className={`mobile-menu${menuOpen ? ' mobile-menu--open' : ''}`}
        inert={!menuOpen}
      >
        <nav aria-label="Primary">
          <ul>
            {navRoutes.map((route) => (
              <li key={route.path}>
                <PageLink
                  href={route.path}
                  onClick={closeMenu}
                  aria-current={path === route.path ? 'page' : undefined}
                >
                  {route.navLabel}
                </PageLink>
              </li>
            ))}
          </ul>
        </nav>
        <PageLink
          href="/contact"
          className="mobile-menu__cta"
          onClick={closeMenu}
        >
          Start a project
        </PageLink>
      </div>
    </header>
  )
}
