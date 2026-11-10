import { SITE_ORIGIN, findRoute, routeMeta, type RouteMeta } from './routeMeta.ts'
import { business, siteMeta } from './siteConfig.ts'

export const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`
export const WEBSITE_ID = `${SITE_ORIGIN}/#website`

/** Use only public business facts. Wallace Shift is a service-area company;
 * its private street address, unverified reviews, and outcomes do not belong
 * in structured data. Shared IDs link pages and blog articles to one entity. */
export const organizationNode = {
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: siteMeta.name,
  url: `${SITE_ORIGIN}/`,
  logo: `${SITE_ORIGIN}/brand/wallace-shift-logo-black.svg`,
  description: siteMeta.description,
  areaServed: { '@type': 'Place', name: business.serviceArea ?? 'Greater Kansas City' },
  ...(business.email ? {
    contactPoint: { '@type': 'ContactPoint', contactType: 'sales', email: business.email },
  } : {}),
}

export const websiteNode = {
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  url: `${SITE_ORIGIN}/`,
  name: siteMeta.name,
  description: siteMeta.description,
  publisher: { '@id': ORGANIZATION_ID },
  inLanguage: 'en-US',
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

const canonicalFor = (path: string) => `${SITE_ORIGIN}${path}`
const pageLabel = (route: RouteMeta) => route.breadcrumbLabel ?? route.navLabel ?? route.title.split(' | ')[0]

function serviceNode(route: RouteMeta) {
  const url = canonicalFor(route.path)
  return {
    '@type': 'Service',
    '@id': `${url}#service`,
    url,
    name: pageLabel(route),
    serviceType: route.serviceType,
    description: route.description,
    provider: { '@id': ORGANIZATION_ID },
    areaServed: organizationNode.areaServed,
    mainEntityOfPage: { '@id': `${url}#webpage` },
  }
}

export function structuredDataForRoute(path: string) {
  const route = findRoute(path)
  if (!route) return undefined
  const url = canonicalFor(route.path)
  const breadcrumbId = `${url}#breadcrumb`
  const serviceRoutes = routeMeta.filter(item => item.serviceType && !item.noindex)
  const page: Record<string, unknown> = {
    '@type': route.schemaType ?? (route.path === '/about' ? 'AboutPage' : route.path === '/contact' ? 'ContactPage' : route.path === '/services' ? 'CollectionPage' : 'WebPage'),
    '@id': `${url}#webpage`,
    url,
    name: route.title,
    description: route.description,
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': ORGANIZATION_ID },
    inLanguage: 'en-US',
    ...(path !== '/' && !route.noindex ? { breadcrumb: { '@id': breadcrumbId } } : {}),
    ...(route.serviceType && !route.noindex ? { mainEntity: { '@id': `${url}#service` } } : {}),
  }
  const graph: Record<string, unknown>[] = [organizationNode, websiteNode, page]
  if (!route.noindex && path !== '/') {
    const crumbs = [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
      ...(path.startsWith('/services/') ? [{ '@type': 'ListItem', position: 2, name: 'Services', item: `${SITE_ORIGIN}/services` }] : []),
    ]
    crumbs.push({ '@type': 'ListItem', position: crumbs.length + 1, name: pageLabel(route), item: url })
    graph.push({ '@type': 'BreadcrumbList', '@id': breadcrumbId, itemListElement: crumbs })
  }
  if (route.serviceType && !route.noindex) graph.push(serviceNode(route))
  if (path === '/services' && serviceRoutes.length) {
    page.mainEntity = { '@id': `${url}#services` }
    graph.push({
      '@type': 'ItemList', '@id': `${url}#services`, name: 'Wallace Shift services',
      itemListElement: serviceRoutes.map((item, index) => ({
        '@type': 'ListItem', position: index + 1,
        url: canonicalFor(item.path), name: pageLabel(item),
      })),
    })
  }
  return { '@context': 'https://schema.org', '@graph': graph }
}
