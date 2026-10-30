import { renderToString } from 'react-dom/server'
import BucyrusAuto from './BucyrusAuto'
import { bucyrusServices } from './serviceContent'

const origin = 'https://wallaceshift.com'
const home = '/bucyrus-auto'
const business = {
  '@type': 'Organization',
  name: 'Bucyrus Auto & Drivetrain LLC',
  telephone: '+1-913-420-9865',
  location: { '@type': 'Place', name: 'Bucyrus, Kansas' },
}

/** Shared rendering for build output and local preview. This is a studio demo,
 * so schema describes the pages, not an owner-approved local business listing. */
export function renderBucyrus(path: string) {
  const service = bucyrusServices.find(item => path === `${home}/services/${item.slug}`)
  const guide = path === `${home}/vehicle-guide`
  if (path !== home && !service && !guide) return null

  const title = service?.title ?? (guide
    ? 'Vehicle Warning Signs & Symptom Guide | Bucyrus Auto & Drivetrain'
    : 'Auto Repair & Maintenance in Bucyrus, KS | Bucyrus Auto & Drivetrain')
  const description = service?.description ?? (guide
    ? 'Know which vehicle warning signs need urgent help and what details to share with a mechanic. A practical symptom guide from the Bucyrus Auto website demo.'
    : 'Explore auto repair, maintenance, drivetrain concerns and modification enquiries in Bucyrus, Kansas. A Bucyrus Auto & Drivetrain website concept by Wallace Shift.')
  const canonical = origin + path
  const websiteId = `${origin}${home}#website`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': websiteId, url: origin + home, name: 'Bucyrus Auto & Drivetrain — Website Concept', inLanguage: 'en-US', publisher: { '@type': 'Organization', name: 'Wallace Shift', url: origin } },
      { '@type': 'WebPage', '@id': `${canonical}#webpage`, url: canonical, name: title, description, inLanguage: 'en-US', isPartOf: { '@id': websiteId }, about: business },
      ...(path === home ? [] : [{ '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Bucyrus Auto', item: origin + home },
        { '@type': 'ListItem', position: 2, name: service?.name ?? 'Vehicle symptom guide', item: canonical },
      ] }]),
    ],
  }
  return { html: renderToString(<BucyrusAuto path={path} />), title, description, canonical, jsonLd, robots: 'noindex, nofollow' }
}
