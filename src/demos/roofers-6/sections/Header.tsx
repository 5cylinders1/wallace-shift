import { useEffect, useRef, useState } from 'react'
import { brand, nav } from '../content'

export function Mark({ className = '' }: { className?: string }) {
  return <svg className={`st-mark ${className}`} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <path d="M6 18 20 7l14 11" stroke="var(--st-copper)" strokeWidth="3.2" />
    <path d="M6 26 20 15l14 11" stroke="currentColor" strokeWidth="3.2" />
    <path d="M6 34 20 23l14 11" stroke="currentColor" strokeWidth="3.2" opacity=".45" />
  </svg>
}

export function Wordmark() {
  return <a className="st-brand" href="#top" aria-label={`${brand.full}, back to top`}>
    <Mark />
    <span className="st-brand-name">STRATUM<span>Roofing Co.</span></span>
  </a>
}

export default function Header() {
  const [open, setOpen] = useState(false)
  const [solid, setSolid] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => setSolid(window.scrollY > 40)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.querySelector<HTMLElement>('a')?.focus()
    const trigger = button.current
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); return }
      if (event.key !== 'Tab' || !panel.current) return
      const items = [...panel.current.querySelectorAll<HTMLElement>('a, button'), ...(trigger ? [trigger] : [])]
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', key)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', key)
      trigger?.focus({ preventScroll: true })
    }
  }, [open])

  const close = () => setOpen(false)

  return <>
    <header className={`st-header ${solid || open ? 'is-solid' : ''} ${open ? 'is-open' : ''}`}>
      <div className="st-wrap st-header-inner">
        <Wordmark />
        <nav className="st-nav" aria-label="Primary">
          {nav.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <div className="st-header-actions">
          <a className="st-header-phone" href={brand.phoneHref}>{brand.phone}</a>
          <a className="st-button st-button-copper st-button-small" href="#book">Book an inspection</a>
          <button ref={button} type="button" className="st-menu-button" aria-expanded={open} aria-controls="st-menu" onClick={() => setOpen(value => !value)}>
            <span className="st-menu-lines" aria-hidden="true"><i /><i /></span>
            <span>{open ? 'Close' : 'Menu'}</span>
          </button>
        </div>
      </div>
      <div ref={panel} id="st-menu" className="st-menu" hidden={!open}>
        <nav aria-label="Mobile">
          {nav.map((item, index) => <a key={item.href} href={item.href} onClick={close}><span>{String(index + 1).padStart(2, '0')}</span>{item.label}</a>)}
        </nav>
        <div className="st-menu-foot">
          <a className="st-button st-button-copper" href="#book" onClick={close}>Book a free inspection</a>
          <a className="st-menu-phone" href={brand.phoneHref}>{brand.phone}</a>
        </div>
      </div>
    </header>
  </>
}
