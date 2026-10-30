import { business, footer, siteMeta } from '../../content/siteConfig'
import { navRoutes } from '../../content/routeMeta'
import { PageLink } from '../PageLink/PageLink'
import './SiteFooter.css'

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container site-footer__inner">
        <div className="site-footer__top">
          <div className="site-footer__identity">
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

            {/* Region only — Wallace Shift works from a home address, so no
                street address is published anywhere on the site. Both of
                these render only once a real value is set. */}
            {business.serviceArea && (
              <p className="site-footer__area">
                Serving {business.serviceArea} — and remote.
              </p>
            )}

            {business.salesEmail && (
              <>
                <p className="site-footer__area">Sales and new projects · Bella Wallace</p>
                <a
                  className="site-footer__email"
                  href={`mailto:${business.salesEmail}`}
                >
                  {business.salesEmail}
                </a>
              </>
            )}
          </div>

          <div className="site-footer__links">
            <nav aria-label="Footer" className="site-footer__nav">
              <ul>
                {navRoutes.map((route) => (
                  <li key={route.path}>
                    <PageLink href={route.path}>{route.navLabel}</PageLink>
                  </li>
                ))}
                <li>
                  <PageLink href="/contact">Start a project</PageLink>
                </li>
                <li><PageLink href="/client-portal">Client portal</PageLink></li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="site-footer__legal">
          <p className="site-footer__copyright">
            &copy; {year} {siteMeta.name}
          </p>
          <a
            className="site-footer__preferred-source"
            href={footer.preferredSource.href}
            aria-label={footer.preferredSource.label}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={footer.preferredSource.icon} alt="" width={18} height={18} loading="lazy" decoding="async" />
            <span>{footer.preferredSource.text}</span>
            <span className="site-footer__preferred-arrow" aria-hidden="true">↗</span>
          </a>
          <PageLink href="/privacy" className="site-footer__privacy">
            Privacy
          </PageLink>
        </div>
      </div>
    </footer>
  )
}
