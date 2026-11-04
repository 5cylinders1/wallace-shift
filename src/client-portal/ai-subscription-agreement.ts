import { aiSubscriptionOffer, aiSubscriptionPlans } from '../content/aiSubscriptionOffer.js'
import { money, type Engagement } from './model.js'

/** A new offer gets its own immutable terms; issued project agreements stay unchanged. */
export function aiSubscriptionAgreement(e: Engagement): string {
  const plan = aiSubscriptionPlans[e.aiSubscription!.plan]
  return `AI CHATBOT AND PHONE AGENT SERVICE AGREEMENT
Version 2026-11-03.1

Parties: Wallace Shift LLC (Provider) and ${e.client} (Client).
Client contact: ${e.email}

1. Included service
One AI chatbot installed on Client's existing website and one AI inbound phone agent, operated through Reply365. Provider configures the services from Client's approved business information and instructions. A new website, outbound calling campaigns, custom CRM development, and additional businesses are not included. Client supplies site access, business information, phone routing instructions, and a human contact for handoff. Service is subject to third-party availability; it is not an emergency response service.

2. Setup and free month
Registration and card setup do not start the trial or charge the card. After both services are ready, Client reviews the exact trial end, first charge date and amount, and separately authorizes automatic payment in the portal. The trial starts on that confirmation and lasts at least one full calendar month, not a fixed 30 days. Any time between that anniversary and the next daily 14:00 UTC billing run is also free. All service and billing dates use UTC. A date absent from a shorter month becomes that month's last day.
The trial includes ${aiSubscriptionOffer.trialPhoneMinutes} AI phone minutes and ${aiSubscriptionOffer.trialChatReplies} chatbot AI replies. Trial usage is capped without payable overages. Cancel in the portal before the displayed trial end to avoid all charges. A canceled trial can continue within its limits until the displayed trial end, then stops.

3. Prices and renewal
Selected interval: ${plan.label}. The amount charged for each prepaid service period is ${money(plan.amount)} USD (${money(plan.monthlyEquivalent)} per month equivalent). This amount includes applicable service taxes; no card surcharge or setup fee applies to this offer.
Available intervals: $750 every calendar month; $4,050 every six calendar months ($675 per month equivalent); or $7,200 every twelve calendar months ($600 per month equivalent). The first charge is due when the trial ends. Renewals use that first paid period's calendar anchor at 14:00 UTC, preserving the original day where it exists and using the last day in shorter months. Bank processing or a delayed payment does not change the agreed dates. An authorized renewal may receive up to one hour of free continuity while processing; a known payment failure ends that grace immediately. Paying late restores only the remaining time in the original period. An entirely elapsed unpaid period is not automatically collected. A payment already submitted may still complete and must be reconciled before another attempt.
Signing this agreement and saving a card do not authorize charges. Client separately accepts the exact schedule in the portal. Stripe processes payments; Wallace Shift does not receive full card details.

4. Included usage and additional minutes
Each paid service month includes ${aiSubscriptionOffer.monthlyPhoneMinutes} AI phone minutes and ${aiSubscriptionOffer.monthlyChatReplies} chatbot AI replies, including on six- and twelve-month payment intervals. Allowances reset on service-month anniversaries at 14:00 UTC and do not roll over. Phone usage means connected AI time, rounded up to the next second per call and aggregated in seconds; unconnected attempts and human conversation after transfer are not AI minutes. An AI call session lasts at most 15 minutes. One generated chatbot response is one AI reply. Usage and remaining allowance are shown in the portal, including notices at 80% and 100%.
There are no automatic top-ups or usage debts. Additional phone minutes require a separate, explicit prepaid purchase: 100 minutes for $40 ($0.40 per minute), including applicable taxes and without a surcharge. Extra minutes do not change the base renewal date and carry across monthly allowance resets. They are unavailable during the free trial. When service ends, unused purchased credit is refunded to the original payment method, with the refund rounded to the nearest cent. Calls still being finalized may produce a later remainder refund. Provider initiates refunds after service expiration and final usage reconciliation; bank posting times vary. At a limit, the affected AI channel pauses; ordinary business contact and human handoff remain the fallback. Additional chatbot usage is not automatically charged.

5. Cancellation and interval changes
Client may cancel renewal in the portal at any time. Paid service continues to the displayed paid-through boundary and then stops, with no new base renewal or automatic usage bill. For example, cancellation six months into a prepaid annual period leaves six months of service. Cancellation does not itself produce a prorated refund of the used or remaining base period. Provider remains responsible for service not delivered as agreed and any applicable refund rights.
Client may request another listed interval at any time; it takes effect only at the next renewal, without an immediate base charge or proration. The portal shows the new amount and effective date and records Client's explicit consent. Client can revise or withdraw a pending change before it takes effect. Cancellation clears pending interval changes and does not restart service or billing. Changes are appended to the authorization record; this signed agreement is not overwritten.

6. Results and measurement
The services are designed to help website visitors and callers get answers and take the next step toward becoming paying customers. An increase in conversion, sales, or revenue is not guaranteed. Results depend on traffic quantity and quality, visitor purchase intent and urgency, the business's offer, and human follow-through. A chat, lead, or booking is not evidence of a paying customer. Any future performance guarantee requires a separately accepted measurement method, eligibility criteria, evaluation period, and remedy before it applies.

7. Client information, access and responsibility
Client approves the business information and instructions used by the agents and remains responsible for its business decisions and customer commitments. Each party protects the other's nonpublic information and limits access to service delivery. Client retains its supplied content; Reply365 and other provider software remain their owners' property. Client can save or print this agreement, payment authorizations and receipts. Provider will coordinate return of Client materials when service ends.

8. Electronic acceptance and disputes
The signer represents authority to bind Client and intends the typed name and signature action to sign electronically. The portal retains the exact signed text and its fingerprint. Client may request paper records before signing. The parties will first try to resolve disputes in writing. Governing law: Kansas. No limitation or exclusion overrides rights that cannot lawfully be waived. Material changes outside the listed interval options require a new agreement and payment authorization.`
}
