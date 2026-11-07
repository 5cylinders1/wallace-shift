import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { MEDIA, links, nav, org } from './content'

const subscribeScroll = (onChange: () => void) => {
  window.addEventListener('scroll', onChange, { passive: true })
  window.addEventListener('resize', onChange)
  return () => {
    window.removeEventListener('scroll', onChange)
    window.removeEventListener('resize', onChange)
  }
}

/** Solid once the hero has mostly scrolled away. */
const pastHero = () => {
  const hero = document.getElementById('top')
  return hero ? hero.getBoundingClientRect().bottom < 96 : window.scrollY > 200
}

/** The seven bars of a broadcast test card: OTV's color system, in one thin line. */
export function SignalStrip({ className = '' }: { className?: string }) {
  return (
    <span className={`otv-strip ${className}`} aria-hidden="true">
      {['white', 'yellow', 'cyan', 'green', 'magenta', 'red', 'blue'].map((bar) => <i key={bar} data-bar={bar} />)}
    </span>
  )
}

export function Logo({ className = '' }: { className?: string }) {
  return <img className={`otv-logo ${className}`} src={`${MEDIA}/otv-logo.webp`} alt={org.name} width="900" height="337" decoding="async" />
}

export default function Header() {
  const solid = useSyncExternalStore(subscribeScroll, pastHero, () => false)
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
    document.body.classList.add('otv-menu-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('otv-menu-open')
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <header className={`otv-header${solid || open ? ' is-solid' : ''}${open ? ' is-open' : ''}`}>
      <a className="otv-skip" href="#main">Skip to content</a>
      <SignalStrip />
      <div className="otv-header-inner">
        <a href="#top" className="otv-brand" aria-label={`${org.name}, back to top`}><Logo /></a>
        <nav className="otv-nav" aria-label="Primary">
          {nav.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <div className="otv-header-actions">
          <a className="otv-btn otv-btn--ghost otv-btn--sm" href={links.donate}>Donate</a>
          <a className="otv-btn otv-btn--sm" href={links.watch}>Start watching</a>
        </div>
        <button
          ref={toggle}
          type="button"
          className="otv-menu-toggle"
          aria-expanded={open}
          aria-controls="otv-menu"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="otv-sr">{open ? 'Close menu' : 'Open menu'}</span>
          <span className="otv-menu-icon" aria-hidden="true"><i /><i /></span>
        </button>
      </div>
      <div id="otv-menu" ref={menu} className={`otv-menu${open ? ' is-open' : ''}`} hidden={!open}>
        <nav aria-label="Mobile">
          {nav.map((item, i) => (
            <a key={item.href} href={item.href} onClick={close}>
              <span className="otv-menu-ch" aria-hidden="true">CH 0{i + 1}</span>{item.label}
            </a>
          ))}
        </nav>
        <div className="otv-menu-actions">
          <a className="otv-btn" href={links.watch} onClick={close}>Start watching</a>
          <a className="otv-btn otv-btn--ghost" href={links.donate} onClick={close}>Donate</a>
        </div>
      </div>
    </header>
  )
}
