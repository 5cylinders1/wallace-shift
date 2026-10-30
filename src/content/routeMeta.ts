/**
 * The single source of truth for the site's URLs.
 *
 * Four things read this file, and they must never disagree:
 *  - the router, to decide which page component to render;
 *  - the header and footer, to build navigation;
 *  - `useDocumentMeta`, to set the title/description on client navigation;
 *  - the build-time prerender plugin in `vite.config.ts`, which emits one
 *    real HTML file per route with these tags baked into the markup, plus
 *    `sitemap.xml`.
 *
 * Adding a route means adding it here and nowhere else — except for the
 * page component itself, which `App` maps by path.
 */

/** Production origin. Used for canonical URLs, OG tags, and the sitemap. */
export const SITE_ORIGIN = 'https://wallaceshift.com'

export interface RouteMeta {
  path: string
  title: string
  description: string
  /** Shown in the header/footer nav. Omitted routes are reachable but unlisted. */
  navLabel?: string
  /** Relative priority in sitemap.xml. */
  priority: number
  /** Excluded from sitemap.xml and marked noindex. */
  noindex?: boolean
  /**
   * Overrides the robots directive emitted for a `noindex` route.
   * Defaults to `noindex` alone, which is what `/404` has always used.
   */
  robots?: string
}

/** The isolated WebGL experiment. Reachable by URL, linked from nowhere. */
export const WATER_HERO_EXPERIMENT_PATH = '/experiments/water-hero'

/** The preserved scroll-driven pit-stop scene, outside the production lander. */
export const PIT_STOP_EXPERIMENT_PATH = '/experiments/pit-stop'

export const routeMeta: RouteMeta[] = [
  { path: '/client-portal', title: 'Client Portal | Wallace Shift', description: 'Review agreements, invoices, and payments with Wallace Shift.', priority: 0, noindex: true, robots: 'noindex, nofollow' },
  {
    path: '/',
    title: 'Wallace Shift | Custom CRMs, AI & Automation',
    description:
      'Custom CRM systems, practical AI integrations, and workflow automation built around your business. Connect enquiries, follow-up, and daily operations.',
    priority: 1.0,
  },
  {
    path: '/services',
    title: 'CRM, AI & Automation Services | Wallace Shift',
    description:
      'Custom CRMs, AI integrations, and connected workflows for customer records, follow-up, and operations. Websites support the customer-facing journey.',
    navLabel: 'Services',
    priority: 0.9,
  },
  {
    path: '/pricing',
    title: 'Pricing | Wallace Shift',
    description:
      'Explore system definition, software builds, ongoing development, and automation engagements. See the scope, support terms, and supporting website packages.',
    navLabel: 'Pricing',
    priority: 0.9,
  },
  {
    path: '/approach',
    title: 'Approach | Wallace Shift',
    description:
      'How we map your workflow, define the right system, build and test it with you, and plan support and further improvements.',
    navLabel: 'Approach',
    priority: 0.7,
  },
  {
    path: '/about',
    title: 'About | Wallace Shift',
    description:
      'Meet the two people behind Wallace Shift, a software company building custom CRMs, AI integrations, and connected business workflows.',
    navLabel: 'About',
    priority: 0.7,
  },
  {
    path: '/contact',
    title: 'Discuss Your Business System | Wallace Shift',
    description:
      'Tell us about your current tools, missed follow-up, or repeated admin. Discuss a custom CRM, AI integration, workflow, or connected website with Wallace Shift.',
    navLabel: 'Contact',
    priority: 0.8,
  },
  {
    path: '/privacy',
    title: 'Privacy | Wallace Shift',
    description:
      'What Wallace Shift collects through this website, why, and how to have it removed.',
    priority: 0.2,
  },
  {
    path: WATER_HERO_EXPERIMENT_PATH,
    title: 'Water hero experiment | Wallace Shift',
    description:
      'An isolated realtime WebGL prototype. Not part of the Wallace Shift site.',
    priority: 0,
    noindex: true,
    robots: 'noindex, nofollow',
  },
  {
    path: PIT_STOP_EXPERIMENT_PATH,
    title: 'Pit-stop experiment | Wallace Shift',
    description:
      'The preserved scroll-driven pit-stop animation: find the friction, make the shift, and launch with momentum.',
    priority: 0,
    noindex: true,
    robots: 'noindex, nofollow',
  },
  {
    path: '/404',
    title: 'Page not found | Wallace Shift',
    description: 'That page does not exist.',
    priority: 0,
    noindex: true,
  },
]

/** Paths that resolve to a page. Anything else is a 404. */
export const knownPaths = routeMeta.map((route) => route.path)

export function findRoute(path: string): RouteMeta | undefined {
  return routeMeta.find((route) => route.path === path)
}

/** The blog owns static HTML documents, outside the React route/build table. */
const blogNavigation: RouteMeta = {
  path: '/blog',
  title: 'Business Software & Automation Blog | Wallace Shift',
  description: 'Practical answers to questions about CRMs, AI, automation, and business websites.',
  navLabel: 'Blog',
  priority: 0.7,
}

/** Header and footer navigation, in order. */
export const navRoutes = routeMeta
  .filter((route) => route.navLabel)
  .flatMap((route) => route.path === '/contact' ? [blogNavigation, route] : [route])
