/** What the hero card hands to the full booking form. */
export interface Draft {
  services: string[]
  day: string
  window: string
}

export const emptyDraft: Draft = { services: [], day: '', window: '' }

export type Step = 1 | 2 | 3 | 4

/** Scrolls to the booking section once React has painted the new step. */
export function goToBooking() {
  window.requestAnimationFrame(() => {
    const target = document.getElementById('book')
    if (!target) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  })
}
