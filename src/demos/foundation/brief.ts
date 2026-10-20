/**
 * What the visitor has told us so far, carried into the inspection request
 * from the decoder, the crack log or the report. Kept in sessionStorage so
 * it survives moving between Datum's pages, never sent anywhere.
 */
export interface Brief {
  symptoms: string[]
  source?: string
  note?: string
}

const KEY = 'datum-brief'
export const BRIEF_EVENT = 'datum-brief'

export function readBrief(): Brief {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Brief | null
    if (value && Array.isArray(value.symptoms)) return value
  } catch { /* storage unavailable */ }
  return { symptoms: [] }
}

export function addToBrief(next: Brief) {
  const current = readBrief()
  const merged: Brief = {
    symptoms: [...new Set([...current.symptoms, ...next.symptoms])],
    source: next.source ?? current.source,
    note: next.note ?? current.note,
  }
  try { sessionStorage.setItem(KEY, JSON.stringify(merged)) } catch { /* storage unavailable */ }
  window.dispatchEvent(new CustomEvent(BRIEF_EVENT))
}

export function clearBrief() {
  try { sessionStorage.removeItem(KEY) } catch { /* storage unavailable */ }
  window.dispatchEvent(new CustomEvent(BRIEF_EVENT))
}
