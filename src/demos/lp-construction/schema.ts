import type { Language } from './request/types'
import { absolute, areaPlaces, business, findPage, findService, gallery, ORIGIN, services } from './content'

const photoUrl = (id: string) => `${ORIGIN}/demos/lp-construction/work/${id}-full.webp`

/**
 * JSON-LD for each page. Only confirmed facts: no street address (not to be
 * published), no ratings or reviews (none exist), no prices, no founding date.
 */
export function structuredData(slug: string, lang: Language = 'en') {
  const page = findPage(slug)
  if (!page) throw new Error(`Unknown LP Construction page: ${slug}`)
  const url = absolute(slug, lang)
  const businessId = `${absolute()}#business`
  const websiteId = `${absolute()}#website`
  const service = page.service ? findService(page.service) : undefined
  const leadPhoto = service ? gallery.find(photo => photo.id === service.photos[0]) : gallery[0]

  const graph: object[] = [
    {
      '@type': 'HomeAndConstructionBusiness',
      '@id': businessId,
      name: business.name,
      slogan: lang === 'es' ? 'Especialistas en carpintería de acabados' : business.tagline,
      description: lang === 'es' ? 'Carpintería de acabados en Kansas City: escaleras, paredes decorativas, molduras, puertas y muebles empotrados.' : 'Finish carpentry in the Kansas City area: staircases and railings, accent walls and wall paneling, crown molding and ceilings, baseboards, doors and windows, and built-ins and mantels.',
      url: absolute(),
      telephone: '+1-913-717-2787',
      address: { '@type': 'PostalAddress', addressLocality: 'Kansas City', addressRegion: 'MO', addressCountry: 'US' },
      areaServed: areaPlaces.map(place => ({ '@type': 'City', name: `${place.name}, ${place.state}` })),
      knowsLanguage: ['en', 'es'],
      paymentAccepted: business.paymentAccepted,
      sameAs: [business.instagram],
      ...(leadPhoto ? { image: photoUrl(leadPhoto.id) } : {}),
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: lang === 'es' ? 'Carpintería de acabados' : 'Finish carpentry',
        itemListElement: services.map(item => ({ '@type': 'Offer', itemOffered: { '@id': `${absolute(`services/${item.id}`, lang)}#service` } })),
      },
    },
    { '@type': 'WebSite', '@id': websiteId, url: absolute(), name: business.name, inLanguage: lang === 'es' ? 'es-US' : 'en-US', publisher: { '@id': businessId } },
    {
      '@type': page.kind === 'request' ? 'ContactPage' : page.kind === 'services' || page.kind === 'work' ? 'CollectionPage' : 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: page.copy[lang].title,
      description: page.copy[lang].description,
      inLanguage: lang === 'es' ? 'es-US' : 'en-US',
      isPartOf: { '@id': websiteId },
      about: { '@id': service ? `${url}#service` : businessId },
      ...(slug ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}),
    },
  ]

  if (slug) {
    const crumbs = [{ name: lang === 'es' ? 'Inicio' : 'Home', url: absolute('', lang) }]
    if (service) crumbs.push({ name: lang === 'es' ? 'Servicios' : 'Services', url: absolute('services', lang) })
    crumbs.push({ name: page.copy[lang].heading, url })
    graph.push({ '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: crumbs.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: item.url })) })
  }

  for (const item of service ? [service] : page.kind === 'services' ? services : []) {
    const pageUrl = absolute(`services/${item.id}`, lang)
    const photo = gallery.find(entry => entry.id === item.photos[0])
    graph.push({
      '@type': 'Service',
      '@id': `${pageUrl}#service`,
      name: item.copy[lang].name,
      serviceType: item.copy[lang].name,
      description: item.copy[lang].intro,
      url: pageUrl,
      provider: { '@id': businessId },
      areaServed: { '@type': 'AdministrativeArea', name: 'Kansas City metropolitan area' },
      ...(photo ? { image: photoUrl(photo.id) } : {}),
    })
  }

  if (page.kind === 'services') {
    graph.push({ '@type': 'ItemList', '@id': `${url}#services`, itemListElement: services.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.copy[lang].name, url: absolute(`services/${item.id}`, lang) })) })
  }

  return { '@context': 'https://schema.org', '@graph': graph }
}

/** Safe inside a <script> element. */
export const serializeJsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')
