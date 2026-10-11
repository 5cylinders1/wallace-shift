const location = typeof window === 'undefined' ? undefined : window.location
const roofingHost = location?.hostname === 'roofers.wallaceshift.com'

/** Clean public path on the roofing host, the original demo entry elsewhere. */
export const halcyonPath = roofingHost || /^\/halcyon(?:\/|$)/.test(location?.pathname ?? '') ? '/halcyon' : '/demos/roofers-4/'
export const roofingGalleryPath = roofingHost ? '/' : '/demos/roofers-offer/'
export const studioUrl = 'https://wallaceshift.com'
