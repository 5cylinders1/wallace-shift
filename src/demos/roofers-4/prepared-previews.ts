import type { MaterialId } from './content'

export type PreviewQuality = 'low' | 'medium'
export type RoofPreview = {
  image: string
  sourceId: string
  materialId: MaterialId
  colorIndex: number
  quality: PreviewQuality
  prepared: boolean
}

export const HALCYON_SAMPLE_ID = 'halcyon-sample'

/** Bundled first finishes belong only to the original Halcyon sample photo. */
export const HALCYON_SAMPLE_PREVIEWS: Readonly<Record<MaterialId, string>> = Object.freeze({
  'standing-seam': '/demos/roofers-4/sample-standing-seam-charcoal.jpg',
  slate: '/demos/roofers-4/sample-slate-vermont-gray.jpg',
  cedar: '/demos/roofers-4/sample-cedar-new-honey.jpg',
  clay: '/demos/roofers-4/sample-clay-terracotta.jpg',
  designer: '/demos/roofers-4/sample-designer-graphite.jpg',
})

export const previewKey = (photoId: string, materialId: MaterialId, colorIndex: number, quality: PreviewQuality) => `${photoId}:${materialId}:${colorIndex}:${quality}`

/** Detail controls affect new renders; either setting can use the same prepared study. */
export function getPreparedPreview(photoId: string, materialId: MaterialId, colorIndex: number, quality: PreviewQuality): RoofPreview | null {
  if (photoId !== HALCYON_SAMPLE_ID || colorIndex !== 0 || (quality !== 'low' && quality !== 'medium')) return null
  if (!Object.prototype.hasOwnProperty.call(HALCYON_SAMPLE_PREVIEWS, materialId)) return null
  const image = HALCYON_SAMPLE_PREVIEWS[materialId]
  if (!image) return null
  return { sourceId: HALCYON_SAMPLE_ID, image, materialId, colorIndex: 0, quality, prepared: true }
}
