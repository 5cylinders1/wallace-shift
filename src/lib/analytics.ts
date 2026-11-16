import type { DemoHandoffId } from '../content/demoHandoff'

type EnquirySurface = 'home_hero' | 'contact_form' | 'roofing_offer'

/** Demos whose "Discuss my website" link carries context to /contact. */
type DemoContext = DemoHandoffId
type ContractorOffer = 'website' | 'lead-follow-up'

type SiteAnalyticsEvent =
  | { name: 'enquiry_submitted' | 'enquiry_failed'; value: EnquirySurface; demo?: DemoContext }
  | { name: 'demo_handoff_viewed'; value: DemoContext }
  | { name: 'demo_request_submitted' | 'demo_request_failed'; value?: string }
  | { name: 'quiz_started' | 'quiz_completed' }
  | { name: 'demo_preview_played'; value: string }
  | { name: 'offer_application_start' | 'offer_application_submit' }
  | { name: 'offer_application_step'; value: 'bottleneck' | 'authority' | 'business' | 'impact' | 'experience' | 'tools' | 'context' | 'readiness' | 'contact' }
  | { name: 'offer_recommendation_view'; value: 'package' | 'consultation' | 'resource' }
  | { name: 'contractor_offer_demo' | 'contractor_offer_form_started' | 'contractor_offer_failed'; value: ContractorOffer }
  | { name: 'contractor_offer_submitted'; value: ContractorOffer; readiness?: 'ready' | 'questions' | 'planning' }

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
