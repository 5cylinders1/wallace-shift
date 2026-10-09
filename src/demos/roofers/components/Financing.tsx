import { useEffect, useId, useState, type CSSProperties } from 'react'
import { financing } from '../content'
import type { LeadContext } from '../lead'
import { money, monthlyPayment, totalCost } from '../pricing'
import './Financing.css'

interface FinancingProps {
  ballpark: LeadContext['ballpark']
  onPayment: (payment: LeadContext['payment']) => void
}

const MIN = 3000
const MAX = 40000
const STEP = 250

const clampAmount = (value: number) => Math.min(MAX, Math.max(MIN, Math.round(value / STEP) * STEP))

export function Financing({ ballpark, onPayment }: FinancingProps) {
  const [amount, setAmount] = useState(14000)
  const [planId, setPlanId] = useState(financing.plans[2].id)
  const [touched, setTouched] = useState(false)
  // Follow the ballpark until the visitor sets an amount of their own.
  const [followed, setFollowed] = useState<LeadContext['ballpark']>(null)
  const amountId = useId()

  if (ballpark && !touched && ballpark !== followed) {
    setFollowed(ballpark)
    setAmount(clampAmount((ballpark.low + ballpark.high) / 2))
  }

  const plan = financing.plans.find((item) => item.id === planId) ?? financing.plans[2]
  const monthly = monthlyPayment(amount, plan)

  useEffect(() => {
    if (touched) onPayment({ monthly, plan: plan.name, amount })
  }, [touched, monthly, plan, amount, onPayment])

  return (
    <section id="financing" className="rf-section rf-financing" aria-labelledby="rf-financing-title">
      <div className="rf-container">
        <div className="rf-section__head rf-section__head--split" data-reveal>
          <div>
            <p className="rf-eyebrow">{financing.eyebrow}</p>
            <h2 id="rf-financing-title" className="rf-display">
              {financing.title}
            </h2>
          </div>
          <p className="rf-lede">{financing.lede}</p>
        </div>

        <ol className="rf-ways" data-reveal>
          {financing.ways.map((way, index) => (
            <li key={way.name}>
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <h3>{way.name}</h3>
              <p>{way.body}</p>
            </li>
          ))}
        </ol>

        <form className="rf-calc" aria-labelledby="rf-calc-title" onSubmit={(event) => event.preventDefault()} data-reveal>
          <div className="rf-calc__inputs">
            <h3 id="rf-calc-title" className="rf-subhead">
              {financing.calculatorTitle}
            </h3>
            <div className="rf-calc__amount">
              <label htmlFor={amountId}>{financing.amountLabel}</label>
              <output htmlFor={amountId}>{money(amount)}</output>
            </div>
            <input
              id={amountId}
              type="range"
              min={MIN}
              max={MAX}
              step={STEP}
              value={amount}
              aria-valuetext={money(amount)}
              onChange={(event) => {
                setTouched(true)
                setAmount(Number(event.target.value))
              }}
              style={{ '--rf-fill': `${((amount - MIN) / (MAX - MIN)) * 100}%` } as CSSProperties}
            />
            {ballpark && !touched && <p className="rf-calc__hint">Set from your roof estimate above.</p>}

            <fieldset className="rf-plans">
              <legend className="rf-visually-hidden">Plan</legend>
              {financing.plans.map((item) => {
                const payment = monthlyPayment(amount, item)
                return (
                  <label key={item.id} className={`rf-plan${item.id === planId ? ' is-checked' : ''}`}>
                    <input
                      type="radio"
                      name="finance-plan"
                      value={item.id}
                      checked={item.id === planId}
                      onChange={() => {
                        setTouched(true)
                        setPlanId(item.id)
                      }}
                    />
                    <span className="rf-plan__name">{item.name}</span>
                    <span className="rf-plan__apr">{item.promo ? '0% if paid in 12 months' : `${item.apr}% APR`}</span>
                    <span className="rf-plan__pay">
                      {money(payment)}
                      <small>/mo</small>
                    </span>
                  </label>
                )
              })}
            </fieldset>
          </div>

          {/* Silent while it follows the roof estimate, so a pitch change isn't announced twice. */}
          <div className="rf-calc__result" aria-live={touched ? 'polite' : 'off'}>
            <p className="rf-calc__label">Estimated payment</p>
            <p className="rf-calc__monthly">
              {money(monthly)}
              <small>/mo</small>
            </p>
            <dl className="rf-calc__terms">
              <div>
                <dt>Plan</dt>
                <dd>{plan.name}</dd>
              </div>
              <div>
                <dt>Example APR</dt>
                <dd>{plan.promo ? '0% promotional' : `${plan.apr}%`}</dd>
              </div>
              <div>
                <dt>Payments</dt>
                <dd>{plan.months}</dd>
              </div>
              <div>
                <dt>Total of payments</dt>
                <dd>{money(totalCost(amount, plan))}</dd>
              </div>
            </dl>
            {plan.promo && <p className="rf-calc__promo">{financing.promoNote}</p>}
            <a className="rf-button rf-button--primary rf-button--block" href="#estimate">
              Ask about financing
            </a>
          </div>
        </form>

        <div className="rf-financing__fine" data-reveal>
          <p>{financing.disclosure}</p>
          <p className="rf-demo-note">{financing.demoNote}</p>
        </div>
      </div>
    </section>
  )
}
