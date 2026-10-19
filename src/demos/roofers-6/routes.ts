const location = typeof window === 'undefined' ? undefined : window.location

/** The collection page on the roofing host, the local entry elsewhere. */
export const galleryPath = location?.hostname === 'roofers.wallaceshift.com' ? '/' : '/demos/roofers-offer/'
