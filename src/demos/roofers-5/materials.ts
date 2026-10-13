/** Illustrative design allowances; an on-site survey determines the actual scope. */
export type MaterialId = 'slate' | 'standing-seam' | 'cedar' | 'clay'
export type ComplexityId = 'simple' | 'articulated' | 'estate'
export type RoofFinish = { id: string; name: string; hex: string }

export type RoofMaterial = {
  id: MaterialId
  name: string
  short: string
  character: string
  image: string
  rate: readonly [number, number]
  colors: RoofFinish[]
}

export const roofMaterials: RoofMaterial[] = [
  { id: 'slate', name: 'Natural slate', short: 'Slate', character: 'Crisp stone courses with a subtle variation in tone.', image: '/demos/roofers-5/material-slate.jpg', rate: [24, 42], colors: [{ id: 'blue-gray', name: 'Blue gray', hex: '#647481' }, { id: 'graphite', name: 'Graphite', hex: '#39434b' }] },
  { id: 'standing-seam', name: 'Standing seam metal', short: 'Metal', character: 'Continuous vertical seams and a precise architectural profile.', image: '/demos/roofers-5/material-metal.jpg', rate: [18, 31], colors: [{ id: 'charcoal', name: 'Charcoal', hex: '#3e474b' }, { id: 'zinc', name: 'Zinc', hex: '#8d999d' }, { id: 'bronze', name: 'Bronze', hex: '#826b54' }] },
  { id: 'cedar', name: 'Cedar shake', short: 'Cedar', character: 'Individual timber shakes with depth, grain and natural variation.', image: '/demos/roofers-5/material-cedar.jpg', rate: [19, 32], colors: [{ id: 'silver', name: 'Silvered cedar', hex: '#97978d' }, { id: 'honey', name: 'Honey cedar', hex: '#ae9064' }] },
  { id: 'clay', name: 'Clay tile', short: 'Clay', character: 'Dimensional barrel tiles, shaped by light and shadow.', image: '/demos/roofers-5/material-clay.jpg', rate: [23, 39], colors: [{ id: 'terracotta', name: 'Terracotta', hex: '#b97653' }, { id: 'sandstone', name: 'Sandstone', hex: '#b9a48b' }] },
]

export const roofComplexities = [
  { id: 'simple', name: 'Simple roof', description: 'A few roof faces and straightforward access', factor: 1 },
  { id: 'articulated', name: 'Articulated roof', description: 'Dormers, valleys and multiple roof faces', factor: 1.18 },
  { id: 'estate', name: 'Complex estate', description: 'Steep slopes, detailed rooflines or difficult access', factor: 1.4 },
] as const

export function planningRange(materialId: MaterialId, area: number, complexity: ComplexityId): [number, number] {
  const material = roofMaterials.find(item => item.id === materialId) ?? roofMaterials[0]
  const factor = roofComplexities.find(item => item.id === complexity)?.factor ?? 1
  const safeArea = Number.isFinite(area) ? Math.max(0, Math.min(40000, area)) : 0
  const round = (value: number) => Math.round(value / 500) * 500
  return [round(safeArea * material.rate[0] * factor), round(safeArea * material.rate[1] * factor)]
}

export const formatMoney = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
