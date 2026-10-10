export type EstatePage = 'process' | 'insurance' | 'cost' | 'estimate'

const location = typeof window === 'undefined' ? undefined : window.location
const roofingHost = location?.hostname === 'roofers.wallaceshift.com'
const brandedPath = roofingHost || /^\/alder-stone(?:\/|$)/.test(location?.pathname ?? '')

/** Keep clean public/preview URLs while preserving the original local entry. */
export function estatePath(page?: EstatePage): string {
  if (brandedPath) return `/alder-stone${page ? `/${page}` : ''}`
  return `/demos/roofers-2/${page ? `${page}/` : ''}`
}

export const roofingGalleryPath = roofingHost ? '/' : '/demos/roofers-offer/'
export const studioUrl = 'https://wallaceshift.com'
