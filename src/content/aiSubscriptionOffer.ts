/** Public commercial terms. Amounts are cents, including applicable service taxes. */
export const aiSubscriptionPlans = {
  monthly: { id: 'monthly', label: 'Monthly', amount: 75000, months: 1, monthlyEquivalent: 75000 },
  six_months: { id: 'six_months', label: 'Every six months', amount: 405000, months: 6, monthlyEquivalent: 67500 },
  yearly: { id: 'yearly', label: 'Every twelve months', amount: 720000, months: 12, monthlyEquivalent: 60000 },
} as const

export type AiSubscriptionInterval = keyof typeof aiSubscriptionPlans

export const aiSubscriptionOffer = {
  id: 'assistant',
  name: 'AI Chatbot + AI Phone Agent',
  trialMonths: 1,
  trialPhoneMinutes: 100,
  trialChatReplies: 500,
  monthlyPhoneMinutes: 500,
  monthlyChatReplies: 2000,
  maxPhoneCallMinutes: 15,
  extraPhoneMinuteCents: 40,
  extraPhonePackMinutes: 100,
  extraPhoneNotice: 'Extra phone minutes are purchased separately during paid service at $0.40 per minute, in 100 minute packs for $40. There are no automatic topups or usage bills after service ends. Purchased minutes carry forward while service is active. Any unused purchased minutes are refunded when service ends.',
  phoneUsageNotice: 'Only connected AI time counts, rounded up to the next second per call. Unanswered calls and conversation with a person after a transfer do not use AI minutes.',
  description: 'Help website visitors get answers and help callers reach the next step with your business.',
  resultsNotice: 'Designed to help turn website visits into paying customers. Results vary with traffic, visitor intent, your offer, and your team’s follow through. An increase in conversion is not guaranteed.',
  trialNotice: 'Your free month starts only after both services are ready and you confirm activation. It lasts at least one calendar month, with any time until the next 14:00 UTC billing run also free. Review your exact trial end and first charge time in UTC before you start. Cancel during the trial to avoid all charges.',
  renewalNotice: 'The selected amount is charged after your trial and at each renewal. Cancel renewal at any time and keep service through the end of the period you have paid for.',
  intervalChangeNotice: 'Change your payment interval at any time. Changes start at your next renewal, with no immediate charge or proration.',
} as const

export function aiSubscriptionMoney(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)
}
