import { navLinks, footer, siteMeta } from '../../content/siteConfig'
import { PageLink } from '../PageLink/PageLink'
import './SiteFooter.css'

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div className="site-footer__brand">
          <img
            src="/brand/wallace-shift-logo-white.svg"
            alt=""
            width={20}
            height={12}
          />
          <span>{siteMeta.name.toUpperCase()}</span>
        </div>

        <p className="site-footer__tagline">{footer.tagline}</p>

        <nav aria-label="Footer" className="site-footer__nav">
          <ul>
            {navLinks.map((link) => (
              <li key={link.href}>
                <PageLink href={link.href}>{link.label}</PageLink>
              </li>
            ))}
          </ul>
        </nav>

        <p className="site-footer__copyright">
          &copy; {year} {siteMeta.name}
        </p>
      </div>
    </footer>
  )
}
