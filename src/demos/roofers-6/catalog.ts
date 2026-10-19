/**
 * The roof finishes shared by the 3D engine and the page. Palettes drive
 * the procedural textures; rates and service lives feed the studio's
 * planning range. Every number is an illustrative planning assumption for
 * a fictional contractor, not a quote or a manufacturer claim.
 */

export type FinishFamily = 'shingle' | 'seam' | 'slate' | 'clay' | 'shake'
export type RoofStyle = 'gable' | 'hip'

export interface FinishColor {
  id: string
  name: string
  /** Swatch shown in the UI. */
  swatch: string
  /** Granule, stone or tile tones blended into the texture. */
  palette: string[]
  /** Standing seam only: paint or alloy. */
  metal?: { color: string; metalness: number; roughness: number }
}

export interface Finish {
  id: FinishFamily
  name: string
  short: string
  summary: string
  lifespan: string
  weight: string
  /** Illustrative installed planning rate, dollars per square foot of roof. */
  rate: [number, number]
  heavy: boolean
  /** Lowest pitch (rise per 12) this finish is normally installed at here. */
  minPitch: number
  colors: FinishColor[]
}

export const finishes: Finish[] = [
  {
    id: 'shingle',
    name: 'Architectural shingle',
    short: 'Shingle',
    summary: 'Laminated asphalt with dimensional, random-width tabs. The most chosen roof in the region, with impact-rated lines available.',
    lifespan: 'Typically 25 to 30 years',
    weight: 'Light, about 2.5 to 4 lb per sq ft',
    rate: [6, 10],
    heavy: false,
    minPitch: 4,
    colors: [
      { id: 'charcoal', name: 'Charcoal', swatch: '#34373b', palette: ['#2a2c2f', '#33363a', '#3d4044', '#25272a', '#45484c', '#2f3134'] },
      { id: 'pewter', name: 'Pewter', swatch: '#6b6e70', palette: ['#5d6062', '#6b6e70', '#777a7c', '#525557', '#828485', '#646769'] },
      { id: 'weathered', name: 'Weathered brown', swatch: '#5e5246', palette: ['#4e443a', '#5e5246', '#6d6052', '#463c33', '#7a6b5a', '#57493c'] },
      { id: 'desert', name: 'Desert tan', swatch: '#8f7f69', palette: ['#857560', '#8f7f69', '#9c8c74', '#776853', '#a69780', '#7f6f5b'] },
    ],
  },
  {
    id: 'seam',
    name: 'Standing-seam metal',
    short: 'Metal',
    summary: 'Concealed-fastener steel panels with raised seams every 16 inches. Sheds snow and wind-driven rain and reflects summer heat.',
    lifespan: 'Typically 40 to 70 years',
    weight: 'Light, about 1 to 1.5 lb per sq ft',
    rate: [14, 24],
    heavy: false,
    minPitch: 3,
    colors: [
      { id: 'black', name: 'Matte black', swatch: '#1f2124', palette: ['#232528'], metal: { color: '#1f2124', metalness: 0.45, roughness: 0.48 } },
      { id: 'bronze', name: 'Dark bronze', swatch: '#3d3128', palette: ['#3d3128'], metal: { color: '#3d3128', metalness: 0.5, roughness: 0.42 } },
      { id: 'galvalume', name: 'Galvalume', swatch: '#b6babd', palette: ['#b9bdc0'], metal: { color: '#c3c7ca', metalness: 0.92, roughness: 0.32 } },
      { id: 'sage', name: 'Evergreen', swatch: '#3c4a3f', palette: ['#3c4a3f'], metal: { color: '#3c4a3f', metalness: 0.45, roughness: 0.46 } },
    ],
  },
  {
    id: 'slate',
    name: 'Natural slate',
    short: 'Slate',
    summary: 'Hand-split stone laid in overlapping courses. Fireproof, beautiful at every distance and capable of outlasting the house.',
    lifespan: 'Typically 75 to 150 years',
    weight: 'Heavy, about 8 to 10 lb per sq ft',
    rate: [24, 42],
    heavy: true,
    minPitch: 6,
    colors: [
      { id: 'graphite', name: 'Graphite', swatch: '#3b3f44', palette: ['#363a3f', '#3f4449', '#2f3337', '#474c52', '#3a3d41', '#2b2e33'] },
      { id: 'sea', name: 'Sea green', swatch: '#535c55', palette: ['#4e5750', '#59625a', '#47504a', '#606a61', '#3f4741', '#555e57'] },
      { id: 'heather', name: 'Heather', swatch: '#574e56', palette: ['#524a52', '#5d545c', '#4a434a', '#665d64', '#3f4448', '#56504f'] },
    ],
  },
  {
    id: 'clay',
    name: 'Clay barrel tile',
    short: 'Clay',
    summary: 'Kiln-fired barrel tile that holds its colour for generations and breathes above a ventilated batten system.',
    lifespan: 'Typically 50 to 100 years',
    weight: 'Heavy, about 9 to 12 lb per sq ft',
    rate: [20, 36],
    heavy: true,
    minPitch: 4,
    colors: [
      { id: 'terracotta', name: 'Terracotta', swatch: '#a65a3a', palette: ['#a65a3a', '#b0633f', '#9a5234', '#b86c46', '#8f4a30'] },
      { id: 'sand', name: 'Sandstone', swatch: '#c49a6c', palette: ['#c49a6c', '#ba9063', '#cfa676', '#b0865c', '#d4ae80'] },
      { id: 'ash', name: 'Ash blend', swatch: '#7c6a5e', palette: ['#7c6a5e', '#6e5d52', '#8a786a', '#5f5048', '#958271'] },
    ],
  },
  {
    id: 'shake',
    name: 'Cedar shake',
    short: 'Cedar',
    summary: 'Split western red cedar with deep shadow lines. Warm when new, silvering gracefully, and best with regular care.',
    lifespan: 'Typically 25 to 40 years with care',
    weight: 'Moderate, about 3 to 4 lb per sq ft',
    rate: [13, 22],
    heavy: false,
    minPitch: 4,
    colors: [
      { id: 'fresh', name: 'Fresh cedar', swatch: '#9a6a45', palette: ['#9a6a45', '#a5744c', '#8c5f3d', '#b07f55', '#7f5536', '#a06b42'] },
      { id: 'silvered', name: 'Silvered', swatch: '#8a8580', palette: ['#8a8580', '#7d7873', '#96918b', '#6f6b66', '#a19c95', '#85807a'] },
    ],
  },
]

export interface RoofConfig {
  style: RoofStyle
  /** Rise per 12. */
  pitch: number
  finish: FinishFamily
  color: string
}

export const defaultRoof: RoofConfig = { style: 'gable', pitch: 8, finish: 'shingle', color: 'charcoal' }

export function finishById(id: FinishFamily): Finish {
  return finishes.find(finish => finish.id === id) ?? finishes[0]
}

export function colorFor(config: RoofConfig): FinishColor {
  const finish = finishById(config.finish)
  return finish.colors.find(color => color.id === config.color) ?? finish.colors[0]
}

export interface Upgrades {
  skylights: number
  solar: number
  copper: number
  snowGuards: number
  lighting: number
  gutterGuards: number
}

export const noUpgrades: Upgrades = { skylights: 0, solar: 0, copper: 0, snowGuards: 0, lighting: 0, gutterGuards: 0 }
export type UpgradeKey = keyof Upgrades

export const upgradeList: { id: UpgradeKey; name: string; note: string; allowance: [number, number] }[] = [
  { id: 'skylights', name: 'Skylights', note: 'Two curb-mounted, flashed with the new roof', allowance: [3800, 6400] },
  { id: 'solar', name: 'Solar-ready layout', note: 'Array planned and mounts flashed before the finish goes on', allowance: [1200, 2400] },
  { id: 'copper', name: 'Copper accents', note: 'Gutters, downspouts, drip edge and chimney cap', allowance: [6500, 11000] },
  { id: 'snowGuards', name: 'Snow guards', note: 'Two rows above the entry and walkways', allowance: [900, 1800] },
  { id: 'lighting', name: 'Soffit lighting', note: 'Warm downlights tucked into the eaves', allowance: [2400, 4200] },
  { id: 'gutterGuards', name: 'Gutter guards', note: 'Micro-mesh covers on every run', allowance: [1500, 2800] },
]
