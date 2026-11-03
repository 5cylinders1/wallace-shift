type EnquirySurface = 'home_hero' | 'contact_form' | 'roofing_offer'

type SiteAnalyticsEvent =
  | { name: 'enquiry_submitted' | 'enquiry_failed'; value: EnquirySurface }
  | { name: 'demo_request_submitted' | 'demo_request_failed'; value?: string }
  | { name: 'quiz_started' | 'quiz_completed' }
  | { name: 'demo_preview_played'; value: string }
  | { name: 'offer_application_start' | 'offer_application_submit' }
  | { name: 'offer_application_step'; value: 'bottleneck' | 'authority' | 'business' | 'impact' | 'experience' | 'tools' | 'context' | 'readiness' | 'contact' }
  | { name: 'offer_recommendation_view'; value: 'package' | 'consultation' | 'resource' }

/** Only fixed event labels and catalog IDs belong here, never form values.
 * The shared public bootstrap applies its route and value allowlists before
 * sending anything. Missing or blocked analytics cannot interrupt the site. */
export function trackSiteEvent(event: SiteAnalyticsEvent): void {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent('ws:analytics', { detail: event }))
  } catch {
    // Analytics is best effort, including when a browser blocks the script.
  }
}
