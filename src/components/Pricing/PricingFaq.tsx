import { pricingFaq } from '../../content/pricing'
import { Reveal } from '../Reveal/Reveal'
import './PricingFaq.css'

export function PricingFaq() {
  return (
    <section id="how-pricing-works" className="pricing-faq">
      <div className="container pricing-faq__grid">
        <div className="pricing-faq__intro">
          <Reveal>
            <p className="eyebrow pricing-faq__eyebrow">{pricingFaq.eyebrow}</p>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="pricing-faq__heading">{pricingFaq.heading}</h2>
          </Reveal>
        </div>

        {/* Answers stay open rather than sitting behind disclosure toggles:
            they are short, and every one of them is a reason to trust the
            numbers above. */}
        <div className="pricing-faq__list">
          {pricingFaq.items.map((item, index) => (
            <Reveal
              key={item.question}
              delay={index * 0.05}
              className="pricing-faq__item"
            >
              <h3 className="pricing-faq__question">{item.question}</h3>
              <p className="pricing-faq__answer">{item.answer}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
