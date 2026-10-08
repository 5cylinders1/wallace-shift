import { brand } from '../brand'
import { footer, nav, ribbon, WALLACE_SHIFT_CONTACT_URL, WALLACE_SHIFT_URL } from '../content'
import { BrandMark } from './BrandMark'
import './SiteFooter.css'

export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="rf-footer">
      <div className="rf-container">
        <div className="rf-footer__top">
          <div className="rf-footer__brand">
            <BrandMark />
            <div>
              <p className="rf-footer__name">{brand.company}</p>
              <p>{footer.tagline}</p>
              <p>{footer.serviceArea}</p>
            </div>
          </div>
          <nav aria-label="Footer">
            <ul className="rf-footer__nav">
              {nav.map((item) => (
                <li key={item.href}>
                  <a href={item.href}>{item.label}</a>
                </li>
              ))}
              <li>
                <a href="#estimate">Free estimate</a>
              </li>
            </ul>
          </nav>
          <div className="rf-footer__contact">
            <a href={brand.phoneHref}>{brand.phoneDisplay}</a>
            <a className="rf-button rf-button--primary" href="#estimate">
              Get my estimate
            </a>
          </div>
        </div>

        <div className="rf-footer__demo">
          <p>
            <strong>{ribbon.lead}.</strong> {ribbon.detail} {footer.credit} Prices, terms and the phone number are
            examples; no information you enter is sent anywhere.
          </p>
          <div className="rf-footer__demo-links">
            <a href={WALLACE_SHIFT_CONTACT_URL} target="_blank" rel="noopener">
              {footer.creditCta}
            </a>
            <a href={WALLACE_SHIFT_URL} target="_blank" rel="noopener">
              wallaceshift.com
            </a>
          </div>
        </div>

        <p className="rf-footer__legal">
          © {year} {brand.company} (sample brand). Designed and built by Wallace Shift.
        </p>
      </div>
    </footer>
  )
}
