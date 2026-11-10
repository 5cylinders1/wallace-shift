import { aiConsultation } from '../content/aiConsultation'

function readEventUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value.trim())
    if (url.origin !== 'https://calendly.com' || url.username || url.password ||
      !/^\/[a-z0-9_-]+\/[a-z0-9_-]+\/?$/i.test(url.pathname)) return null
    // Use the public event link without any prefilled visitor details or tracking parameters.
    return url.origin + url.pathname.replace(/\/$/, '')
  } catch {
    return null
  }
}

export const calendlyEventUrl = readEventUrl(import.meta.env.VITE_CALENDLY_EVENT_URL ?? aiConsultation.fallbackBookingUrl)
