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

export const routeMeta: RouteMeta[] = [
  {
    path: '/',
    title: 'Wallace Shift | Websites, Web Apps & Automation',
    description:
      'Wallace Shift creates distinctive websites, web apps, and automations that help growing businesses earn trust and move forward.',
    priority: 1.0,
  },
  {
    path: '/services',
    title: 'Services | Wallace Shift',
    description:
      'Websites that earn trust, web apps that remove friction, and automation that gives time back. What each one involves, who it suits, and what you get.',
    navLabel: 'Services',
    priority: 0.9,
  },
  {
    path: '/pricing',
    title: 'Pricing | Wallace Shift',
    description:
      'Wallace Shift pricing for websites, web apps, and automation. Three website levels starting at $1,000, plus product definition and workflow engagements.',
    navLabel: 'Pricing',
    priority: 0.9,
  },
  {
    path: '/approach',
    title: 'Approach | Wallace Shift',
    description:
      'How a Wallace Shift project runs, from finding the friction to launching with momentum — and the standards every build is held to.',
    navLabel: 'Approach',
    priority: 0.7,
  },
  {
    path: '/about',
    title: 'About | Wallace Shift',
    description:
      'Wallace Shift is a two-person studio: one engineer who builds every project, and one person you talk to first. No account managers, no subcontractors.',
    navLabel: 'About',
    priority: 0.7,
  },
  {
    path: '/contact',
    title: 'Start a project | Wallace Shift',
    description:
      'Tell us what is not working. We will show you what can shift. Answer three quick questions or send a message directly.',
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

/** Header and footer navigation, in order. */
export const navRoutes = routeMeta.filter((route) => route.navLabel)
