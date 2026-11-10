import { SITE, absolute, business, generalFaqs, pageBySlug, serviceBySlug, services, type Faq, type Page } from './content'

/** Communities named in areaServed. Kept to the core of the metro the shop
 * already names (Olathe, Louisburg, Paola, Kansas City) plus its neighbours. */
export const servedCommunities = [
  ['Olathe', 'KS'], ['Overland Park', 'KS'], ['Lenexa', 'KS'], ['Shawnee', 'KS'], ['Leawood', 'KS'],
  ['Prairie Village', 'KS'], ['Merriam', 'KS'], ['Mission', 'KS'], ['Gardner', 'KS'], ['Spring Hill', 'KS'],
  ['De Soto', 'KS'], ['Edgerton', 'KS'], ['Louisburg', 'KS'], ['Paola', 'KS'], ['Bonner Springs', 'KS'],
  ['Kansas City', 'KS'], ['Kansas City', 'MO'], ['Lee’s Summit', 'MO'], ['Belton', 'MO'], ['Raymore', 'MO'], ['Grandview', 'MO'],
] as const

const BUSINESS_ID = `${absolute()}#business`
const WEBSITE_ID = `${absolute()}#website`
const LOGO = `${SITE.origin}/demos/deercreek/logo-ink.png`
const IMAGE = `${SITE.origin}/demos/deercreek/photos/truck-1600.webp`

function businessNode() {
  return {
    '@type': 'Plumber',
    '@id': BUSINESS_ID,
    name: business.name,
    legalName: business.legalName,
    url: absolute(),
    telephone: business.phoneE164,
    email: business.email,
    foundingDate: business.founded,
    logo: LOGO,
    image: IMAGE,
    description: 'Family and locally owned residential and commercial plumbing company in Olathe, Kansas, serving the Kansas City metro since 2017.',
    address: { '@type': 'PostalAddress', streetAddress: business.street, addressLocality: business.city, addressRegion: business.region, postalCode: business.postal, addressCountry: 'US' },
    geo: { '@type': 'GeoCoordinates', latitude: business.lat, longitude: business.lon },
    hasMap: business.googleMaps,
    openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: business.hours.open, closes: business.hours.close }],
    areaServed: [
      { '@type': 'AdministrativeArea', name: 'Kansas City metropolitan area' },
      ...servedCommunities.map(([name, state]) => ({ '@type': 'City', name: `${name}, ${state}` })),
    ],
    paymentAccepted: business.payments.join(', '),
    currenciesAccepted: 'USD',
    knowsLanguage: 'en',
    sameAs: [business.facebook, business.googleMaps],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Plumbing services',
      itemListElement: services.map(service => ({ '@type': 'Offer', itemOffered: { '@id': `${absolute(`services/${service.slug}`)}#service` } })),
    },
    // No aggregateRating or review: Google's review snippet guidelines forbid
    // marking up reviews copied from another site (Google, Facebook).
  }
}

function serviceNode(slug: string) {
  const service = serviceBySlug(slug)!
  return {
    '@type': 'Service',
    '@id': `${absolute(`services/${slug}`)}#service`,
    name: service.name,
    serviceType: service.h1,
    description: service.description,
    url: absolute(`services/${slug}`),
    provider: { '@id': BUSINESS_ID },
    areaServed: { '@type': 'AdministrativeArea', name: 'Kansas City metropolitan area' },
    image: `${SITE.origin}${service.image.src}`,
  }
}

function faqNode(url: string, faqs: Faq[]) {
  return {
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    url,
    mainEntity: faqs.map(faq => ({ '@type': 'Question', name: faq.q, acceptedAnswer: { '@type': 'Answer', text: faq.a } })),
  }
}

function crumbs(page: Page) {
  const items = [{ name: 'Home', slug: '' }]
  if (page.kind === 'service') items.push({ name: 'Services', slug: 'services' })
  items.push({ name: page.nav, slug: page.slug })
  return {
    '@type': 'BreadcrumbList',
    '@id': `${absolute(page.slug)}#breadcrumb`,
    itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: absolute(item.slug) })),
  }
}

const pageType: Record<Page['kind'], string> = {
  home: 'WebPage', services: 'CollectionPage', service: 'WebPage', area: 'WebPage', reviews: 'WebPage',
  about: 'AboutPage', schedule: 'ContactPage', faq: 'WebPage', accessibility: 'WebPage',
}

/** One JSON-LD graph per page: site, business, page, breadcrumb and whatever
 * the page is about (a service, its FAQs, the service list). */
export function structuredData(slug: string) {
  const page = pageBySlug(slug)
  if (!page) throw new Error(`Unknown Deer Creek page: ${slug}`)
  const url = absolute(slug)
  const service = page.kind === 'service' ? serviceBySlug(slug.replace('services/', '')) : undefined
  const graph: object[] = [
    { '@type': 'WebSite', '@id': WEBSITE_ID, url: absolute(), name: business.name, inLanguage: 'en-US', publisher: { '@id': BUSINESS_ID } },
    businessNode(),
    {
      '@type': pageType[page.kind],
      '@id': `${url}#webpage`,
      url,
      name: page.title,
      description: page.description,
      inLanguage: 'en-US',
      isPartOf: { '@id': WEBSITE_ID },
      about: { '@id': service ? `${url}#service` : BUSINESS_ID },
      primaryImageOfPage: service ? `${SITE.origin}${service.image.src}` : IMAGE,
      ...(page.kind === 'home' ? {} : { breadcrumb: { '@id': `${url}#breadcrumb` } }),
      ...(page.kind === 'schedule' ? { potentialAction: { '@type': 'CommunicateAction', target: business.phoneHref, name: 'Call Deer Creek Plumbing' } } : {}),
    },
  ]
  if (page.kind !== 'home') graph.push(crumbs(page))
  if (service) {
    graph.push(serviceNode(service.slug))
    graph.push(faqNode(url, service.faqs))
  }
  if (page.kind === 'services') {
    graph.push({
      '@type': 'ItemList',
      '@id': `${url}#services`,
      itemListElement: services.map((item, index) => ({ '@type': 'ListItem', position: index + 1, url: absolute(`services/${item.slug}`), name: item.name })),
    })
  }
  if (page.kind === 'faq') graph.push(faqNode(url, [...generalFaqs, ...services.flatMap(item => item.faqs)]))
  return { '@context': 'https://schema.org', '@graph': graph }
}
