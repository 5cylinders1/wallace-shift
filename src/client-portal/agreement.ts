import { cadenceLabel, money, type Engagement } from './model.js'

export const AGREEMENT_VERSION = '2026-10-30.2'
export function starterAgreement(e: Pick<Engagement, 'client' | 'email' | 'title' | 'scope' | 'exclusions' | 'delivery' | 'amount' | 'cadence' | 'firstDue' | 'endDate' | 'initialPayment'>, governingState: string): string {
  return `SERVICE AGREEMENT
Version ${AGREEMENT_VERSION}

Parties: Wallace Shift LLC (Provider) and ${e.client} (Client).
Client contact: ${e.email}
Project: ${e.title}

1. Scope and delivery
${e.scope}

Exclusions and third party costs: ${e.exclusions}
Delivery, milestones, and acceptance criteria: ${e.delivery}
Client will provide timely content, access, decisions, and feedback. Dates depend on these inputs. Changes to scope, price, or milestones require written agreement by both parties before additional work begins. No business outcome, search ranking, or uninterrupted third party service is guaranteed.

2. Fees and schedule
${e.initialPayment ? `Initial payment: ${money(e.initialPayment.amount)} USD due ${e.initialPayment.due}. This is a separate, one-time charge in addition to recurring service.\n` : ''}${e.cadence === 'once' ? `One-time payment: ${money(e.amount)} USD due ${e.firstDue}. This is a single payment, not a subscription.` : `Recurring service: ${money(e.amount)} USD, ${cadenceLabel[e.cadence].toLowerCase()}, beginning ${e.firstDue}. Subsequent invoices use the recurring start date's calendar day, or the last day of shorter months. ${e.endDate ? `Recurring billing ends ${e.endDate}, inclusive. No new recurring invoices or automatic recurring charge attempts occur after this date; previously incurred balances remain payable separately.` : 'Billing continues until canceled under section 6.'}${e.initialPayment ? ' If the initial payment date and recurring start date match, both amounts are due as separate invoices that day.' : ''}`}
The listed amount is the full service invoice amount, including any taxes expressly included in the scope. Provider must specify any tax treatment before issuing this agreement; additional charges require written agreement. No automatic late fee applies under this starter agreement.

3. Payment methods
For one-time engagements, Client may pay by cash, check, or Zelle without a payment surcharge, using the instructions in the portal. Payment is credited only after Provider confirms receipt and, for checks, cleared funds. Reporting a payment is not proof of receipt. Recurring plans, including any initial payment, require automatic Stripe payments.
Electronic payments are processed by Stripe. An eligible credit card may carry a separately disclosed surcharge of up to 3%, only where permitted and no greater than the applicable acceptance cost or legal/network limit. Debit and prepaid cards are not surcharged. The exact surcharge and total must be shown and affirmatively accepted before charging. Provider may waive the surcharge. For one-time engagements, Client may choose a no-surcharge offline method instead.

4. Automatic payments
Signing this agreement does not authorize automatic charges. Recurring service requires a separate automatic card payment authorization stating the amount, fee, and schedule. Client may cancel future recurring service in the portal before the next due date. Cancellation stops future automatic attempts and future billing periods, but does not reverse an in-flight payment or remove an existing balance. Any increase requires a new written agreement and payment authorization. Recurring service starts only after payment authorization is completed.

5. Review, ownership, and confidentiality
Client will review delivered work against the written acceptance criteria and identify specific issues in writing within 10 business days. Silence alone does not waive a material defect. Provider will correct work that does not meet the agreed scope; additions require a change agreement. Once all amounts for the delivered work are paid, Client owns the custom deliverables identified in the scope. Provider retains pre-existing tools, reusable components, and general know-how, and grants Client a perpetual license to those components as incorporated in the paid deliverables. Third party materials retain their own licenses. Each party will use the other party’s nonpublic information only for this engagement and protect it with reasonable care. Client is responsible for rights to supplied content and for its business decisions and use of the system.

6. Cancellation and suspension
Either party may cancel future recurring service by written notice through the portal before the next billing date. Cancellation prevents new billing periods; invoices already due remain payable for work delivered or committed costs approved by Client. For one-time work, either party may end the engagement by written notice. Provider will itemize completed work and approved, nonrecoverable costs and refund any prepaid amount exceeding those items. No blanket nonrefundable deposit is imposed by this agreement. Provider may suspend work after written notice of an overdue undisputed invoice and a 10-day opportunity to resolve it. The parties will coordinate delivery of paid work and return of Client materials.

7. Responsibility and disputes
Each party remains responsible for its own conduct. Neither party promises results outside its reasonable control. The parties will first attempt in good faith to resolve a dispute in writing. Governing law: ${governingState}. Any limitation of liability, special warranty, venue, or industry-specific terms must be separately reviewed and expressly added before signature. This agreement and its written scope are the entire agreement for this engagement. Amendments require both parties’ written acceptance.

8. Electronic records and signature
Client may download or print this agreement and its signed receipt from the portal. A current web browser and the ability to save or print text are required. Client may request a paper copy or a paper signing process by contacting Provider before signing. Withdrawing consent to future electronic records does not undo records already signed. The signer represents that they are authorized to bind Client and intends the typed name to be their electronic signature.`
}
