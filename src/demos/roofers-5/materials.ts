/** Demo planning allowances. These are illustrative inputs, not market quotations. */
export type MaterialId = 'slate' | 'standing-seam' | 'cedar' | 'clay'
export type ComplexityId = 'simple' | 'articulated' | 'estate'

export type RoofMaterial = {
  id: MaterialId
  name: string
  short: string
  character: string
  image: string
  rate: readonly [number, number]
  colors: { name: string; hex: string }[]
}

export const roofMaterials: RoofMaterial[] = [
  { id: 'slate', name: 'Natural slate', short: 'Slate', character: 'Quiet texture. Enduring architectural character.', image: '/demos/roofers-4/material-slate.jpg', rate: [25, 45], colors: [{ name: 'Blue gray', hex: '#667077' }, { name: 'Vermont green', hex: '#647268' }, { name: 'Graphite', hex: '#434c50' }] },
  { id: 'standing-seam', name: 'Standing seam', short: 'Metal', character: 'Precise lines. A beautifully restrained silhouette.', image: '/demos/roofers-4/material-metal.jpg', rate: [16, 28], colors: [{ name: 'Patinated zinc', hex: '#8a9695' }, { name: 'Soft charcoal', hex: '#48504e' }, { name: 'Weathered bronze', hex: '#726756' }] },
  { id: 'cedar', name: 'Cedar shake', short: 'Cedar', character: 'Natural warmth. A finish that matures with the home.', image: '/demos/roofers-4/material-cedar.jpg', rate: [14, 24], colors: [{ name: 'Silvered cedar', hex: '#939489' }, { name: 'Warm honey', hex: '#ae9064' }, { name: 'Aged timber', hex: '#8b7b68' }] },
  { id: 'clay', name: 'Clay tile', short: 'Clay', character: 'Sculptural depth. A distinctive Mediterranean language.', image: '/demos/roofers-4/material-clay.jpg', rate: [18, 35], colors: [{ name: 'Terracotta', hex: '#b97653' }, { name: 'Tuscan earth', hex: '#9c735a' }, { name: 'Limestone', hex: '#b6a58a' }] },
]

export const roofComplexities = [
  { id: 'simple', name: 'Simple', description: 'Few planes · straightforward access', factor: 1 },
  { id: 'articulated', name: 'Articulated', description: 'Dormers · valleys · several roof planes', factor: 1.18 },
  { id: 'estate', name: 'Complex estate', description: 'Steep slopes · intricate details · access constraints', factor: 1.4 },
] as const

export function planningRange(materialId: MaterialId, area: number, complexity: ComplexityId): [number, number] {
  const material = roofMaterials.find(item => item.id === materialId) ?? roofMaterials[0]
  const factor = roofComplexities.find(item => item.id === complexity)?.factor ?? 1
  const safeArea = Number.isFinite(area) ? Math.max(0, Math.min(40000, area)) : 0
  const round = (value: number) => Math.round(value / 500) * 500
  return [round(safeArea * material.rate[0] * factor), round(safeArea * material.rate[1] * factor)]
}

export const formatMoney = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
