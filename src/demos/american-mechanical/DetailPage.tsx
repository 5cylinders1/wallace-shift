import { areaPages, business, quoteHref, servicePages, type DetailContent } from './content'
import { Icon } from './icons'
import { Breadcrumb, LinkRow, SiteFrame } from './Layout'

// Logos load from each manufacturer's own site, as in the Base44 build.
const manufacturers = [
  { name: 'Lennox', logo: 'https://www.lennox.com/application/themes/lennox/assets/global/lennox_logo.svg', website: 'https://www.lennox.com/residential/', description: 'Lennox makes home heating and cooling systems, including gas furnaces, central air conditioners and heat pumps.', equipment: 'Air handlers, indoor coils and smart thermostats' },
  { name: 'Carrier', logo: 'https://brandportal.carrier.com/m/99b434eac013f6f/webimage-carrier_logo_rgb.png', website: 'https://www.carrier.com/us/en/residential/', description: 'Carrier makes central and ductless systems for home heating and cooling, including air conditioners, furnaces and heat pumps.', equipment: 'Air handlers, evaporator coils and system controls' },
  { name: 'YORK', logo: 'https://york.bosch-hcgroup.com/-/media/project/jci-global/york-sites/united-states-york/brand-logos/york_full_color_logo.png?la=en&h=95&w=391&hash=426A3A014690E6975F7AEEA37AF336BE', website: 'https://york.bosch-hcgroup.com/residential-equipment', description: 'YORK makes residential and light commercial HVAC equipment, from split system heat pumps to packaged units.', equipment: 'Evaporator coils, air handlers and replacement parts' },
  { name: 'Rheem', logo: 'https://files.rheem.com/blobazrheem/wp-content/uploads/sites/2/logo.svg', website: 'https://www.rheem.com/', description: 'Rheem makes air conditioners, furnaces and heat pumps, as well as tank, tankless and heat pump water heaters.', equipment: 'Air handlers, cooling coils and system controls' },
]

function HvacBrands() {
  return <section aria-labelledby="hvac-brands" className="am-brands">
    <p className="am-kicker"><span /> EQUIPMENT &amp; PARTS</p>
    <h2 id="hvac-brands">HVAC brands to know</h2>
    <p className="am-section-intro">Comparing new systems or looking for a replacement part? Start with what each manufacturer makes, then check compatibility for your model.</p>
    <ul className="am-brand-grid">
      {manufacturers.map(({ name, logo, website, description, equipment }) => <li className="am-card am-detail-card" key={name}>
        <div className="am-brand-logo"><img src={logo} alt="" loading="lazy" referrerPolicy="no-referrer" /></div>
        <h3>{name}</h3>
        <p>{description}</p>
        <p className="am-brand-parts"><strong>Parts &amp; components:</strong> {equipment}</p>
        <a href={website}>Visit {name} <Icon name="arrow-up-right" size={16} /></a>
      </li>)}
    </ul>
  </section>
}

export default function DetailPage({ page }: { page: DetailContent }) {
  const { name, headline, intro, blocks, service, area, brands, extra } = page
  const quoteText = area ? 'Request a Local Quote' : service === 'Heating & Cooling' || service === 'Water Heaters' ? 'Request a Quote' : 'Ask About Availability'
  const related = [...(area ? servicePages.slice(0, 2) : servicePages), ...areaPages].filter(([, label]) => label !== name)
  return <SiteFrame>
    <section className="am-hero am-detail-hero"><div className="am-shell">
      <Breadcrumb trail={[['Home', '/'], [area ? 'Service Areas' : 'Services', area ? '/#locations' : '/#services'], [name]]} />
      <h1>{headline}</h1><p className="am-intro">{intro}</p>
      <div className="am-actions">
        <a href={quoteHref(service)} className="am-btn am-primary">{quoteText}<Icon name="arrow-right" size={18} /></a>
        <a className="am-btn am-outline" href={business.phoneHref}><Icon name="phone" size={17} /> Call {business.phoneDisplay}</a>
      </div>
    </div></section>
    <section className="am-shell am-section">
      <p className="am-kicker"><span /> PLAN YOUR SERVICE</p><h2>{area ? 'What to know before you call' : 'What to expect'}</h2>
      <div className="am-services">{blocks.map(([heading, copy]) => <article className="am-card am-detail-card" key={heading}><h3>{heading}</h3><p>{copy}</p></article>)}</div>
      {extra && <p className="am-section-intro">{extra.before}<a className="am-underline" href={extra.href}>{extra.label}</a>{extra.after}</p>}
      {brands && <HvacBrands />}
    </section>
    <LinkRow title={area ? 'Explore local services' : 'Explore services and coverage'} links={[...related, ['/#locations', 'View All Service Areas']]} />
  </SiteFrame>
}
