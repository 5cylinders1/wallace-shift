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

import { serviceLandingPages } from './serviceLandingPages.ts'

/** Production origin. Used for canonical URLs, OG tags, and the sitemap. */
export const SITE_ORIGIN = 'https://wallaceshift.com'

export interface RouteMeta {
  path: string
  title: string
  description: string
  /** Public page type and breadcrumb label used by the shared JSON-LD graph. */
  schemaType?: 'WebPage' | 'CollectionPage' | 'AboutPage' | 'ContactPage'
  breadcrumbLabel?: string
  /** Present only on a dedicated page describing an offered service. */
  serviceType?: string
  /** Shown in the header/footer nav. Omitted routes are reachable but unlisted. */
  navLabel?: string
  /** Relative priority in sitemap.xml. */
  priority: number
  /** Excluded from sitemap.xml and marked noindex. */
  noindex?: boolean
  /** A public page kept out of search: render its HTML and consent-based
   * analytics, and navigate to it client-side, even while noindex keeps it
   * out of the index. Set for review drafts and for /what-now, which only
   * makes sense after an enquiry. Never set for private pages. */
  publicDraft?: boolean
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

/** Unlisted offer draft. Commercial terms still require review before launch. */
export const AI_OFFER_PATH = '/offers/ai-business-integration'

/** Where both enquiry forms land after a confirmed send. Linked from nowhere
 *  else: it explains what happens next, so it belongs after the form. */
export const WHAT_NOW_PATH = '/what-now'

export const routeMeta: RouteMeta[] = [
  { path: '/client-portal', title: 'Client Portal | Wallace Shift', description: 'Review agreements, invoices, and payments with Wallace Shift.', priority: 0, noindex: true, robots: 'noindex, nofollow' },
  { path: '/mail', title: 'Mail | Wallace Shift', description: 'Private email workspace for the Wallace Shift team.', priority: 0, noindex: true, robots: 'noindex, nofollow' },
  {
    path: '/',
    title: 'AI Integration & Custom CRM Development | Wallace Shift',
    description:
      'AI integration, custom CRM development, and workflow automation for small businesses in Greater Kansas City and remotely. Build around the way your team works.',
    priority: 1.0,
  },
  {
    path: '/services',
    title: 'AI, CRM & Workflow Automation Services | Wallace Shift',
    description:
      'AI integration, custom CRMs, and workflow automation for small businesses. Connect AI to everyday tasks with clear scope, testing, and team support.',
    navLabel: 'Services',
    priority: 0.9,
  },
  ...serviceLandingPages.map(service => ({
    path: service.path,
    title: service.title,
    description: service.description,
    breadcrumbLabel: service.name,
    serviceType: service.serviceType,
    priority: 0.9,
  })),
  {
    path: '/pricing',
    title: 'AI Integration, CRM & Website Pricing | Wallace Shift',
    description:
      'Explore custom CRM development, AI integration, automation, and website pricing. See starting scopes, definition options, and ongoing support with Wallace Shift.',
    navLabel: 'Pricing',
    priority: 0.9,
  },
  {
    path: '/approach',
    title: 'Our AI & CRM Implementation Process | Wallace Shift',
    description:
      'How we map your workflow, define the right system, build and test it with you, and plan support and further improvements.',
    navLabel: 'Approach',
    priority: 0.7,
  },
  {
    path: '/about',
    title: 'About Wallace Shift | AI & CRM Development in Kansas City',
    description:
      'Meet Matthew and Bella Wallace. We help small businesses in Greater Kansas City and remotely with AI integration, custom CRMs, and connected workflows.',
    navLabel: 'About',
    priority: 0.7,
  },
  {
    path: '/contact',
    title: 'Contact Wallace Shift | AI, CRM & Automation Projects',
    description:
      'Tell us about your current tools, missed follow-up, or repeated admin. Discuss a custom CRM, AI integration, workflow, or connected website with Wallace Shift.',
    navLabel: 'Contact',
    priority: 0.8,
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | Wallace Shift',
    description:
      'What Wallace Shift collects through this website, why, and how to have it removed.',
    priority: 0.2,
  },
  {
    path: AI_OFFER_PATH,
    title: 'Find Your First AI Project | Wallace Shift',
    description:
      'Answer a few questions about your business, bottleneck, and readiness for AI. See a practical recommendation before sharing contact details.',
    priority: 0,
    noindex: true,
    publicDraft: true,
    robots: 'noindex, nofollow',
  },
  {
    path: WHAT_NOW_PATH,
    title: 'What Happens Next | Wallace Shift',
    description:
      'What happens after you contact Wallace Shift: a reply within one business day, a conversation about how your work runs, and a first step agreed in writing.',
    priority: 0,
    noindex: true,
    publicDraft: true,
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
