import { pageBySlug, serviceBySlug, type Page } from './content'
import { AgencyBar, Breadcrumbs, MobileActionBar, SiteFooter, SiteHeader } from './Chrome'
import HomePage from './HomePage'
import { AboutPage, AccessibilityPage, AreaPage, FaqPage, ReviewsPage, SchedulePage } from './InfoPages'
import { ServicePage, ServicesHub } from './ServicePages'

function Body({ page }: { page: Page }) {
  switch (page.kind) {
    case 'home': return <HomePage />
    case 'services': return <ServicesHub />
    case 'service': return <ServicePage service={serviceBySlug(page.slug.replace('services/', ''))!} />
    case 'area': return <AreaPage />
    case 'reviews': return <ReviewsPage />
    case 'about': return <AboutPage />
    case 'schedule': return <SchedulePage />
    case 'faq': return <FaqPage />
    case 'accessibility': return <AccessibilityPage />
  }
}

/** One component tree for the static HTML and for hydration. `slug` is the
 * page path below the site base, e.g. "services/water-heaters". */
export default function DeerCreekApp({ slug }: { slug: string }) {
  const page = pageBySlug(slug) ?? pageBySlug('')!
  return (
    <div className="dc-site" data-page={page.kind}>
      <a className="dc-skip" href="#main">Skip to main content</a>
      <AgencyBar />
      <SiteHeader current={page} />
      <main id="main" tabIndex={-1}>
        {page.kind !== 'home' && <Breadcrumbs page={page} />}
        <Body page={page} />
      </main>
      <SiteFooter />
      <MobileActionBar current={page} />
    </div>
  )
}
