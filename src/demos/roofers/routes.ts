/**
 * The Northvane demo's pages. Each is its own document (demos/roofers/…/
 * index.html) sharing one entry script, which renders the page its path
 * names. Public URLs are /northvane, /northvane/insurance and so on (see
 * vercel.json); the /demos/roofers/… entries keep working too.
 */
export type PageId = 'home' | 'insurance' | 'prices' | 'warranty' | 'faq'

export const INFO_PAGES = ['insurance', 'prices', 'warranty', 'faq'] as const satisfies readonly PageId[]

const location = typeof window === 'undefined' ? undefined : window.location
const branded = location?.hostname === 'roofers.wallaceshift.com' || /^\/northvane(?:\/|$)/.test(location?.pathname ?? '')

/** The page this document is, from the last part of its path. */
export function currentPage(): PageId {
  const last = (location?.pathname ?? '').replace(/\/index\.html$/, '').replace(/\/+$/, '').split('/').pop() ?? ''
  return (INFO_PAGES as readonly string[]).includes(last) ? (last as PageId) : 'home'
}

/** A prospect's personalised link (see brand.ts) keeps its details from page to page. */
const CARRIED = ['company', 'city', 'phone']
function carried(): string {
  const from = new URLSearchParams(location?.search ?? '')
  const kept = new URLSearchParams()
  for (const key of CARRIED) {
    const value = from.get(key)
    if (value) kept.set(key, value)
  }
  const query = kept.toString()
  return query ? `?${query}` : ''
}

const pathOf = (page: PageId) =>
  branded ? `/northvane${page === 'home' ? '' : `/${page}`}` : `/demos/roofers/${page === 'home' ? '' : `${page}/`}`

/** A link to a page, or to a section of one; on the page itself, just the section. */
export function pageHref(page: PageId, section?: string): string {
  if (page === currentPage()) return `#${section ?? 'top'}`
  return `${pathOf(page)}${carried()}${section ? `#${section}` : ''}`
}
