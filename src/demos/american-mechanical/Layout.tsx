import type { ReactNode } from 'react'
import { business, href } from './content'
import { Icon } from './icons'

export function SiteHeader() {
  return <header className="am-header" id="top">
    <div className="am-top"><div className="am-shell am-top-inner">
      <span><Icon name="map-pin" size={13} /> Serving Greater Kansas City</span>
      <a href={business.phoneHref}><Icon name="zap" size={13} /> Emergency service? Call now</a>
    </div></div>
    <div className="am-shell am-nav">
      <a href={href('/#top')} className="am-brand" aria-label="American Mechanical KC home">
        <span className="am-mark"><Icon name="fan" size={24} /></span>
        <span>American Mechanical<small>K A N S A S &nbsp; C I T Y</small></span>
      </a>
      <nav aria-label="Main navigation">
        <a href={href('/#services')}>Services</a>
        <a href={href('/#locations')}>Service Areas</a>
        <a href={href('/#reviews')}>Reviews</a>
        <a href={href('/blog')}>Blog</a>
        <a href={href('/#quote')}>Request a Quote</a>
      </nav>
      <a className="am-nav-phone" href={business.phoneHref}><Icon name="phone" size={16} /><span>{business.phoneDisplay}</span></a>
    </div>
  </header>
}

export function SiteFooter() {
  return <footer className="am-footer"><div className="am-shell am-foot-grid">
    <div><strong>{business.name}</strong><p>Serving homes and businesses across Greater Kansas City.</p><a href={href('/blog')} className="am-foot-blog">Blog</a></div>
    <div><a href={business.phoneHref}>{business.phoneDisplay}</a><br /><a href={`mailto:${business.email}`}>{business.email}</a></div>
    <div><a href={business.google} target="_blank" rel="noreferrer">{business.address}</a><p>{business.hours}</p></div>
  </div></footer>
}

export function SiteFrame({ children }: { children: ReactNode }) {
  return <div className="am-site"><SiteHeader /><main>{children}</main><SiteFooter /></div>
}

/** Breadcrumb trail: every crumb but the last is a link. */
export function Breadcrumb({ trail }: { trail: [label: string, path?: string][] }) {
  return <nav aria-label="Breadcrumb">{trail.map(([label, path], index) => <span className="am-crumb" key={label}>
    {index > 0 && <Icon name="chevron-right" size={14} />}
    {path ? <a href={href(path)}>{label}</a> : <span aria-current="page">{label}</span>}
  </span>)}</nav>
}

export function LinkRow({ title, links }: { title: string; links: [path: string, label: string][] }) {
  return <section className="am-detail-related"><div className="am-shell"><h2>{title}</h2>
    <div className="am-detail-links">{links.map(([path, label]) => <a key={path} href={href(path)}>{label}<Icon name="arrow-right" size={16} /></a>)}</div>
  </div></section>
}
