import { hero } from '../../content/siteConfig'
import { HeroContactCard } from './HeroContactCard'

export function HeroContent() {
  return (
    <div className="hero__content">
      {/* Split into lead/tail so mobile can seat the tail at the foot of
          the frame — the eyebrow and headline stay above the WS, the
          supporting line and actions sit below it, and the mark keeps the
          middle of the viewport to itself. Desktop closes the gap and the
          two groups read as one continuous column again. */}
      <div className="hero__copy">
        <div className="hero__copy-lead">
          <p className="eyebrow hero__eyebrow">{hero.eyebrow}</p>
          <h1 className="hero__headline">
            {hero.headlineLines.slice(0, -1).map((line) => (
              <span className="hero__line" key={line}>
                <span className="hero__line-inner">{line}</span>
              </span>
            ))}
            <span className="hero__line">
              <span className="hero__line-inner">
                {hero.headlineLines[hero.headlineLines.length - 1]}{' '}
                <span className="accent-serif hero__accent">
                  {hero.headlineAccent}
                </span>
              </span>
            </span>
          </h1>
        </div>

        <div className="hero__copy-tail">
          <p className="hero__supporting">{hero.supporting}</p>
          <div className="hero__actions">
            <a
              className="hero__cta-primary"
              href={hero.primaryCta.href}
              data-magnetic
            >
              <span>{hero.primaryCta.label}</span>
            </a>
            <a
              className="hero__cta-secondary"
              href={hero.secondaryCta.href}
              data-magnetic
            >
              {hero.secondaryCta.label}
            </a>
          </div>
        </div>
      </div>

      <HeroContactCard />
    </div>
  )
}
