import { packagePurchases, PACKAGE_TERMS_VERSION, type PurchasePackageId } from '../content/packagePurchase.js'
import { money, type Engagement } from './model.js'

const paymentMethods = (once: boolean) => `${once ? 'Client may pay by card through Stripe, or by cash, check, or Zelle without a payment surcharge, using the instructions in the portal. Payment is credited only after Provider confirms receipt and, for checks, cleared funds. Reporting a payment is not proof of receipt.' : 'Monthly payments are automatic card payments through Stripe.'}
Electronic payments are processed by Stripe. An eligible credit card may carry a separately disclosed surcharge of up to 3%, only where permitted and no greater than the applicable acceptance cost or legal/network limit. Debit and prepaid cards are not surcharged. The exact surcharge and total must be shown and affirmatively accepted before charging. Provider may waive the surcharge.`

const closing = `Each party will use the other party's nonpublic information only for this engagement and protect it with reasonable care. Client is responsible for rights to the content it supplies and for its business decisions.

Responsibility and disputes
Each party remains responsible for its own conduct. Neither party promises results outside its reasonable control, including search rankings, inquiry volume or revenue. The parties will first attempt in good faith to resolve a dispute in writing. Governing law: Kansas. This agreement is the entire agreement for this purchase. Amendments require both parties' written acceptance.

Electronic records and signature
Client may download or print this agreement and its signed receipt from the portal. Client may request a paper copy or a paper signing process by contacting Provider before signing. The signer represents that they are authorized to bind Client and intends the typed name to be their electronic signature.`

/** A self-service purchase gets fixed, versioned terms; owner-issued agreements keep the starter template. */
export function packageAgreement(e: Pick<Engagement, 'client' | 'email' | 'firstDue'>, id: PurchasePackageId): string {
  const item = packagePurchases[id]
  const head = `${id === 'website' ? 'BUSINESS WEBSITE AND CARE AGREEMENT' : 'LEAD PAGE AND AUTOMATIC FOLLOW UP AGREEMENT'}
Version ${PACKAGE_TERMS_VERSION}

Parties: Wallace Shift LLC (Provider) and ${e.client} (Client).
Client contact: ${e.email}

1. Included work
${item.scope}

Not included: ${item.exclusions}

Delivery: ${item.delivery}`

  if (id === 'website') return `${head}

2. Price and billing
${money(item.amount)} USD per month, month to month, with no minimum term. The first payment is due on ${e.firstDue}, the date this purchase was made, and is charged when Client signs and authorizes payment. Later payments fall on the same calendar day each month, or the last day of a shorter month. The website build is included in the monthly price.

3. Payment methods and authorization
${paymentMethods(false)}
Signing this agreement does not by itself authorize a charge. Client separately authorizes the monthly card payment in the portal, which shows the amount, any fee and the schedule.

4. 30 day satisfaction guarantee
If Client cancels within 30 days of the first payment, Provider refunds that first payment and no further payment is charged.

5. Cancellation after 30 days
Client may cancel at any time in the portal. Cancellation after the first 30 days takes effect at the end of the current monthly billing period. The website stays online until that period ends. When it ends, the website is taken offline unless service is reinstated and paid. Cancellation does not reverse a payment already made.

6. Ownership
Until Client has made 12 monthly payments, the website, including its design and code, is the property of Provider and is provided to Client as part of the service. After Client has made 12 monthly payments, ownership of the website transfers to Client. Client keeps its rights to the content it supplies, such as text, photos and logos, and to any domain name registered in Client's name. Third party materials keep their own licenses.

7. General
${closing}`

  return `${head}

2. Price and payments
${money(item.amount * 2)} USD in two payments. The first ${money(item.amount)} USD is due on ${e.firstDue}, the date this purchase was made. The second ${money(item.amount)} USD is invoiced when the page and workflow go live and is due when invoiced. Hosting, software subscriptions and email or SMS usage are not part of this price; they are confirmed with Client before work begins and are paid as agreed at that time.

3. Payment methods
${paymentMethods(true)}

4. Review and ownership
Client will review the delivered page and workflow and identify specific issues in writing within 10 business days. Provider will correct work that does not meet the included work above; additions require a change agreement. Once both payments are made, Client owns the delivered page and workflow configuration. Provider retains pre-existing tools, reusable components and general know-how, and grants Client a perpetual license to those components as used in the delivered work. Third party software stays with its providers under their own terms.

5. Cancellation
Either party may end this engagement by written notice. Provider will itemize completed work and approved, nonrecoverable costs and refund any amount paid beyond those items.

6. General
${closing}`
}
