import { useEffect, useState } from 'react'

/**
 * What the visitor has chosen so far: samples from the material library and
 * a planning range. Kept in sessionStorage so it survives moving between
 * Tambour's pages, and carried into the consultation request. Never sent
 * anywhere.
 */
export interface Plan { label: string; low: number; high: number }
export interface Brief { samples: string[]; plan?: Plan }

const KEY = 'tambour-brief'
const EVENT = 'tambour-brief'

export function readBrief(): Brief {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Brief | null
    if (value && Array.isArray(value.samples)) return value
  } catch { /* storage unavailable */ }
  return { samples: [] }
}

function write(brief: Brief) {
  try { sessionStorage.setItem(KEY, JSON.stringify(brief)) } catch { /* storage unavailable */ }
  window.dispatchEvent(new CustomEvent(EVENT))
}

export const updateBrief = (change: (brief: Brief) => Brief) => write(change(readBrief()))
export const savePlan = (plan: Plan) => updateBrief(brief => ({ ...brief, plan }))
export const clearBrief = () => write({ samples: [] })

export function toggleSample(id: string, max: number): boolean {
  const brief = readBrief()
  const has = brief.samples.includes(id)
  if (!has && brief.samples.length >= max) return false
  write({ ...brief, samples: has ? brief.samples.filter(sample => sample !== id) : [...brief.samples, id] })
  return true
}

export function useBrief(): Brief {
  const [brief, setBrief] = useState<Brief>(readBrief)
  useEffect(() => {
    const update = () => setBrief(readBrief())
    window.addEventListener(EVENT, update)
    window.addEventListener('storage', update)
    return () => { window.removeEventListener(EVENT, update); window.removeEventListener('storage', update) }
  }, [])
  return brief
}
