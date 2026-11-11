import { CERVICAL, LUMBAR, SACRAL, THORACIC, type Region, type Symptom } from './content'
import type { Shot } from './engine/SpineStage'

/** Copy beside the spine on wide screens; stacked over it on narrow ones. */
const place = (narrow: boolean, wide = 0.2) => ({ screenX: narrow ? 0 : wide, screenY: narrow ? 0.16 : 0 })

export function chapterShot(id: string, narrow: boolean): Shot {
  switch (id) {
    case 'hero':
      return { focus: 'all', azimuth: 128, elevation: 6, fit: narrow ? 1.75 : 1.14, ...place(narrow, 0.22), screenY: narrow ? 0.19 : -0.025, spin: true }
    case 'overview':
      return { focus: 'all', azimuth: 92, elevation: 4, fit: narrow ? 1.2 : 1.06, ...place(narrow), spin: true }
    case 'cervical':
      return { focus: CERVICAL, azimuth: 122, elevation: 14, fit: narrow ? 2.4 : 1.9, ...place(narrow), bones: CERVICAL, tone: 'brand' }
    case 'thoracic':
      return { focus: THORACIC, azimuth: 146, elevation: 10, fit: narrow ? 1.5 : 1.25, ...place(narrow), bones: THORACIC, tone: 'brand' }
    case 'lumbar':
      return { focus: LUMBAR, azimuth: 152, elevation: 8, fit: narrow ? 2.1 : 1.65, ...place(narrow), bones: LUMBAR, tone: 'brand' }
    case 'sacral':
      return { focus: ['L5', ...SACRAL], azimuth: 166, elevation: 16, fit: narrow ? 2.0 : 1.6, ...place(narrow), bones: SACRAL, tone: 'brand' }
    case 'nerves':
      return { focus: [...LUMBAR, ...SACRAL], azimuth: 148, elevation: 4, fit: narrow ? 2.3 : 1.9, ...place(narrow), xray: true, bones: ['L4', 'L5'], nerves: ['L4', 'L5', 'S1', 'S2', 'sciatic'], tone: 'pain' }
    default:
      return chapterShot('hero', narrow)
  }
}

const AZIMUTH: Record<Region, number> = { cervical: 132, thoracic: 152, lumbar: 156, sacral: 168 }

/** Frame the symptom's levels with a vertebra of context either side. */
export function symptomShot(symptom: Symptom, narrow: boolean): Shot {
  const order = [...CERVICAL, ...THORACIC, ...LUMBAR, ...SACRAL]
  const indices = symptom.bones.map((b) => order.indexOf(b)).filter((i) => i >= 0)
  const lo = Math.max(0, Math.min(...indices) - 1)
  const hi = Math.min(order.length - 1, Math.max(...indices) + 1)
  const focus = order.slice(lo, hi + 1)
  const nerves = symptom.nerves ?? []
  const span = focus.length
  const fit = (span <= 5 ? 2.1 : span <= 8 ? 1.6 : 1.3) * (narrow ? 1.25 : 1)
  return {
    focus,
    azimuth: AZIMUTH[symptom.region],
    elevation: symptom.region === 'cervical' ? 12 : 8,
    fit,
    screenX: narrow ? 0 : 0.21,
    screenY: narrow ? -0.17 : 0,
    bones: symptom.bones,
    nerves,
    xray: nerves.length > 0,
    tone: 'pain',
  }
}

/** Which symptom a clicked vertebra opens. */
export function symptomForBone(name: string, list: Symptom[]): Symptom | undefined {
  const region: Region = CERVICAL.includes(name) ? 'cervical' : THORACIC.includes(name) ? 'thoracic' : LUMBAR.includes(name) ? 'lumbar' : 'sacral'
  return list.find((s) => s.region === region && s.bones.includes(name)) ?? list.find((s) => s.region === region)
}
