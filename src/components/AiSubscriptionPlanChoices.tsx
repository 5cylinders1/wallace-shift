import { aiSubscriptionMoney, aiSubscriptionPlans, type AiSubscriptionInterval } from '../content/aiSubscriptionOffer'

export function AiSubscriptionPlanChoices({ value, onChange, name, disabled = false }: {
  value: AiSubscriptionInterval
  onChange: (value: AiSubscriptionInterval) => void
  name: string
  disabled?: boolean
}) {
  return <fieldset className="qf-subscription-plans" disabled={disabled}>
    <legend>Choose your payment interval after the free month</legend>
    {Object.values(aiSubscriptionPlans).map(plan => <label className={`qf-subscription-plan${value === plan.id ? ' is-selected' : ''}`} key={plan.id}>
      <input type="radio" name={name} value={plan.id} checked={value === plan.id} onChange={() => onChange(plan.id)} />
      <span><strong>{aiSubscriptionMoney(plan.amount)} {plan.label.toLowerCase()}</strong><span>{plan.months === 1 ? 'Billed monthly' : `${aiSubscriptionMoney(plan.monthlyEquivalent)} per month equivalent, prepaid`}</span></span>
    </label>)}
  </fieldset>
}
