import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { business, pagePath, phoneHref, services, smsHref } from './content'
import { useLang } from './lang'

function Brand() {
  const { lang, href } = useLang()
  return (
    <a className="lp-brand" href={href('/')}>
      <span className="lp-brand-mark" aria-hidden="true">LP</span>
      <span className="lp-brand-name">LP Construction<small>{lang === 'es' ? 'Especialistas en carpintería de acabados' : business.tagline}</small></span>
    </a>
  )
}

/**
 * The same page in the other language. Any ?zip=, ?job= or #section the
 * visitor arrived with goes along, so switching never loses their place.
 */
function LanguageLink({ slug, className }: { slug: string; className?: string }) {
  const { t } = useLang()
  const target = pagePath(slug, t.other.lang)
  const keepPlace = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!window.location.search && !window.location.hash) return
    event.preventDefault()
    window.location.href = target + window.location.search + window.location.hash
  }
  return (
    <a className={className} href={target} hrefLang={t.other.lang} lang={t.other.lang} aria-label={t.other.label} onClick={keepPlace}>
      {t.other.name}
    </a>
  )
}

export function SiteHeader({ slug }: { slug: string }) {
  const { t, href } = useLang()
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const links: [path: string, label: string][] = [['/services', t.nav.services], ['/our-work', t.nav.work], ['/service-area', t.nav.area]]

  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLElement>('a')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); toggle.current?.focus() }
      if (event.key !== 'Tab' || !menu.current) return
      // Keep focus within the open menu and its button.
      const items = [toggle.current, ...menu.current.querySelectorAll<HTMLElement>('a')].filter(Boolean) as HTMLElement[]
      const first = items[0], last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const isCurrent = (path: string) => slug === path.slice(1) || slug.startsWith(`${path.slice(1)}/`)
  return (
    <header className="lp-header">
      <div className="lp-shell lp-header-inner">
        <Brand />
        <nav className="lp-nav" aria-label={t.menu.label}>
          {links.map(([path, label]) => (
            <a key={path} href={href(path)} aria-current={isCurrent(path) ? 'page' : undefined}>{label}</a>
          ))}
          <a className="lp-button lp-button-small" href={href('/request')}>{t.nav.request}</a>
        </nav>
        <a className="lp-header-phone" href={phoneHref}>{business.phoneDisplay}</a>
        <LanguageLink slug={slug} className="lp-language-button" />
        <button ref={toggle} type="button" className="lp-menu-button" aria-expanded={open} aria-controls="lp-menu" onClick={() => setOpen(value => !value)}>
          <span className="lp-menu-icon" aria-hidden="true"><span /><span /></span>
          <span>{open ? t.menu.close : t.menu.open}</span>
        </button>
      </div>
      <div ref={menu} id="lp-menu" className="lp-menu" hidden={!open}>
        <nav aria-label={t.menu.label}>
          {links.map(([path, label]) => (
            <a key={path} href={href(path)} aria-current={isCurrent(path) ? 'page' : undefined}>{label}</a>
          ))}
          <LanguageLink slug={slug} />
          <a href={href('/request')}>{t.nav.request}</a>
          <a href={phoneHref}>{t.nav.call} {business.phoneDisplay}</a>
        </nav>
      </div>
    </header>
  )
}

export function SiteFooter({ slug }: { slug: string }) {
  const { t, lang, href } = useLang()
  const year = new Date().getFullYear()
  return (
    <footer className="lp-footer">
      <div className="lp-shell lp-footer-grid">
        <div>
          <Brand />
          <p>{t.footer.blurb}</p>
        </div>
        <nav aria-label={t.footer.services}>
          <h2>{t.footer.services}</h2>
          <ul>{services.map(service => <li key={service.id}><a href={href(`/services/${service.id}`)}>{service.copy[lang].name}</a></li>)}</ul>
        </nav>
        <div>
          <h2>{t.footer.contact}</h2>
          <ul>
            <li><a href={phoneHref}>{t.footer.call} {business.phoneDisplay}</a></li>
            {business.textsEnabled && <li><a href={smsHref(t.talk.textBody)}>{t.footer.text} {business.phoneDisplay}</a></li>}
            <li><a href={href('/request')}>{t.footer.request}</a></li>
            <li><LanguageLink slug={slug} /></li>
            <li><a href={business.instagram} rel="noreferrer" target="_blank">{t.footer.instagram}<span className="lp-visually-hidden"> {t.footer.newTab}</span></a></li>
          </ul>
        </div>
      </div>
      <div className="lp-shell lp-footer-base">
        <p>{t.footer.rights(year)}</p>
        <p>{t.footer.concept}</p>
      </div>
    </footer>
  )
}

export function Breadcrumbs({ trail }: { trail: [label: string, path?: string][] }) {
  const { lang, href } = useLang()
  return (
    <nav className="lp-breadcrumbs" aria-label={lang === 'es' ? 'Ruta de navegación' : 'Breadcrumb'}>
      <ol>
        {trail.map(([label, path]) => (
          <li key={label}>{path !== undefined ? <a href={href(path)}>{label}</a> : <span aria-current="page">{label}</span>}</li>
        ))}
      </ol>
    </nav>
  )
}

export function SiteFrame({ slug, children }: { slug: string; children: ReactNode }) {
  const { t } = useLang()
  return (
    <div className="lp-site">
      <a className="lp-skip" href="#main">{t.skip}</a>
      <SiteHeader slug={slug} />
      <main id="main" tabIndex={-1}>{children}</main>
      <SiteFooter slug={slug} />
    </div>
  )
}

/** Call and text buttons, shown wherever a visitor might rather talk. */
export function TalkButtons({ textBody, tone = 'light' }: { textBody?: string; tone?: 'light' | 'dark' }) {
  const { t } = useLang()
  return (
    <div className={`lp-talk lp-talk-${tone}`}>
      <a className="lp-button lp-button-quiet" href={phoneHref}>{t.talk.call} {business.phoneDisplay}</a>
      {business.textsEnabled && <a className="lp-button lp-button-quiet" href={smsHref(textBody ?? t.talk.textBody)}>{t.talk.text}</a>}
    </div>
  )
}
