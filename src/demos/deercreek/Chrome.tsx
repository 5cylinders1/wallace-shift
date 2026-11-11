import { useEffect, useRef, useState } from 'react'
import { agency, business, href, pageBySlug, services, type Page } from './content'
import DisplaySettings from './DisplaySettings'
import { ArrowIcon, CalendarIcon, ChatIcon, ChevronIcon, MenuIcon, PhoneIcon } from './Icons'
import OpenStatus from './OpenStatus'

const primaryNav = ['services', 'service-area', 'reviews', 'about', 'faq']

function isCurrent(current: Page, slug: string) {
  if (current.slug === slug) return 'page' as const
  if (slug === 'services' && current.kind === 'service') return 'true' as const
  return undefined
}

export function Brand({ tone = 'ink' }: { tone?: 'ink' | 'white' }) {
  return (
    <a className="dc-brand" href={href()}>
      <img src={`/demos/deercreek/mark-${tone}.png`} alt="" width="54" height="51" />
      <span className="dc-brand-text">
        <span className="dc-brand-name">Deer Creek Plumbing</span>
        <span className="dc-brand-place">Olathe, KS · Since 2017</span>
      </span>
    </a>
  )
}

/** Wallace Shift's layer, above and visually apart from the plumbing brand.
 * It scrolls away with the page, so it never stacks with the fixed Call /
 * Text / Request bar on phones. Like the mobile menu, the panel is visible
 * without JavaScript and becomes a disclosure once the page hydrates. */
export function AgencyBar() {
  const [open, setOpen] = useState(false)
  return (
    <aside className="dc-agency" aria-label={`About this concept by ${agency.name}`}>
      <div className="dc-wrap">
        <div className="dc-agency-row">
          <button type="button" className="dc-agency-toggle" aria-expanded={open} aria-controls="dc-agency-panel" onClick={() => setOpen(value => !value)}>
            <img className="dc-agency-logo" src={agency.logo} alt="" width="28" height="17" />
            <span className="dc-agency-text"><span className="dc-agency-long">A website and booking-flow </span><span className="dc-agency-concept">concept</span> by {agency.name}</span>{' '}
            <span className="dc-agency-more"><span className="dc-agency-more-word">What it shows</span><ChevronIcon /></span>
          </button>
          <a className="dc-agency-cta" href={agency.inquiry}>Discuss my website <ArrowIcon size={16} /></a>
        </div>
        <div id="dc-agency-panel" className="dc-agency-panel" data-open={open}>
          <ul className="dc-agency-list">
            {agency.capabilities.map(item => <li key={item.title}><strong>{item.title}.</strong> {item.text}</li>)}
          </ul>
          <p className="dc-agency-note">A working preview: requests entered on this site are not sent to Deer Creek.</p>
        </div>
      </div>
    </aside>
  )
}

export function SiteHeader({ current }: { current: Page }) {
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  const nav = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    nav.current?.querySelector<HTMLAnchorElement>('a')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); toggle.current?.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="dc-header">
      <div className="dc-utility">
        <div className="dc-wrap dc-utility-inner">
          <p className="dc-utility-note">Licensed and insured · Homes and businesses</p>
          <OpenStatus />
          <DisplaySettings />
        </div>
      </div>
      <div className="dc-wrap dc-mainbar">
        <Brand />
        <button ref={toggle} type="button" className="dc-menu-toggle" aria-expanded={open} aria-controls="dc-site-nav" onClick={() => setOpen(value => !value)}>
          <MenuIcon open={open} /> <span>{open ? 'Close' : 'Menu'}</span>
        </button>
        <div ref={nav} id="dc-site-nav" className="dc-nav-panel" data-open={open}>
          <nav aria-label="Main">
            <ul className="dc-nav">
              {primaryNav.map(slug => {
                const page = pageBySlug(slug)!
                return <li key={slug}><a href={href(slug)} aria-current={isCurrent(current, slug)}>{page.nav}</a></li>
              })}
            </ul>
          </nav>
          <div className="dc-header-actions">
            <a className="dc-phone-link" href={business.phoneHref}><PhoneIcon size={20} /><span><span className="dc-visually-hidden">Call </span>{business.phone}</span></a>
            <a className="dc-button" href={href('schedule')} aria-current={current.slug === 'schedule' ? 'page' : undefined}>Request a visit</a>
          </div>
        </div>
      </div>
    </header>
  )
}

export function Breadcrumbs({ page }: { page: Page }) {
  const trail = [{ label: 'Home', slug: '' }]
  if (page.kind === 'service') trail.push({ label: 'Services', slug: 'services' })
  return (
    <nav className="dc-crumbs dc-wrap" aria-label="Breadcrumb">
      <ol>
        {trail.map(item => <li key={item.slug}><a href={href(item.slug)}>{item.label}</a></li>)}
        <li><a href={href(page.slug)} aria-current="page">{page.nav}</a></li>
      </ol>
    </nav>
  )
}

export function MobileActionBar({ current }: { current: Page }) {
  return (
    <div className="dc-actionbar" role="region" aria-label="Quick contact">
      <a href={business.phoneHref}><PhoneIcon size={22} /><span>Call</span></a>
      <a href={business.smsHref}><ChatIcon size={22} /><span>Text</span></a>
      <a href={href('schedule')} aria-current={current.slug === 'schedule' ? 'page' : undefined}><CalendarIcon size={22} /><span>Request<span className="dc-visually-hidden"> a visit</span></span></a>
    </div>
  )
}

export function SiteFooter() {
  return (
    <footer className="dc-footer">
      <div className="dc-wrap dc-footer-grid">
        <div className="dc-footer-brand">
          <img src="/demos/deercreek/logo-white.png" alt="Deer Creek Plumbing, Inc." width="160" height="156" loading="lazy" />
          <p>Family and locally owned residential and commercial plumbing, serving the Kansas City metro since 2017.</p>
        </div>
        <div>
          <h2 className="dc-footer-heading">Contact</h2>
          <address>
            <a href={business.phoneHref}>{business.phone}</a><br />
            <a href={`mailto:${business.email}`}>{business.email}</a><br />
            {business.street}<br />
            {business.city}, {business.region} {business.postal}
          </address>
          <p className="dc-footer-hours">{business.hours.days}<br />{business.hours.label}<br />Saturday and Sunday closed</p>
        </div>
        <div>
          <h2 className="dc-footer-heading">Services</h2>
          <ul className="dc-footer-links">
            {services.map(service => <li key={service.slug}><a href={href(`services/${service.slug}`)}>{service.name}</a></li>)}
          </ul>
        </div>
        <div>
          <h2 className="dc-footer-heading">Company</h2>
          <ul className="dc-footer-links">
            {['schedule', 'service-area', 'reviews', 'about', 'faq', 'accessibility'].map(slug => <li key={slug}><a href={href(slug)}>{pageBySlug(slug)!.nav}</a></li>)}
            <li><a href={business.googleMaps} rel="noopener">Google reviews<span className="dc-visually-hidden"> (opens Google Maps)</span></a></li>
            <li><a href={business.facebook} rel="noopener">Facebook<span className="dc-visually-hidden"> (opens Facebook)</span></a></li>
          </ul>
        </div>
      </div>
      <div className="dc-wrap dc-footer-base">
        <p>© <span suppressHydrationWarning>{new Date().getFullYear()}</span> Deer Creek Plumbing, Inc. All services backed by a 1-year parts and labor warranty.</p>
        <p className="dc-concept-note">Website concept by <a href={agency.inquiry}>{agency.name}</a>. Online requests on this preview are not sent; call {business.phone} to book.</p>
      </div>
    </footer>
  )
}
