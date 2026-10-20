/** Everything the scene can show, as numbers the engine eases toward. */

export interface CameraTarget {
  /** Degrees around the model; 0 looks straight at the section, positive swings to the right. */
  azimuth: number
  /** Degrees above the horizon. */
  elevation: number
  distance: number
  target: [number, number, number]
  /** Fraction of the viewport to slide the subject: +x right, +y up. */
  offsetX: number
  offsetY: number
  fov: number
}

export const REPAIRS = ['extension', 'regrade', 'drain', 'sump', 'battery', 'membrane', 'straps', 'anchors', 'braces', 'piers', 'helical'] as const
export type RepairKey = typeof REPAIRS[number]
export type Repairs = Record<RepairKey, number>

export interface SoilState {
  /** Moisture held in the upper soil. */
  wet: number
  /** Height of the water table in metres (grade is 0). */
  table: number
  /** Late-summer drying: lighter clay and shrinkage cracks. */
  dry: number
  /** Soil pulling away from the walls. */
  gap: number
  /** Frozen ground down to the footing depth line. */
  frost: number
  /** Saturated soil pushing on the right-hand wall. */
  pressure: number
  /** Swelling clay pushing up. */
  swell: number
  /** Low spot in the lawn by the right-hand wall. */
  negGrade: number
  /** 0 green lawn, 1 straw. */
  lawnDry: number
  autumn: number
  bare: number
}

export interface DamageState {
  /** The left-hand corner settling, exaggerated. */
  settle: number
  /** The right-hand wall bowing inward, exaggerated. */
  bow: number
  stepCrack: number
  hCrack: number
  puddle: number
}

export interface WeatherState {
  rain: number
  /** How much water is moving through the routes. */
  flow: number
  night: number
  /** 1 with mains power, 0 during an outage. */
  power: number
}

export interface SceneTarget extends SoilState, DamageState, WeatherState {
  camera: CameraTarget
  drift: number
  /** Emphasised stratum: -1 none, 0 topsoil, 1 clay, 2 shale, 3 limestone. */
  focus: number
  repairs: Repairs
}

export const noRepairs: Repairs = Object.fromEntries(REPAIRS.map(key => [key, 0])) as Repairs

export const calmSoil: SoilState = { wet: 0.35, table: -5.6, dry: 0, gap: 0, frost: 0, pressure: 0, swell: 0, negGrade: 1, lawnDry: 0.15, autumn: 0, bare: 0 }
export const noDamage: DamageState = { settle: 0, bow: 0, stepCrack: 0, hCrack: 0, puddle: 0 }
export const clearWeather: WeatherState = { rain: 0, flow: 0, night: 0, power: 1 }

export const baseTarget: SceneTarget = {
  camera: { azimuth: 22, elevation: 9, distance: 46, target: [0.5, -2.2, -3], offsetX: 0.2, offsetY: 0, fov: 30 },
  drift: 1,
  focus: -1,
  ...calmSoil,
  ...noDamage,
  ...clearWeather,
  repairs: { ...noRepairs },
}

/** Seasons through a Kansas City year, by month (0 = January). Movement is exaggerated on screen. */
export function seasonAt(month: number): SoilState {
  const m = ((month % 12) + 12) % 12
  const bump = (center: number, width: number) => {
    let d = Math.abs(m - center)
    d = Math.min(d, 12 - d)
    return Math.max(0, Math.cos(Math.min(1, d / width) * Math.PI) * 0.5 + 0.5)
  }
  const spring = bump(4, 2.6)
  const summer = bump(8, 2.4)
  const fall = bump(10.2, 1.6)
  const winter = bump(0.6, 2.2)
  return {
    wet: Math.min(1, 0.25 + spring * 0.75 + winter * 0.2),
    table: -6.4 + spring * 4.7 + winter * 1.2 - summer * 1.6,
    dry: summer,
    gap: summer,
    frost: winter,
    pressure: spring,
    swell: spring * 0.8,
    negGrade: 1,
    lawnDry: Math.min(1, summer * 0.9 + winter * 0.55 + fall * 0.3),
    autumn: fall,
    bare: winter,
  }
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
